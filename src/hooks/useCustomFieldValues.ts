import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CustomFieldValue {
  id: string;
  custom_field_id: string;
  entity_id: string;
  value: any;
  created_at: string;
  updated_at: string;
}

export const useCustomFieldValues = (entityId?: string) => {
  const queryClient = useQueryClient();

  const { data: fieldValues, isLoading } = useQuery({
    queryKey: ['custom-field-values', entityId],
    queryFn: async () => {
      if (!entityId) return [];

      const { data, error } = await supabase
        .from('custom_field_values')
        .select('*')
        .eq('entity_id', entityId);

      if (error) throw error;
      return data as CustomFieldValue[];
    },
    enabled: !!entityId,
  });

  const upsertFieldValue = useMutation({
    mutationFn: async ({
      customFieldId,
      entityId,
      value,
    }: {
      customFieldId: string;
      entityId: string;
      value: any;
    }) => {
      const { data, error } = await supabase
        .from('custom_field_values')
        .upsert(
          {
            custom_field_id: customFieldId,
            entity_id: entityId,
            value,
          },
          {
            onConflict: 'custom_field_id,entity_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-values'] });
    },
  });

  const deleteFieldValue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_field_values')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-values'] });
    },
  });

  return {
    fieldValues,
    isLoading,
    upsertFieldValue: upsertFieldValue.mutate,
    deleteFieldValue: deleteFieldValue.mutate,
  };
};
