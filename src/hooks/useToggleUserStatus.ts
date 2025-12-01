import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from './use-toast';

interface ToggleUserStatusParams {
  userId: string;
  enable: boolean;
}

export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  const toggleStatus = useMutation({
    mutationFn: async (params: ToggleUserStatusParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-user-status`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao alterar status do usuário');
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-permissions'] });
      
      toast({
        title: variables.enable ? 'Usuário ativado com sucesso' : 'Usuário desativado com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    toggleStatus: toggleStatus.mutate,
    isToggling: toggleStatus.isPending,
  };
};
