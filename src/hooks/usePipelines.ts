import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();

  const { data: pipelines, isLoading } = useQuery({
    queryKey: ["pipelines", currentUser?.tenant_id],
    queryFn: async () => {
      if (!currentUser?.tenant_id) return [];

      const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .eq("tenant_id", currentUser.tenant_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Pipeline[];
    },
    enabled: !!currentUser?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const createPipeline = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id || !currentUser?.tenant_id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("pipelines")
        .insert({ name, tenant_id: currentUser.tenant_id })
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
