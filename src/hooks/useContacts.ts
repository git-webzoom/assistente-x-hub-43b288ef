import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

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
  const queryClient = useQueryClient();

  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ['contacts', user?.id, searchQuery],
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
        .from('contacts')
        .select('*')
        .eq('tenant_id', userData.tenant_id)
        .order('created_at', { ascending: false });

      // Apply search filter if provided
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!user?.id,
  });

  const createContact = useMutation({
    mutationFn: async (newContact: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error('Tenant not found');

      const { data, error } = await supabase
        .from('contacts')
        .insert([{ ...newContact, tenant_id: userData.tenant_id }])
        .select()
        .single();

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
