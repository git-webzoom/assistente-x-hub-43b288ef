import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from './use-toast';

interface CreateUserParams {
  email: string;
  role: 'admin' | 'user';
  name?: string;
}

interface CreateUserResponse {
  success: boolean;
  user: any;
  tempPassword: string;
}

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  const createUser = useMutation({
    mutationFn: async (params: CreateUserParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
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
        throw new Error(error.error || 'Erro ao criar usuário');
      }

      return await response.json() as CreateUserResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-permissions'] });
      
      toast({
        title: 'Usuário criado com sucesso',
        description: `Senha temporária: ${data.tempPassword}`,
        duration: 10000,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    createUser: createUser.mutate,
    isCreating: createUser.isPending,
  };
};
