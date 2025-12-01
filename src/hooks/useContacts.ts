import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { toast } from '@/hooks/use-toast';
import { dispatchWebhookFromClient } from '@/lib/webhookClient';

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  tags: string[] | null;
  notes: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export const useContacts = (searchQuery?: string) => {
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ['contacts', currentUser?.tenant_id, searchQuery],
    queryFn: async () => {
      if (!currentUser?.tenant_id) throw new Error('Tenant not found');

      let query = supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', currentUser.tenant_id)
        .order('created_at', { ascending: false });

      // Apply search filter if provided
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!currentUser?.tenant_id,
    staleTime: 3 * 60 * 1000, // 3 minutos
  });

  const createContact = useMutation({
    mutationFn: async (newContact: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'tags'>) => {
      if (!user?.id || !currentUser?.tenant_id) throw new Error('User not authenticated');

      const { tags, ...contactData } = newContact as any;

      const { data, error } = await supabase
        .from('contacts')
        .insert([{ ...contactData, tenant_id: currentUser.tenant_id }])
        .select()
        .single();

      if (error) throw error;

      // Disparar webhook contact.created
      await dispatchWebhookFromClient({
        event: 'contact.created',
        entity: 'contact',
        data,
        tenant_id: currentUser.tenant_id,
        user_id: user.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: 'Sucesso!',
        description: 'Contato criado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar contato.',
        variant: 'destructive',
      });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Contact> }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Buscar contato antes de atualizar
      const { data: before, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !before) throw fetchError || new Error('Contact not found');

      const { data: after, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Disparar webhook contact.updated apenas se houve mudanças significativas
      const hasSignificantChange = Object.keys(updates).some(
        key => updates[key as keyof Contact] !== before[key as keyof Contact]
      );

      if (hasSignificantChange) {
        await dispatchWebhookFromClient({
          event: 'contact.updated',
          entity: 'contact',
          data: { before, after },
          tenant_id: before.tenant_id,
          user_id: user.id,
        });
      }

      return after;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Sucesso!',
        description: 'Contato atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar contato.',
        variant: 'destructive',
      });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Buscar contato antes de deletar
      const { data: contact, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !contact) throw fetchError || new Error('Contact not found');

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Disparar webhook contact.deleted
      await dispatchWebhookFromClient({
        event: 'contact.deleted',
        entity: 'contact',
        data: contact,
        tenant_id: contact.tenant_id,
        user_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: 'Sucesso!',
        description: 'Contato excluído com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir contato.',
        variant: 'destructive',
      });
    },
  });

  return {
    contacts: contacts || [],
    isLoading,
    error,
    createContact,
    updateContact,
    deleteContact,
  };
};
