import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export interface UserWithPermissions {
  id: string;
  email: string;
  name: string | null;
  tenant_id: string;
  role: string;
  is_banned: boolean;
  permissions: {
    entity_key: string;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }[];
}

const ENTITIES = ['contacts', 'products', 'pipelines', 'tasks', 'calendar', 'settings'];

export const useManageUserPermissions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: usersWithPermissions, isLoading } = useQuery({
    queryKey: ['users-with-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get user's tenant_id
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error('Tenant not found');

      // Get all users in tenant
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          id, 
          email, 
          name, 
          tenant_id,
          user_roles!inner(role)
        `)
        .eq('tenant_id', userData.tenant_id)
        .order('name', { ascending: true, nullsFirst: false });

      if (usersError) throw usersError;

      // Get all permissions
      const { data: permissions, error: permError } = await supabase
        .from('user_entity_permissions')
        .select('user_id, entity_key, can_view, can_create, can_edit, can_delete')
        .in('user_id', users?.map(u => u.id) || []);

      if (permError) throw permError;

      // Combine data
      const usersWithPerms: UserWithPermissions[] = users?.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        tenant_id: u.tenant_id,
        role: u.user_roles?.[0]?.role || 'user',
        is_banned: false, // TODO: Add banned_until column check after migration
        permissions: permissions?.filter(p => p.user_id === u.id).map(p => ({
          entity_key: p.entity_key,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        })) || [],
      })) || [];

      return usersWithPerms;
    },
    enabled: !!user?.id,
  });

  const updatePermission = useMutation({
    mutationFn: async ({
      userId,
      entityKey,
      permissions,
    }: {
      userId: string;
      entityKey: string;
      permissions: {
        can_view: boolean;
        can_create: boolean;
        can_edit: boolean;
        can_delete: boolean;
      };
    }) => {
      const { data, error } = await supabase
        .from('user_entity_permissions')
        .upsert({
          user_id: userId,
          entity_key: entityKey,
          ...permissions,
        }, {
          onConflict: 'user_id,entity_key',
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-permissions'] });
      toast({
        title: 'Sucesso',
        description: 'Permissões atualizadas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar permissões.',
        variant: 'destructive',
      });
    },
  });

  const resetPermissions = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_entity_permissions')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-permissions'] });
      toast({
        title: 'Sucesso',
        description: 'Permissões resetadas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao resetar permissões.',
        variant: 'destructive',
      });
    },
  });

  return {
    usersWithPermissions: usersWithPermissions || [],
    isLoading,
    updatePermission,
    resetPermissions,
    availableEntities: ENTITIES,
  };
};
