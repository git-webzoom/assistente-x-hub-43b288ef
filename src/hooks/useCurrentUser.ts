import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  tenant_id: string;
}

export const useCurrentUser = () => {
  const { user } = useAuth();
  
  const { data: currentUser, isLoading, error } = useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, tenant_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (!data?.tenant_id) throw new Error('Tenant not found');

      return data as CurrentUser;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos - dados do usuário mudam raramente
    gcTime: 30 * 60 * 1000, // 30 minutos em cache
  });

  return {
    currentUser,
    isLoading,
    error,
  };
};
