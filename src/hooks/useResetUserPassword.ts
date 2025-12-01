import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from './use-toast';

interface ResetPasswordParams {
  userId: string;
  newPassword: string;
}

export const useResetUserPassword = () => {
  const queryClient = useQueryClient();

  const resetPassword = useMutation({
    mutationFn: async (params: ResetPasswordParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
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
        throw new Error(error.error || 'Erro ao resetar senha');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Senha resetada com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao resetar senha',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    resetPassword: resetPassword.mutate,
    isResetting: resetPassword.isPending,
  };
};
