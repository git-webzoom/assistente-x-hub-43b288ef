import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { dispatchWebhookFromClient } from '@/lib/webhookClient';

export interface ProductImage {
  id: string;
  product_id: string;
  tenant_id: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  is_primary: boolean;
  display_order: number;
  status: 'active' | 'archived';
  created_by: string;
  created_at: string;
  public_url?: string;
}

export interface UploadImagePayload {
  productId: string;
  file: File;
  altText?: string;
  isPrimary?: boolean;
  displayOrder?: number;
}

const BUCKET_NAME = 'product-images';

export const useProductImages = (productId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar imagens de um produto
  const { data: images, isLoading } = useQuery({
    queryKey: ['product-images', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'active')
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Gerar URLs públicas para cada imagem
      const imagesWithUrls = await Promise.all(
        (data || []).map(async (img) => {
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(img.storage_path);

          return {
            ...img,
            public_url: urlData.publicUrl,
          };
        })
      );

      return imagesWithUrls as ProductImage[];
    },
    enabled: !!productId,
  });

  // Upload de imagens
  const uploadImages = useMutation({
    mutationFn: async (payloads: UploadImagePayload[]) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error('Tenant não encontrado');

      const results = [];

      for (const payload of payloads) {
        const { productId, file, altText, isPrimary, displayOrder } = payload;

        // Gerar path único: tenant_id/product_id/timestamp_filename
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `${userData.tenant_id}/${productId}/${fileName}`;

        // Upload para Storage
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Inserir registro no DB
        const { data: imageData, error: dbError } = await supabase
          .from('product_images')
          .insert([
            {
              product_id: productId,
              tenant_id: userData.tenant_id,
              storage_path: storagePath,
              filename: file.name,
              mime_type: file.type,
              size_bytes: file.size,
              alt_text: altText || null,
              is_primary: isPrimary || false,
              display_order: displayOrder || 0,
              status: 'active',
              created_by: user.id,
            },
          ])
          .select()
          .single();

        if (dbError) {
          // Rollback: deletar arquivo do storage
          await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
          throw dbError;
        }

        // Disparar webhook
        await dispatchWebhookFromClient({
          event: 'product_image.created',
          entity: 'product_image',
          data: imageData,
          tenant_id: userData.tenant_id,
          user_id: user.id,
        });

        results.push(imageData);
      }

      return results;
    },
    onSuccess: (_, variables) => {
      const productId = variables[0]?.productId;
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
      }
      toast({
        title: 'Imagens enviadas',
        description: `${variables.length} imagem(ns) adicionada(s) com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar imagens',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Deletar imagem
  const deleteImage = useMutation({
    mutationFn: async ({ imageId, storagePath }: { imageId: string; storagePath: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar imagem para webhook
      const { data: imageData } = await supabase
        .from('product_images')
        .select('*')
        .eq('id', imageId)
        .single();

      // Deletar do DB
      const { error: dbError } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      // Deletar do Storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

      if (storageError) {
        console.error('Erro ao deletar do storage:', storageError);
      }

      // Disparar webhook
      if (imageData) {
        await dispatchWebhookFromClient({
          event: 'product_image.deleted',
          entity: 'product_image',
          data: imageData,
          tenant_id: imageData.tenant_id,
          user_id: user.id,
        });
      }

      return imageId;
    },
    onSuccess: (_, variables) => {
      // Invalidar cache de todas as imagens já que não sabemos o product_id
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
      toast({
        title: 'Imagem excluída',
        description: 'A imagem foi removida com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir imagem',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Definir imagem primária
  const setPrimaryImage = useMutation({
    mutationFn: async ({ imageId, productId }: { imageId: string; productId: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Remover is_primary de todas as imagens do produto
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);

      // Definir nova imagem primária
      const { data, error } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-images', data.product_id] });
      toast({
        title: 'Imagem primária definida',
        description: 'A imagem principal foi atualizada.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao definir imagem primária',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reordenar imagens
  const reorderImages = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const promises = updates.map(({ id, display_order }) =>
        supabase
          .from('product_images')
          .update({ display_order })
          .eq('id', id)
      );

      const results = await Promise.all(promises);

      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error('Erro ao reordenar imagens');
      }

      return updates;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao reordenar imagens',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    images,
    isLoading,
    uploadImages: uploadImages.mutateAsync,
    deleteImage: deleteImage.mutateAsync,
    setPrimaryImage: setPrimaryImage.mutateAsync,
    reorderImages: reorderImages.mutateAsync,
  };
};
