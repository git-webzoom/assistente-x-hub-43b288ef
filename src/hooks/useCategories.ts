import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { toast } from '@/hooks/use-toast';

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export const useCategories = () => {
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', currentUser?.tenant_id],
    queryFn: async () => {
      if (!currentUser?.tenant_id) throw new Error('Tenant not found');

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', currentUser.tenant_id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!currentUser?.tenant_id,
    staleTime: 10 * 60 * 1000, // 10 minutos - categorias mudam raramente
  });

  const createCategory = useMutation({
    mutationFn: async (newCategory: { name: string; description?: string; color?: string }) => {
      if (!user?.id || !currentUser?.tenant_id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('categories')
        .insert([{ 
          name: newCategory.name.trim(),
          description: newCategory.description?.trim() || null,
          color: newCategory.color || null,
          tenant_id: currentUser.tenant_id 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Sucesso!',
        description: 'Categoria criada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar categoria.',
        variant: 'destructive',
      });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; description?: string; color?: string } }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Sucesso!',
        description: 'Categoria atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar categoria.',
        variant: 'destructive',
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({
        title: 'Sucesso!',
        description: 'Categoria excluída com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir categoria.',
        variant: 'destructive',
      });
    },
  });

  return {
    categories: categories || [],
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
