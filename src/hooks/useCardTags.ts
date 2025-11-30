import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Tag } from './useTags';

interface CardTag {
  id: string;
  card_id: string;
  tag_id: string;
  created_at: string;
  tags?: Tag;
}

export const useCardTags = (cardId?: string) => {
  const queryClient = useQueryClient();

  const { data: cardTags, isLoading } = useQuery({
    queryKey: ['card-tags', cardId],
    queryFn: async () => {
      if (!cardId) return [];

      const { data, error } = await supabase
        .from('card_tags')
        .select('*, tags(*)')
        .eq('card_id', cardId);

      if (error) throw error;
      return data as CardTag[];
    },
    enabled: !!cardId,
  });

  const addTagToCard = useMutation({
    mutationFn: async ({ cardId, tagId }: { cardId: string; tagId: string }) => {
      const { data, error } = await supabase
        .from('card_tags')
        .insert([{ card_id: cardId, tag_id: tagId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-tags'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao adicionar tag.',
        variant: 'destructive',
      });
    },
  });

  const removeTagFromCard = useMutation({
    mutationFn: async ({ cardId, tagId }: { cardId: string; tagId: string }) => {
      const { error } = await supabase
        .from('card_tags')
        .delete()
        .eq('card_id', cardId)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-tags'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao remover tag.',
        variant: 'destructive',
      });
    },
  });

  const setCardTags = useMutation({
    mutationFn: async ({ cardId, tagIds }: { cardId: string; tagIds: string[] }) => {
      // First, delete all existing tags for this card
      await supabase
        .from('card_tags')
        .delete()
        .eq('card_id', cardId);

      // Then insert the new tags
      if (tagIds.length > 0) {
        const { error } = await supabase
          .from('card_tags')
          .insert(tagIds.map(tagId => ({ card_id: cardId, tag_id: tagId })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-tags'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar tags.',
        variant: 'destructive',
      });
    },
  });

  return {
    cardTags: cardTags?.map(ct => ct.tags).filter(Boolean) as Tag[] || [],
    isLoading,
    addTagToCard,
    removeTagFromCard,
    setCardTags,
  };
};
