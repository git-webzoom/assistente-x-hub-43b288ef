import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface User {
  id: string;
  email: string;
  name: string | null;
  tenant_id: string;
}

export const useUsers = (searchQuery?: string) => {
  const { user } = useAuth();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', user?.id, searchQuery],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get user's tenant_id
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error('Tenant not found');

      let query = supabase
        .from('users')
        .select('id, email, name, tenant_id')
        .eq('tenant_id', userData.tenant_id)
        .order('name', { ascending: true, nullsFirst: false });

      // Apply search filter if provided
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as User[];
    },
    enabled: !!user?.id,
  });

  return {
    users: users || [],
    isLoading,
  };
};
