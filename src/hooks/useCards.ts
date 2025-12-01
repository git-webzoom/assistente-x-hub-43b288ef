import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserRole } from "@/hooks/useUserRole";
import { dispatchWebhookFromClient } from "@/lib/webhookClient";

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

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
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  card_tags?: Array<{
    tags: Tag;
  }>;
  owner?: {
    id: string;
    name: string;
    email: string | null;
  };
}

export const useCards = (pipelineId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();
  const { role } = useUserRole();

  const { data: cards, isLoading } = useQuery({
    queryKey: ["cards", pipelineId, role, user?.id],
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

      let query = supabase
        .from("cards")
        .select(`
          *,
          card_tags(
            tags(id, name, color)
          ),
          owner:users!owner_id(id, name, email)
        `)
        .in("stage_id", stageIds);

      // Usuário normal só vê seus próprios cards
      if (role === 'user') {
        query = query.eq('owner_id', user!.id);
      }

      const { data, error } = await query.order("position", { ascending: true });

      if (error) throw error;
      return data as Card[];
    },
    enabled: !!pipelineId && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  const createCard = useMutation({
    mutationFn: async ({
      pipelineId,
      stageId,
      title,
      value,
      position,
      description,
      owner_id,
    }: {
      pipelineId: string;
      stageId: string;
      title: string;
      value: number;
      position: number;
      description?: string;
      owner_id?: string;
    }) => {
      if (!user?.id || !currentUser?.tenant_id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("cards")
        .insert({
          tenant_id: currentUser.tenant_id,
          pipeline_id: pipelineId,
          stage_id: stageId,
          title,
          value,
          position,
          description: description || null,
          created_by: user.id,
          owner_id: owner_id || user.id, // Auto-atribuir ao próprio usuário se não especificado
        })
        .select()
        .single();

      if (error) throw error;

      // Disparar webhook de criação
      await dispatchWebhookFromClient({
        event: "card.created",
        entity: "card",
        data,
        tenant_id: currentUser.tenant_id,
        user_id: user.id,
      });

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
      owner_id,
    }: {
      id: string;
      stageId?: string;
      position?: number;
      title?: string;
      value?: number;
      description?: string;
      owner_id?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Buscar card atual para montar payloads de webhook
      const { data: before, error: fetchError } = await supabase
        .from("cards")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !before) throw fetchError || new Error("Card not found");

      const updates: any = {};
      if (stageId) updates.stage_id = stageId;
      if (position !== undefined) updates.position = position;
      if (title) updates.title = title;
      if (value !== undefined) updates.value = value;
      if (description !== undefined) updates.description = description;
      if (owner_id !== undefined) updates.owner_id = owner_id;

      const { data: after, error } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error || !after) throw error || new Error("Failed to update card");

      const tenantId = before.tenant_id;

      // Verificar se houve mudanças significativas (não apenas position)
      const hasSignificantChange =
        (title !== undefined && title !== before.title) ||
        (value !== undefined && value !== before.value) ||
        (description !== undefined && description !== before.description);

      // card.moved: stage mudou
      const stageMoved = stageId && before.stage_id !== stageId;
      if (stageMoved) {
        await dispatchWebhookFromClient({
          event: "card.moved",
          entity: "card",
          data: {
            card: after,
            from_stage_id: before.stage_id,
            to_stage_id: stageId,
          },
          tenant_id: tenantId,
          user_id: user.id,
        });
      }

      // card.updated: APENAS se houver mudança significativa E não for apenas movimentação
      if (hasSignificantChange && !stageMoved) {
        await dispatchWebhookFromClient({
          event: "card.updated",
          entity: "card",
          data: { before, after },
          tenant_id: tenantId,
          user_id: user.id,
        });
      }

      return after;
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
      if (!user?.id) throw new Error("User not authenticated");

      // Buscar card antes de deletar para mandar no webhook
      const { data: before, error: fetchError } = await supabase
        .from("cards")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !before) throw fetchError || new Error("Card not found");

      const { error } = await supabase.from("cards").delete().eq("id", id);
      if (error) throw error;

      await dispatchWebhookFromClient({
        event: "card.deleted",
        entity: "card",
        data: before,
        tenant_id: before.tenant_id,
        user_id: user.id,
      });
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
