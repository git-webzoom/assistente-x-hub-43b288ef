import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export type CustomFieldEntity = 'contact' | 'product' | 'card' | 'appointment' | 'task';
export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select';

export interface CustomField {
  id: string;
  tenant_id: string;
  entity_type: CustomFieldEntity;
  field_name: string;
  field_label: string;
  field_type: CustomFieldType;
  options: string[];
  is_required: boolean;
  display_order: number;
  created_at: string;
  scope: 'entity' | 'product';
  scope_target_id: string | null;
}

export const useCustomFields = (entityType?: CustomFieldEntity, productId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customFields, isLoading } = useQuery({
    queryKey: ['custom-fields', entityType, productId],
    queryFn: async () => {
      let query = supabase
        .from('custom_fields')
        .select('*')
        .order('display_order', { ascending: true });

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      // Se for produto e tiver productId, filtrar por scope
      if (entityType === 'product' && productId) {
        query = query.or(`scope.eq.entity,and(scope.eq.product,scope_target_id.eq.${productId})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CustomField[];
    },
  });

  const createCustomField = useMutation({
    mutationFn: async (field: Omit<CustomField, 'id' | 'tenant_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('custom_fields')
        .insert([field])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      toast({
        title: 'Campo personalizado criado',
        description: 'O campo foi criado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar campo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateCustomField = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CustomField> }) => {
      const { data, error } = await supabase
        .from('custom_fields')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      toast({
        title: 'Campo atualizado',
        description: 'O campo foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar campo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCustomField = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      toast({
        title: 'Campo excluído',
        description: 'O campo foi excluído com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir campo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    customFields,
    isLoading,
    createCustomField: createCustomField.mutate,
    updateCustomField: updateCustomField.mutate,
    deleteCustomField: deleteCustomField.mutate,
  };
};
