import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

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

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Webhook[];
    },
  });

  const createWebhook = useMutation({
    mutationFn: async ({ url, events }: { url: string; events: string[] }) => {
      const { data, error } = await supabase
        .from('webhooks')
        .insert([{ url, events, is_active: true }])
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
