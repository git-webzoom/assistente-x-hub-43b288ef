import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Category } from './useCategories';

interface ProductCategory {
  id: string;
  product_id: string;
  category_id: string;
  created_at: string;
  categories?: Category;
}

export const useProductCategories = (productId?: string) => {
  const queryClient = useQueryClient();

  const { data: productCategories, isLoading } = useQuery({
    queryKey: ['product-categories', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('product_categories')
        .select('*, categories(*)')
        .eq('product_id', productId);

      if (error) throw error;
      return data as ProductCategory[];
    },
    enabled: !!productId,
  });

  const setProductCategories = useMutation({
    mutationFn: async ({ productId, categoryIds }: { productId: string; categoryIds: string[] }) => {
      // First, delete all existing categories for this product
      await supabase
        .from('product_categories')
        .delete()
        .eq('product_id', productId);

      // Then insert the new categories
      if (categoryIds.length > 0) {
        const { error } = await supabase
          .from('product_categories')
          .insert(categoryIds.map(categoryId => ({ product_id: productId, category_id: categoryId })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar categorias.',
        variant: 'destructive',
      });
    },
  });

  return {
    productCategories: productCategories?.map(pc => pc.categories).filter(Boolean) as Category[] || [],
    isLoading,
    setProductCategories,
  };
};
