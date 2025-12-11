import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { toast } from '@/hooks/use-toast';
import { dispatchWebhookFromClient } from '@/lib/webhookClient';
import { TOAST_MESSAGES } from '@/lib/constants';

interface CrudConfig {
  tableName: string;
  queryKey: string;
  entityName: string;
  entityLabel: string;
  selectQuery?: string;
  orderBy?: { column: string; ascending: boolean };
  searchFields?: string[];
  additionalInvalidateKeys?: string[];
  enableWebhooks?: boolean;
}

interface CrudHookReturn<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  create: UseMutationResult<T, Error, Partial<T>>;
  update: UseMutationResult<T, Error, { id: string; updates: Partial<T> }>;
  remove: UseMutationResult<void, Error, string>;
}

export function createCrudHook<T extends { id: string; tenant_id?: string }>(config: CrudConfig) {
  const {
    tableName,
    queryKey,
    entityName,
    entityLabel,
    selectQuery = '*',
    orderBy = { column: 'created_at', ascending: false },
    searchFields = [],
    additionalInvalidateKeys = [],
    enableWebhooks = true,
  } = config;

  return function useCrud(searchQuery?: string): CrudHookReturn<T> {
    const { user } = useAuth();
    const { currentUser } = useCurrentUser();
    const queryClient = useQueryClient();

    // Query
    const { data, isLoading, error } = useQuery({
      queryKey: [queryKey, currentUser?.tenant_id, searchQuery],
      queryFn: async () => {
        if (!currentUser?.tenant_id) throw new Error('Tenant not found');

        let query = supabase
          .from(tableName)
          .select(selectQuery)
          .eq('tenant_id', currentUser.tenant_id)
          .order(orderBy.column, { ascending: orderBy.ascending });

        // Apply search filter if provided
        if (searchQuery?.trim() && searchFields.length > 0) {
          const searchConditions = searchFields
            .map(field => `${field}.ilike.%${searchQuery}%`)
            .join(',');
          query = query.or(searchConditions);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as unknown as T[];
      },
      enabled: !!currentUser?.tenant_id,
      staleTime: 3 * 60 * 1000,
    });

    // Invalidate helper
    const invalidateQueries = () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      additionalInvalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    };

    // Create mutation
    const create = useMutation({
      mutationFn: async (newItem: Partial<T>) => {
        if (!user?.id || !currentUser?.tenant_id) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from(tableName)
          .insert([{ ...newItem, tenant_id: currentUser.tenant_id }])
          .select()
          .single();

        if (error) throw error;

        if (enableWebhooks) {
          await dispatchWebhookFromClient({
            event: `${entityName}.created`,
            entity: entityName,
            data,
            tenant_id: currentUser.tenant_id,
            user_id: user.id,
          });
        }

        return data as T;
      },
      onSuccess: () => {
        invalidateQueries();
        toast(TOAST_MESSAGES.create.success(entityLabel));
      },
      onError: (error: Error) => {
        toast({ ...TOAST_MESSAGES.create.error(entityLabel), description: error.message });
      },
    });

    // Update mutation
    const update = useMutation({
      mutationFn: async ({ id, updates }: { id: string; updates: Partial<T> }) => {
        if (!user?.id) throw new Error('User not authenticated');

        // Fetch before update for webhook
        const { data: before, error: fetchError } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError || !before) throw fetchError || new Error(`${entityLabel} not found`);

        const { data: after, error } = await supabase
          .from(tableName)
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        if (enableWebhooks) {
          const hasChange = Object.keys(updates).some(
            key => updates[key as keyof typeof updates] !== before[key]
          );

          if (hasChange) {
            await dispatchWebhookFromClient({
              event: `${entityName}.updated`,
              entity: entityName,
              data: { before, after },
              tenant_id: before.tenant_id,
              user_id: user.id,
            });
          }
        }

        return after as T;
      },
      onSuccess: () => {
        invalidateQueries();
        toast(TOAST_MESSAGES.update.success(entityLabel));
      },
      onError: (error: Error) => {
        toast({ ...TOAST_MESSAGES.update.error(entityLabel), description: error.message });
      },
    });

    // Delete mutation
    const remove = useMutation({
      mutationFn: async (id: string) => {
        if (!user?.id) throw new Error('User not authenticated');

        // Fetch before delete for webhook
        const { data: item, error: fetchError } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError || !item) throw fetchError || new Error(`${entityLabel} not found`);

        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;

        if (enableWebhooks) {
          await dispatchWebhookFromClient({
            event: `${entityName}.deleted`,
            entity: entityName,
            data: item,
            tenant_id: item.tenant_id,
            user_id: user.id,
          });
        }
      },
      onSuccess: () => {
        invalidateQueries();
        toast(TOAST_MESSAGES.delete.success(entityLabel));
      },
      onError: (error: Error) => {
        toast({ ...TOAST_MESSAGES.delete.error(entityLabel), description: error.message });
      },
    });

    return {
      data: data || [],
      isLoading,
      error: error as Error | null,
      create,
      update,
      remove,
    };
  };
}
