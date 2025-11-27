import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  tenant_id: string | null;
  user_id: string | null;
  changes: any;
  created_at: string;
}

export function useAuditLog(tenantId?: string) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-log', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLog[];
    },
  });

  return {
    logs: logs || [],
    isLoading,
  };
}
