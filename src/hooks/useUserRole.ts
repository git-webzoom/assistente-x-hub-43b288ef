import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type AppRole = 'superadmin' | 'admin' | 'user';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else {
          setRole(data?.role as AppRole);
        }
      } catch (err) {
        console.error('Error in useUserRole:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, [user]);

  return { role, loading, isSuperAdmin: role === 'superadmin' };
}
