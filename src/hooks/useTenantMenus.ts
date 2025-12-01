import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useCurrentUser } from './useCurrentUser';
import { useUserEntityPermissions } from './useUserEntityPermissions';

export interface MenuItem {
  key: string;
  icon: string;
  label: string;
  path: string;
}

const ALL_MENUS: MenuItem[] = [
  { key: 'dashboard', icon: 'LayoutDashboard', label: 'Dashboard', path: '/dashboard' },
  { key: 'contacts', icon: 'Users', label: 'Contatos', path: '/dashboard/contacts' },
  { key: 'products', icon: 'Package', label: 'Produtos', path: '/dashboard/products' },
  { key: 'pipelines', icon: 'Kanban', label: 'Funis', path: '/dashboard/pipelines' },
  { key: 'calendar', icon: 'Calendar', label: 'Agenda', path: '/dashboard/calendar' },
  { key: 'tasks', icon: 'CheckSquare', label: 'Tarefas', path: '/dashboard/tasks' },
  { key: 'settings', icon: 'Settings', label: 'Configurações', path: '/dashboard/settings' },
];

export function useTenantMenus() {
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();
  const { hasPermission, isLoading: permissionsLoading } = useUserEntityPermissions();

  const { data: allowedMenus, isLoading: menusLoading } = useQuery({
    queryKey: ['tenant-menus', currentUser?.tenant_id],
    queryFn: async () => {
      if (!currentUser?.tenant_id) return ALL_MENUS.map(m => m.key);

      // Buscar as configurações de menu do tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('menu_settings')
        .eq('id', currentUser.tenant_id)
        .maybeSingle();

      if (tenantError) {
        console.error('Error fetching tenant menu settings:', tenantError);
        return ALL_MENUS.map(m => m.key);
      }

      // Se não houver configurações ou não houver enabled_menus, retornar todos
      const menuSettings = tenantData?.menu_settings || {};
      const enabledMenus = menuSettings.enabled_menus;

      if (!enabledMenus || !Array.isArray(enabledMenus)) {
        return ALL_MENUS.map(m => m.key);
      }

      return enabledMenus;
    },
    enabled: !!currentUser?.tenant_id,
    staleTime: 10 * 60 * 1000, // 10 minutos - configurações de menu mudam raramente
  });

  const getEnabledMenus = () => {
    if (!allowedMenus) return ALL_MENUS;
    
    // Filtrar menus baseado nas configurações do tenant E nas permissões do usuário
    return ALL_MENUS.filter(menu => {
      // Verificar se o menu está habilitado no tenant
      if (!allowedMenus.includes(menu.key)) return false;
      
      // Dashboard e settings sempre visíveis se habilitados no tenant
      if (menu.key === 'dashboard' || menu.key === 'settings') return true;
      
      // Para outros menus, verificar permissão de visualização da entidade
      return hasPermission(menu.key, 'view');
    });
  };

  return {
    enabledMenus: getEnabledMenus(),
    isLoading: menusLoading || permissionsLoading,
    allMenus: ALL_MENUS,
  };
}
