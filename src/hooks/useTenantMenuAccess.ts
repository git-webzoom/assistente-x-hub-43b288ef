import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export const useTenantMenuAccess = () => {
  const { user } = useAuth();

  const { data: enabledMenus, isLoading } = useQuery({
    queryKey: ['tenant-menu-access', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get user's tenant
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error('Tenant not found');

      // Get tenant menu settings
      const { data: tenantData, error } = await supabase
        .from('tenants')
        .select('menu_settings')
        .eq('id', userData.tenant_id)
        .single();

      if (error) throw error;

      const menuSettings = tenantData?.menu_settings as { enabled_menus?: string[] } | null;
      return menuSettings?.enabled_menus || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isMenuEnabled = (menuKey: string) => {
    // Se não houver configuração, assume que está habilitado (compatibilidade)
    if (!enabledMenus || enabledMenus.length === 0) return true;
    
    return enabledMenus.includes(menuKey);
  };

  return {
    enabledMenus: enabledMenus || [],
    isLoading,
    isMenuEnabled,
  };
};
