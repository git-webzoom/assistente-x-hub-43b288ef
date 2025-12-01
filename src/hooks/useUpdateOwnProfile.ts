import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from './use-toast';

interface UpdateOwnProfileParams {
  name?: string;
  email?: string;
}

export const useUpdateOwnProfile = () => {
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async (params: UpdateOwnProfileParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Não autenticado');
      }

      // Atualizar nome na tabela users
      if (params.name !== undefined) {
        const { error: nameError } = await supabase
          .from('users')
          .update({ name: params.name })
          .eq('id', user.id);

        if (nameError) throw nameError;
      }

      // Atualizar email no auth
      if (params.email !== undefined && params.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: params.email,
        });

        if (emailError) throw emailError;

        // Atualizar email na tabela users também
        const { error: userEmailError } = await supabase
          .from('users')
          .update({ email: params.email })
          .eq('id', user.id);

        if (userEmailError) throw userEmailError;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      
      toast({
        title: 'Perfil atualizado com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
  };
};
