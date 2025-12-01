import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from './use-toast';

interface CreateTenantParams {
  tenantName: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  const createTenant = useMutation({
    mutationFn: async (params: CreateTenantParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('create-tenant-with-admin', {
        body: params,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'Tenant criado com sucesso',
        description: `Tenant "${data.tenant.name}" criado com admin "${data.admin.email}"`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar tenant',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  return {
    createTenant: createTenant.mutate,
    isCreating: createTenant.isPending,
  };
}
