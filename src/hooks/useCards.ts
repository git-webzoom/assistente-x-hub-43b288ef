import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface Card {
  id: string;
  tenant_id: string;
  pipeline_id: string;
  stage_id: string;
  contact_id: string | null;
  title: string;
  description: string | null;
  value: number;
  product_ids: string[] | null;
  position: number;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useCards = (pipelineId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      pipelineId,
      stageId,
      title,
      value,
      position,
      description,
      tags,
    }: {
      pipelineId: string;
      stageId: string;
      title: string;
      value: number;
      position: number;
      description?: string;
      tags?: string[];
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;
      const tenantId = userData?.tenant_id;
      if (!tenantId) throw new Error("Tenant not found");

      const { data, error } = await supabase
        .from("cards")
        .insert({
          tenant_id: tenantId,
          pipeline_id: pipelineId,
          stage_id: stageId,
          title,
          value,
          position,
          description: description || null,
          tags: tags || null,
          created_by: user.id,
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
      title,
      value,
      description,
      tags,
    }: {
      id: string;
      stageId?: string;
      position?: number;
      title?: string;
      value?: number;
      description?: string;
      tags?: string[];
    }) => {
      const updates: any = {};
      if (stageId) updates.stage_id = stageId;
      if (position !== undefined) updates.position = position;
      if (title) updates.title = title;
      if (value !== undefined) updates.value = value;
      if (description !== undefined) updates.description = description;
      if (tags !== undefined) updates.tags = tags;

      const { error } = await supabase.from("cards").update(updates).eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      // Show toast only when updating card details (not position/stage)
      if (variables.title || variables.value !== undefined) {
        toast({
          title: "Card atualizado",
          description: "Card atualizado com sucesso",
        });
      }
    },
    onError: (_, variables) => {
      // Show error toast only when updating card details
      if (variables.title || variables.value !== undefined) {
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o card",
          variant: "destructive",
        });
      }
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
