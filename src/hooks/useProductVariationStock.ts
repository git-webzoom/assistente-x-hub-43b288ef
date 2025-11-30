import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface ProductVariationStock {
  id: string;
  tenant_id: string;
  product_id: string;
  custom_field_id: string;
  option_value: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export const useProductVariationStock = (productId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Buscar estoque de variações de um produto
  const { data: variationStocks = [], isLoading } = useQuery({
    queryKey: ['product-variation-stock', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('product_custom_field_stock')
        .select('*')
        .eq('product_id', productId)
        .order('custom_field_id')
        .order('option_value');

      if (error) throw error;
      return data as ProductVariationStock[];
    },
    enabled: !!productId,
  });

  // Função auxiliar para recalcular e atualizar o estoque total do produto
  const updateProductTotalStock = async (productId: string) => {
    const { data, error } = await supabase
      .from('product_custom_field_stock')
      .select('quantity')
      .eq('product_id', productId);

    if (error) throw error;

    const totalStock = (data ?? []).reduce(
      (sum, row: { quantity: number | null }) => sum + (row.quantity ?? 0),
      0
    );

    const { error: updateError } = await supabase
      .from('products')
      .update({
        stock: totalStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (updateError) throw updateError;
  };

  // Upsert (criar ou atualizar) estoque de variação
  const upsertVariationStock = useMutation({
    mutationFn: async ({
      productId,
      customFieldId,
      optionValue,
      quantity,
    }: {
      productId: string;
      customFieldId: string;
      optionValue: string;
      quantity: number;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar tenant_id do usuário
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error('Tenant não encontrado');

      const { data, error } = await supabase
        .from('product_custom_field_stock')
        .upsert(
          {
            tenant_id: userData.tenant_id,
            product_id: productId,
            custom_field_id: customFieldId,
            option_value: optionValue,
            quantity,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'product_id,custom_field_id,option_value',
          }
        )
        .select()
        .single();

      if (error) throw error;

      // Recalcular e atualizar o estoque total do produto
      await updateProductTotalStock(productId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variation-stock', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Estoque atualizado',
        description: 'O estoque da variação foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar estoque',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Deletar estoque de variação
  const deleteVariationStock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_custom_field_stock')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Se tivermos o productId no hook, atualiza o estoque total
      if (productId) {
        await updateProductTotalStock(productId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variation-stock', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Estoque removido',
        description: 'O estoque da variação foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover estoque',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calcular estoque total do produto
  const totalStock = variationStocks.reduce((sum, stock) => sum + stock.quantity, 0);

  return {
    variationStocks,
    isLoading,
    totalStock,
    upsertVariationStock: upsertVariationStock.mutate,
    deleteVariationStock: deleteVariationStock.mutate,
  };
};
