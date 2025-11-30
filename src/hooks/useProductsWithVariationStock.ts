import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ProductStockSummary {
  product_id: string;
  total_variation_stock: number;
  has_variations: boolean;
}

export const useProductsWithVariationStock = () => {
  const { data: stockSummaries = [], isLoading } = useQuery({
    queryKey: ['products-variation-stock-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_custom_field_stock')
        .select('product_id, quantity');

      if (error) throw error;

      // Agrupar por product_id e somar as quantidades
      const summaryMap = new Map<string, { total: number; count: number }>();
      
      data?.forEach((stock) => {
        const current = summaryMap.get(stock.product_id) || { total: 0, count: 0 };
        summaryMap.set(stock.product_id, {
          total: current.total + stock.quantity,
          count: current.count + 1,
        });
      });

      // Converter para array de ProductStockSummary
      return Array.from(summaryMap.entries()).map(([product_id, { total, count }]) => ({
        product_id,
        total_variation_stock: total,
        has_variations: count > 0,
      })) as ProductStockSummary[];
    },
  });

  const getProductStock = (productId: string): ProductStockSummary | null => {
    return stockSummaries.find(s => s.product_id === productId) || null;
  };

  return {
    stockSummaries,
    isLoading,
    getProductStock,
  };
};
