import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';

export interface User {
  id: string;
  email: string;
  name: string | null;
  tenant_id: string;
}

export const useUsers = (searchQuery?: string) => {
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', currentUser?.tenant_id, searchQuery],
    queryFn: async () => {
      if (!currentUser?.tenant_id) throw new Error('Tenant not found');

      let query = supabase
        .from('users')
        .select('id, email, name, tenant_id')
        .eq('tenant_id', currentUser.tenant_id)
        .order('name', { ascending: true, nullsFirst: false });

      // Apply search filter if provided
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as User[];
    },
    enabled: !!currentUser?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    users: users || [],
    isLoading,
  };
};
