import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
import { dispatchWebhookFromClient } from '@/lib/webhookClient';

export interface Appointment {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  owner_id: string | null;
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
  owner?: {
    id: string;
    name: string;
    email: string | null;
  };
}

export const useAppointments = () => {
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();
  const { role } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', currentUser?.tenant_id, role, user?.id],
    queryFn: async () => {
      // Primeiro tenta buscar com join
      let query = supabase
        .from('appointments')
        .select(`
          *,
          contact:contacts(id, name, email),
          owner:users!owner_id(id, name, email)
        `);
      
      // Usuário normal só vê suas próprias agendas
      if (role === 'user') {
        query = query.eq('owner_id', user!.id);
      }
      
      const { data: appointmentsWithContact, error: errorWithJoin } = await query
        .order('start_time', { ascending: true });

      // Se deu certo, retorna
      if (!errorWithJoin && appointmentsWithContact) {
        return appointmentsWithContact as Appointment[];
      }

      // Se falhou por causa do relacionamento, busca sem join
      let fallbackQuery = supabase
        .from('appointments')
        .select('*');
      
      // Aplicar filtro por role também no fallback
      if (role === 'user') {
        fallbackQuery = fallbackQuery.eq('owner_id', user!.id);
      }
      
      const { data: appointmentsWithoutContact, error: errorWithoutJoin } = await fallbackQuery
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
    enabled: !!currentUser?.tenant_id && !!role && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  const createAppointment = useMutation({
    mutationFn: async (appointment: Omit<Appointment, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'contact' | 'owner'>) => {
      if (!user?.id || !currentUser?.tenant_id) throw new Error('User not authenticated');

      // Auto-atribuir ao próprio usuário se não especificado
      const appointmentData = {
        ...appointment,
        tenant_id: currentUser.tenant_id,
        owner_id: appointment.owner_id || user.id,
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();

      if (error) throw error;

      // Disparar webhook appointment.created
      await dispatchWebhookFromClient({
        event: 'appointment.created',
        entity: 'appointment',
        data,
        tenant_id: currentUser.tenant_id,
        user_id: user.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
      if (!user?.id) throw new Error('User not authenticated');

      const { contact, ...updateData } = updates;

      // Buscar appointment antes de atualizar
      const { data: before, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !before) throw fetchError || new Error('Appointment not found');

      const { data: after, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Disparar webhook appointment.updated apenas se houve mudanças significativas
      const hasSignificantChange = Object.keys(updateData).some(
        key => updateData[key as keyof typeof updateData] !== before[key as keyof typeof before]
      );

      if (hasSignificantChange) {
        await dispatchWebhookFromClient({
          event: 'appointment.updated',
          entity: 'appointment',
          data: { before, after },
          tenant_id: before.tenant_id,
          user_id: user.id,
        });
      }

      return after;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
      if (!user?.id) throw new Error('User not authenticated');

      // Buscar appointment antes de deletar
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !appointment) throw fetchError || new Error('Appointment not found');

      const { error } = await supabase.from('appointments').delete().eq('id', id);

      if (error) throw error;

      // Disparar webhook appointment.deleted
      await dispatchWebhookFromClient({
        event: 'appointment.deleted',
        entity: 'appointment',
        data: appointment,
        tenant_id: appointment.tenant_id,
        user_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
