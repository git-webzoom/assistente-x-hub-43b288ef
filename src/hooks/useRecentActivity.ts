import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { useEffect } from 'react';

export const useRecentActivity = () => {
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity', currentUser?.tenant_id],
    queryFn: async () => {
      if (!currentUser?.tenant_id) return [];

      const tenantId = currentUser.tenant_id;

      // Fetch recent contacts (last 10)
      const { data: recentContacts } = await supabase
        .from('contacts')
        .select('name, created_at, created_by')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent tasks completed
      const { data: recentTasks } = await supabase
        .from('tasks')
        .select('title, updated_at, assigned_to')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(10);

      // Fetch recent appointments
      const { data: recentAppointments } = await supabase
        .from('appointments')
        .select('title, created_at, created_by')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Combine and format activities
      const allActivities = [
        ...(recentContacts?.map(c => ({
          action: 'Novo contato adicionado',
          user: c.name,
          time: getRelativeTime(c.created_at),
          timestamp: new Date(c.created_at).getTime()
        })) || []),
        ...(recentTasks?.map(t => ({
          action: 'Tarefa concluída',
          user: t.title,
          time: getRelativeTime(t.updated_at),
          timestamp: new Date(t.updated_at).getTime()
        })) || []),
        ...(recentAppointments?.map(a => ({
          action: 'Compromisso agendado',
          user: a.title,
          time: getRelativeTime(a.created_at),
          timestamp: new Date(a.created_at).getTime()
        })) || [])
      ];

      // Sort by timestamp and take top 5
      return allActivities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
    },
    enabled: !!currentUser?.tenant_id,
    staleTime: 60 * 1000, // 1 minuto
  });

  // Set up real-time subscription with optimized cache updates
  useEffect(() => {
    if (!currentUser?.tenant_id) return;

    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'contacts' },
        (payload) => {
          // Atualizar cache incrementalmente ao invés de refetch total
          queryClient.setQueryData(['recent-activity', currentUser.tenant_id], (old: any[]) => {
            if (!old) return old;
            const newActivity = {
              action: 'Novo contato adicionado',
              user: payload.new.name,
              time: 'há poucos segundos',
              timestamp: Date.now()
            };
            return [newActivity, ...old].slice(0, 5);
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: 'status=eq.completed' },
        (payload) => {
          queryClient.setQueryData(['recent-activity', currentUser.tenant_id], (old: any[]) => {
            if (!old) return old;
            const newActivity = {
              action: 'Tarefa concluída',
              user: payload.new.title,
              time: 'há poucos segundos',
              timestamp: Date.now()
            };
            return [newActivity, ...old].slice(0, 5);
          });
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload) => {
          queryClient.setQueryData(['recent-activity', currentUser.tenant_id], (old: any[]) => {
            if (!old) return old;
            const newActivity = {
              action: 'Compromisso agendado',
              user: payload.new.title,
              time: 'há poucos segundos',
              timestamp: Date.now()
            };
            return [newActivity, ...old].slice(0, 5);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.tenant_id, queryClient]);

  return { activities: activities || [], isLoading };
};

// Helper function to format relative time
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'há poucos segundos';
  if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} minutos`;
  if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} hora${Math.floor(diffInSeconds / 3600) > 1 ? 's' : ''}`;
  return `há ${Math.floor(diffInSeconds / 86400)} dia${Math.floor(diffInSeconds / 86400) > 1 ? 's' : ''}`;
};
