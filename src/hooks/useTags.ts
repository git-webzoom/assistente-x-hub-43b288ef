import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Tag {
  id: string;
  tenant_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export const useTags = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error('Tenant not found');

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('tenant_id', userData.tenant_id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!user?.id,
  });

  const createTag = useMutation({
    mutationFn: async (newTag: { name: string; color?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error('Tenant not found');

      const { data, error } = await supabase
        .from('tags')
        .insert([{ 
          name: newTag.name.trim(),
          color: newTag.color || null,
          tenant_id: userData.tenant_id 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({
        title: 'Sucesso!',
        description: 'Tag criada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar tag.',
        variant: 'destructive',
      });
    },
  });

  const updateTag = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; color?: string } }) => {
      const { data, error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({
        title: 'Sucesso!',
        description: 'Tag atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar tag.',
        variant: 'destructive',
      });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['contact-tags'] });
      queryClient.invalidateQueries({ queryKey: ['card-tags'] });
      toast({
        title: 'Sucesso!',
        description: 'Tag excluída com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir tag.',
        variant: 'destructive',
      });
    },
  });

  return {
    tags: tags || [],
    isLoading,
    createTag,
    updateTag,
    deleteTag,
  };
};
