import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';

export interface Webhook {
  id: string;
  tenant_id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export const useWebhooks = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks', currentUser?.tenant_id],
    queryFn: async () => {
      if (!currentUser?.tenant_id) throw new Error('Tenant not found');

      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('tenant_id', currentUser.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Webhook[];
    },
    enabled: !!currentUser?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const createWebhook = useMutation({
    mutationFn: async ({ url, events }: { url: string; events: string[] }) => {
      if (!user?.id || !currentUser?.tenant_id) throw new Error('User not authenticated');

      // Gerar secret único para o webhook
      const secret = crypto.randomUUID();

      const { data, error } = await supabase
        .from('webhooks')
        .insert([{ 
          url, 
          events, 
          is_active: true, 
          tenant_id: currentUser.tenant_id,
          secret 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: 'Webhook criado',
        description: 'O webhook foi criado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar webhook',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateWebhook = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Webhook> }) => {
      const { data, error } = await supabase
        .from('webhooks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: 'Webhook atualizado',
        description: 'O webhook foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar webhook',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('webhooks').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: 'Webhook excluído',
        description: 'O webhook foi excluído com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir webhook',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    webhooks,
    isLoading,
    createWebhook: createWebhook.mutateAsync,
    updateWebhook: updateWebhook.mutateAsync,
    deleteWebhook: deleteWebhook.mutateAsync,
  };
};
