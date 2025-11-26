import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface Task {
  id: string;
  tenant_id: string;
  contact_id: string | null;
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
}

export const useTasks = () => {
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
          contact:contacts(id, name, email)
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
    mutationFn: async (task: Omit<Task, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'completed_at' | 'contact'>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert([task])
        .select()
        .single();

      if (error) throw error;
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
      const { contact, ...updateData } = updates;
      
      // Se marcar como completed, adiciona timestamp
      if (updateData.status === 'completed' && !updateData.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      // Se desmarcar completed, remove timestamp
      if (updateData.status && updateData.status !== 'completed') {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { error } = await supabase.from('tasks').delete().eq('id', id);

      if (error) throw error;
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
