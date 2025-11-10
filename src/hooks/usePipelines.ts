import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface Pipeline {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const usePipelines = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pipelines, isLoading } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Pipeline[];
    },
  });

  const createPipeline = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("pipelines")
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast({
        title: "Pipeline criada",
        description: "Nova pipeline criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a pipeline",
        variant: "destructive",
      });
    },
  });

  const updatePipeline = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("pipelines")
        .update({ name })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast({
        title: "Pipeline atualizada",
        description: "Pipeline atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a pipeline",
        variant: "destructive",
      });
    },
  });

  const deletePipeline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pipelines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast({
        title: "Pipeline excluída",
        description: "Pipeline excluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a pipeline",
        variant: "destructive",
      });
    },
  });

  return {
    pipelines,
    isLoading,
    createPipeline: createPipeline.mutate,
    updatePipeline: updatePipeline.mutate,
    deletePipeline: deletePipeline.mutate,
  };
};
