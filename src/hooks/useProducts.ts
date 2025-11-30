import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { dispatchWebhookFromClient } from '@/lib/webhookClient';

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number | null;
  sku: string | null;
  stock: number | null;
  category: string | null;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useProducts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  const createProduct = useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'tenant_id' | 'slug' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error('Tenant not found');

      const { data, error } = await supabase
        .from('products')
        .insert([{ ...product, tenant_id: userData.tenant_id }])
        .select()
        .single();

      if (error) throw error;

      // Disparar webhook product.created
      await dispatchWebhookFromClient({
        event: 'product.created',
        entity: 'product',
        data,
        tenant_id: userData.tenant_id,
        user_id: user.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Produto criado',
        description: 'O produto foi criado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Buscar produto antes de atualizar
      const { data: before, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !before) throw fetchError || new Error('Product not found');

      const { data: after, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Disparar webhook product.updated apenas se houve mudanças significativas
      const hasSignificantChange = Object.keys(updates).some(
        key => updates[key as keyof Product] !== before[key as keyof Product]
      );

      if (hasSignificantChange) {
        await dispatchWebhookFromClient({
          event: 'product.updated',
          entity: 'product',
          data: { before, after },
          tenant_id: before.tenant_id,
          user_id: user.id,
        });
      }

      return after;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Produto atualizado',
        description: 'O produto foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Buscar produto antes de deletar
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !product) throw fetchError || new Error('Product not found');

      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) throw error;

      // Disparar webhook product.deleted
      await dispatchWebhookFromClient({
        event: 'product.deleted',
        entity: 'product',
        data: product,
        tenant_id: product.tenant_id,
        user_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Produto excluído',
        description: 'O produto foi excluído com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    products,
    isLoading,
    createProduct: createProduct.mutate,
    createProductAsync: createProduct.mutateAsync,
    updateProduct: updateProduct.mutate,
    deleteProduct: deleteProduct.mutate,
  };
};
