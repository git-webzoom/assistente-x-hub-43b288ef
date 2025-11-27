import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from './use-toast';

export interface Tenant {
  id: string;
  name: string;
  is_active: boolean;
  menu_settings: any;
  custom_config: any;
  created_at: string;
  updated_at: string;
}

export function useTenants() {
  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Tenant[];
    },
  });

  const updateTenant = useMutation({
    mutationFn: async (tenant: Partial<Tenant> & { id: string }) => {
      const { data, error } = await supabase
        .from('tenants')
        .update({
          ...tenant,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenant.id)
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await supabase.rpc('log_audit', {
        p_action: 'UPDATE',
        p_table_name: 'tenants',
        p_record_id: tenant.id,
        p_tenant_id: tenant.id,
        p_changes: tenant,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'Tenant atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar tenant',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    tenants: tenants || [],
    isLoading,
    updateTenant: updateTenant.mutate,
  };
}
