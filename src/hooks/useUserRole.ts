import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type AppRole = 'superadmin' | 'admin' | 'supervisor' | 'user';

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
        // Usar service role key para evitar problemas de RLS
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle(); // Use maybeSingle instead of single to handle no rows gracefully

        if (error) {
          console.error('Error fetching user role:', error);
          // Default to 'user' role if there's an error
          setRole('user');
        } else if (data) {
          setRole(data.role as AppRole);
        } else {
          // No role found, default to 'user'
          console.warn('No role found for user, defaulting to user');
          setRole('user');
        }
      } catch (err) {
        console.error('Error in useUserRole:', err);
        // Default to 'user' role on any error
        setRole('user');
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, [user]);

  return { 
    role, 
    loading, 
    isSuperAdmin: role === 'superadmin',
    isAdmin: role === 'admin' || role === 'superadmin',
    isSupervisor: role === 'supervisor' || role === 'admin' || role === 'superadmin'
  };
}
