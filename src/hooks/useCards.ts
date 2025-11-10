import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface Card {
  id: string;
  stage_id: string;
  title: string;
  description: string | null;
  value: number;
  contact_id: string | null;
  position: number;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export const useCards = (pipelineId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cards, isLoading } = useQuery({
    queryKey: ["cards", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];

      // Get stages first
      const { data: stages, error: stagesError } = await supabase
        .from("stages")
        .select("id")
        .eq("pipeline_id", pipelineId);

      if (stagesError) throw stagesError;

      const stageIds = stages.map((s) => s.id);

      if (stageIds.length === 0) return [];

      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .in("stage_id", stageIds)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as Card[];
    },
    enabled: !!pipelineId,
  });

  const createCard = useMutation({
    mutationFn: async ({
      stageId,
      title,
      value,
      position,
      description,
      tags,
    }: {
      stageId: string;
      title: string;
      value: number;
      position: number;
      description?: string;
      tags?: string[];
    }) => {
      const { data, error } = await supabase
        .from("cards")
        .insert({
          stage_id: stageId,
          title,
          value,
          position,
          description: description || null,
          tags: tags || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      toast({
        title: "Card criado",
        description: "Novo card criado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o card",
        variant: "destructive",
      });
    },
  });

  const updateCard = useMutation({
    mutationFn: async ({
      id,
      stageId,
      position,
    }: {
      id: string;
      stageId?: string;
      position?: number;
    }) => {
      const updates: any = {};
      if (stageId) updates.stage_id = stageId;
      if (position !== undefined) updates.position = position;

      const { error } = await supabase.from("cards").update(updates).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      toast({
        title: "Card excluído",
        description: "Card excluído com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o card",
        variant: "destructive",
      });
    },
  });

  return {
    cards,
    isLoading,
    createCard: createCard.mutate,
    updateCard: updateCard.mutate,
    deleteCard: deleteCard.mutate,
  };
};
