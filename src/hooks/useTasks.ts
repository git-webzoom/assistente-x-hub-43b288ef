import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { dispatchWebhookFromClient } from '@/lib/webhookClient';

export interface Task {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    name: string;
    email: string | null;
  };
  assigned_user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export const useTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      // Primeiro tenta buscar com join
      const { data: tasksWithContact, error: errorWithJoin } = await supabase
        .from('tasks')
        .select(`
          *,
          contact:contacts(id, name, email),
          assigned_user:users!assigned_to(id, name, email)
        `)
        .order('due_date', { ascending: true, nullsFirst: false });

      // Se deu certo, retorna
      if (!errorWithJoin && tasksWithContact) {
        return tasksWithContact as Task[];
      }

      // Se falhou por causa do relacionamento, busca sem join
      const { data: tasksWithoutContact, error: errorWithoutJoin } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (errorWithoutJoin) throw errorWithoutJoin;

      // Se temos contact_ids, busca os contatos separadamente
      const taskIds = tasksWithoutContact?.filter(t => t.contact_id).map(t => t.contact_id) || [];
      
      if (taskIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name, email')
          .in('id', taskIds);

        // Adiciona os contatos às tarefas
        return tasksWithoutContact?.map(task => ({
          ...task,
          contact: contacts?.find(c => c.id === task.contact_id),
        })) as Task[];
      }

      return tasksWithoutContact as Task[];
    },
  });

  const createTask = useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'completed_at' | 'contact' | 'assigned_user'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error('Tenant not found');

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...task, tenant_id: userData.tenant_id }])
        .select()
        .single();

      if (error) throw error;

      // Disparar webhook task.created
      await dispatchWebhookFromClient({
        event: 'task.created',
        entity: 'task',
        data,
        tenant_id: userData.tenant_id,
        user_id: user.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Tarefa criada',
        description: 'A tarefa foi criada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar tarefa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { contact, assigned_user, ...updateData } = updates;
      
      // Buscar task atual antes de atualizar
      const { data: before, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !before) throw fetchError || new Error('Task not found');

      // Se marcar como completed, adiciona timestamp
      if (updateData.status === 'completed' && !updateData.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      // Se desmarcar completed, remove timestamp
      if (updateData.status && updateData.status !== 'completed') {
        updateData.completed_at = null;
      }

      const { data: after, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const tenantId = before.tenant_id;

      // Disparar webhook apenas se status mudou para completed
      if (updateData.status === 'completed' && before.status !== 'completed') {
        await dispatchWebhookFromClient({
          event: 'task.completed',
          entity: 'task',
          data: after,
          tenant_id: tenantId,
          user_id: user.id,
        });
      }

      // Disparar webhook task.updated para outras mudanças (exceto completed_at automático)
      const hasSignificantChange = 
        (updateData.title !== undefined && updateData.title !== before.title) ||
        (updateData.description !== undefined && updateData.description !== before.description) ||
        (updateData.due_date !== undefined && updateData.due_date !== before.due_date) ||
        (updateData.priority !== undefined && updateData.priority !== before.priority) ||
        (updateData.status !== undefined && updateData.status !== before.status);

      if (hasSignificantChange) {
        await dispatchWebhookFromClient({
          event: 'task.updated',
          entity: 'task',
          data: { before, after },
          tenant_id: tenantId,
          user_id: user.id,
        });
      }

      return after;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Tarefa atualizada',
        description: 'A tarefa foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar tarefa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Buscar task antes de deletar
      const { data: task, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !task) throw fetchError || new Error('Task not found');

      const { error } = await supabase.from('tasks').delete().eq('id', id);

      if (error) throw error;

      // Disparar webhook task.deleted
      await dispatchWebhookFromClient({
        event: 'task.deleted',
        entity: 'task',
        data: task,
        tenant_id: task.tenant_id,
        user_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Tarefa excluída',
        description: 'A tarefa foi excluída com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir tarefa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    tasks,
    isLoading,
    createTask: createTask.mutate,
    updateTask: updateTask.mutate,
    deleteTask: deleteTask.mutate,
  };
};
