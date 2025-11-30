import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Tag } from './useTags';

interface ContactTag {
  id: string;
  contact_id: string;
  tag_id: string;
  created_at: string;
  tags?: Tag;
}

export const useContactTags = (contactId?: string) => {
  const queryClient = useQueryClient();

  const { data: contactTags, isLoading } = useQuery({
    queryKey: ['contact-tags', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from('contact_tags')
        .select('*, tags(*)')
        .eq('contact_id', contactId);

      if (error) throw error;
      return data as ContactTag[];
    },
    enabled: !!contactId,
  });

  const addTagToContact = useMutation({
    mutationFn: async ({ contactId, tagId }: { contactId: string; tagId: string }) => {
      const { data, error } = await supabase
        .from('contact_tags')
        .insert([{ contact_id: contactId, tag_id: tagId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-tags'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao adicionar tag.',
        variant: 'destructive',
      });
    },
  });

  const removeTagFromContact = useMutation({
    mutationFn: async ({ contactId, tagId }: { contactId: string; tagId: string }) => {
      const { error } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contactId)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-tags'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao remover tag.',
        variant: 'destructive',
      });
    },
  });

  const setContactTags = useMutation({
    mutationFn: async ({ contactId, tagIds }: { contactId: string; tagIds: string[] }) => {
      // First, delete all existing tags for this contact
      await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contactId);

      // Then insert the new tags
      if (tagIds.length > 0) {
        const { error } = await supabase
          .from('contact_tags')
          .insert(tagIds.map(tagId => ({ contact_id: contactId, tag_id: tagId })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-tags'] });
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
    contactTags: contactTags?.map(ct => ct.tags).filter(Boolean) as Tag[] || [],
    isLoading,
    addTagToContact,
    removeTagFromContact,
    setContactTags,
  };
};
