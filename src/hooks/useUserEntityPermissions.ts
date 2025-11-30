import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface EntityPermission {
  entity_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const useUserEntityPermissions = () => {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-entity-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_entity_permissions')
        .select('entity_key, can_view, can_create, can_edit, can_delete')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as EntityPermission[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const hasPermission = (entityKey: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    const permission = permissions?.find(p => p.entity_key === entityKey);
    
    // Se não houver permissão específica, assume acesso total (compatibilidade)
    if (!permission) return true;
    
    switch (action) {
      case 'view':
        return permission.can_view;
      case 'create':
        return permission.can_create;
      case 'edit':
        return permission.can_edit;
      case 'delete':
        return permission.can_delete;
      default:
        return false;
    }
  };

  return {
    permissions: permissions || [],
    isLoading,
    hasPermission,
  };
};
