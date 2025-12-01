import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';

export const useDashboardStats = () => {
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats', currentUser?.tenant_id],
    queryFn: async () => {
      if (!currentUser?.tenant_id) throw new Error('Tenant not found');

      const tenantId = currentUser.tenant_id;

      // Fetch all stats in parallel
      const [contactsCount, tasksCount, pipelineData] = await Promise.all([
        // Count active contacts
        supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),

        // Count pending tasks
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'pending'),

        // Get pipeline data for conversion rate
        supabase
          .from('cards')
          .select('stage_id, stages!inner(name)')
          .eq('tenant_id', tenantId)
      ]);

      // Get upcoming appointments separately with fallback
      const now = new Date().toISOString();
      
      // Try with join first
      let appointmentsToday = await supabase
        .from('appointments')
        .select('*, contact:contacts(name)')
        .eq('tenant_id', tenantId)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(10);

      // If join fails, try without join
      if (appointmentsToday.error) {
        appointmentsToday = await supabase
          .from('appointments')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('start_time', now)
          .order('start_time', { ascending: true })
          .limit(10);
      }

      // Calculate conversion rate (cards in final stage / total cards)
      const totalCards = pipelineData.data?.length || 0;
      const wonCards = pipelineData.data?.filter((card: any) => {
        const stageName = card.stages?.name?.toLowerCase() || '';
        return stageName.includes('ganho') || stageName.includes('fechado');
      }).length || 0;
      
      const conversionRate = totalCards > 0 ? (wonCards / totalCards) * 100 : 0;

      return {
        contactsCount: contactsCount.count || 0,
        tasksCount: tasksCount.count || 0,
        appointmentsCount: appointmentsToday.data?.length || 0,
        conversionRate: conversionRate.toFixed(1),
        appointments: appointmentsToday.data || []
      };
    },
    enabled: !!currentUser?.tenant_id,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000, // 20 segundos - dados de dashboard devem ser relativamente frescos
  });

  return { stats, isLoading, error };
};
