import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

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

  const { data: allowedMenus, isLoading } = useQuery({
    queryKey: ['tenant-menus', user?.id],
    queryFn: async () => {
      if (!user) return ALL_MENUS.map(m => m.key);

      // Buscar o tenant_id do usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .maybeSingle();

      if (userError || !userData?.tenant_id) {
        console.error('Error fetching user tenant:', userError);
        return ALL_MENUS.map(m => m.key);
      }

      // Buscar as configurações de menu do tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('menu_settings')
        .eq('id', userData.tenant_id)
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
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });

  const getEnabledMenus = () => {
    if (!allowedMenus) return ALL_MENUS;
    return ALL_MENUS.filter(menu => allowedMenus.includes(menu.key));
  };

  return {
    enabledMenus: getEnabledMenus(),
    isLoading,
    allMenus: ALL_MENUS,
  };
}
