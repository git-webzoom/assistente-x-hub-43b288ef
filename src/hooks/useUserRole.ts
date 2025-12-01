import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type AppRole = 'superadmin' | 'admin' | 'supervisor' | 'user';

export function useUserRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return 'user' as AppRole;
      }

      if (!data) {
        console.warn('No role found for user, defaulting to user');
        return 'user' as AppRole;
      }

      return data.role as AppRole;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos - roles mudam raramente
    gcTime: 15 * 60 * 1000, // 15 minutos
  });

  return { 
    role, 
    loading: isLoading, 
    isSuperAdmin: role === 'superadmin',
    isAdmin: role === 'admin' || role === 'superadmin',
    isSupervisor: role === 'supervisor' || role === 'admin' || role === 'superadmin'
  };
}
