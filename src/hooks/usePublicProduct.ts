import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Product } from './useProducts';
import type { ProductImage } from './useProductImages';
import type { CustomField } from './useCustomFields';
import type { CustomFieldValue } from './useCustomFieldValues';

interface PublicProductData {
  product: Product;
  images: ProductImage[];
  customFields: Array<CustomField & { value: any }>;
  tenantName: string;
}

export const usePublicProduct = (slug: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-product', slug],
    queryFn: async (): Promise<PublicProductData | null> => {
      // Fetch product by slug (public access, only active products)
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*, tenants(name)')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (productError) throw productError;
      if (!product) return null;

      // Fetch product images
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (imagesError) throw imagesError;

      // Generate public URLs for images
      const images: ProductImage[] = (imagesData || []).map((img) => ({
        ...img,
        public_url: supabase.storage
          .from('product-images')
          .getPublicUrl(img.storage_path).data.publicUrl,
      }));

      // Fetch custom fields for product entity type
      const { data: customFieldsData, error: customFieldsError } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('entity_type', 'product')
        .eq('tenant_id', product.tenant_id)
        .order('display_order', { ascending: true });

      if (customFieldsError) throw customFieldsError;

      // Fetch custom field values for this product
      const { data: fieldValuesData, error: fieldValuesError } = await supabase
        .from('custom_field_values')
        .select('*')
        .eq('entity_id', product.id);

      if (fieldValuesError) throw fieldValuesError;

      // Merge custom fields with their values
      const customFields = (customFieldsData || []).map((field) => {
        const fieldValue = (fieldValuesData || []).find(
          (fv: CustomFieldValue) => fv.custom_field_id === field.id
        );
        return {
          ...field,
          value: fieldValue?.value || null,
        };
      });

      return {
        product,
        images,
        customFields,
        tenantName: (product as any).tenants?.name || '',
      };
    },
    enabled: !!slug,
  });

  return {
    data,
    isLoading,
    error,
  };
};
