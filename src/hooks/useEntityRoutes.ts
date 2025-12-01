import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from './useCurrentUser';
import { useUserEntityPermissions } from './useUserEntityPermissions';
import { useTenantMenus } from './useTenantMenus';

export interface EntityRoute {
  id: string;
  key: string;
  slug: string;
  label: string;
  icon: string;
  entity_type: string;
  is_active: boolean;
  order_index: number;
  config: Record<string, any>;
}

export function useEntityRoutes() {
  const { currentUser } = useCurrentUser();
  const { hasPermission } = useUserEntityPermissions();
  const { enabledMenus } = useTenantMenus();

  const { data: routes, isLoading } = useQuery({
    queryKey: ['entity-routes', currentUser?.tenant_id],
    queryFn: async () => {
      if (!currentUser?.tenant_id) return [];

      // Buscar rotas do tenant ou globais (tenant_id IS NULL)
      const { data, error } = await supabase
        .from('entity_routes')
        .select('*')
        .or(`tenant_id.is.null,tenant_id.eq.${currentUser.tenant_id}`)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;

      // Filtrar rotas baseado em:
      // 1. Tenant menu settings (enabledMenus)
      // 2. User entity permissions
      const filteredRoutes = (data as EntityRoute[]).filter((route) => {
        // Verificar se o menu está habilitado no tenant
        const isMenuEnabled = enabledMenus.some(menu => menu.key === route.key);
        if (!isMenuEnabled) return false;

        // Verificar se o usuário tem permissão de view para esta entidade
        return hasPermission(route.key, 'view');
      });

      return filteredRoutes;
    },
    enabled: !!currentUser?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    routes: routes || [],
    isLoading,
  };
}
