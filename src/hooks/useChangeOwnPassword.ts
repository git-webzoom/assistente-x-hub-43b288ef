import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from './use-toast';

interface ChangePasswordParams {
  newPassword: string;
}

export const useChangeOwnPassword = () => {
  const changePassword = useMutation({
    mutationFn: async (params: ChangePasswordParams) => {
      const { error } = await supabase.auth.updateUser({
        password: params.newPassword,
      });

      if (error) throw error;

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Senha alterada com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao alterar senha',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    changePassword: changePassword.mutate,
    isChanging: changePassword.isPending,
  };
};
