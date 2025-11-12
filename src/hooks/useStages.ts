import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface Stage {
  id: string;
  pipeline_id: string;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export const useStages = (pipelineId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stages, isLoading } = useQuery({
    queryKey: ["stages", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];

      const { data, error } = await supabase
        .from("stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!pipelineId,
  });

  const createStage = useMutation({
    mutationFn: async ({
      pipelineId,
      name,
      order_index,
    }: {
      pipelineId: string;
      name: string;
      order_index: number;
    }) => {
      const { data, error } = await supabase
        .from("stages")
        .insert({ pipeline_id: pipelineId, name, order_index })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages"] });
      toast({
        title: "Etapa criada",
        description: "Nova etapa criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a etapa",
        variant: "destructive",
      });
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("stages")
        .update({ name })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages"] });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages"] });
      toast({
        title: "Etapa excluída",
        description: "Etapa excluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a etapa",
        variant: "destructive",
      });
    },
  });

  return {
    stages,
    isLoading,
    createStage: createStage.mutate,
    updateStage: updateStage.mutate,
    updateStageOrder: updateStageOrder.mutate,
    deleteStage: deleteStage.mutate,
  };
};
