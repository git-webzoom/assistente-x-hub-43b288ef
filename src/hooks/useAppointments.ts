import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Appointment {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    name: string;
    email: string | null;
  };
}

export const useAppointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      // Primeiro tenta buscar com join
      const { data: appointmentsWithContact, error: errorWithJoin } = await supabase
        .from('appointments')
        .select(`
          *,
          contact:contacts(id, name, email)
        `)
        .order('start_time', { ascending: true });

      // Se deu certo, retorna
      if (!errorWithJoin && appointmentsWithContact) {
        return appointmentsWithContact as Appointment[];
      }

      // Se falhou por causa do relacionamento, busca sem join
      const { data: appointmentsWithoutContact, error: errorWithoutJoin } = await supabase
        .from('appointments')
        .select('*')
        .order('start_time', { ascending: true });

      if (errorWithoutJoin) throw errorWithoutJoin;

      // Se temos contact_ids, busca os contatos separadamente
      const contactIds = appointmentsWithoutContact?.filter(a => a.contact_id).map(a => a.contact_id) || [];
      
      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name, email')
          .in('id', contactIds);

        // Adiciona os contatos aos compromissos
        return appointmentsWithoutContact?.map(appointment => ({
          ...appointment,
          contact: contacts?.find(c => c.id === appointment.contact_id),
        })) as Appointment[];
      }

      return appointmentsWithoutContact as Appointment[];
    },
  });

  const createAppointment = useMutation({
    mutationFn: async (appointment: Omit<Appointment, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'contact'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error('Tenant not found');

      const { data, error } = await supabase
        .from('appointments')
        .insert([{ ...appointment, tenant_id: userData.tenant_id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Compromisso criado',
        description: 'O compromisso foi criado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar compromisso',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
      const { contact, ...updateData } = updates;
      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Compromisso atualizado',
        description: 'O compromisso foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar compromisso',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Compromisso excluído',
        description: 'O compromisso foi excluído com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir compromisso',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    appointments,
    isLoading,
    createAppointment: createAppointment.mutate,
    updateAppointment: updateAppointment.mutate,
    deleteAppointment: deleteAppointment.mutate,
  };
};
