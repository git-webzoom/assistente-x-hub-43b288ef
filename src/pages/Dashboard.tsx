import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  LayoutDashboard,
  Users,
  Package,
  Kanban,
  Calendar,
  CheckSquare,
  Settings,
  LogOut,
  Bell,
  Search,
  BookOpen,
  Shield,
} from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useEntityRoutes } from "@/hooks/useEntityRoutes";
import { ThemeToggle } from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import { NavLink } from "@/components/NavLink";

// Mapeamento de ícones
const iconMap: Record<string, any> = {
  LayoutDashboard,
  Users,
  Package,
  Kanban,
  Calendar,
  CheckSquare,
  Settings,
  Shield,
};

const Dashboard = () => {
  const { signOut } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { routes, isLoading: routesLoading } = useEntityRoutes();

  // Menus fixos que sempre aparecem
  const fixedMenus = [
    { key: 'home', icon: 'LayoutDashboard', label: 'Dashboard', path: '/dashboard' },
  ];

  // Menus dinâmicos das entidades
  const entityMenus = routes.map(route => ({
    key: route.key,
    icon: route.icon,
    label: route.label,
    path: `/dashboard/${route.slug}`,
  }));

  // Menus de configuração
  const settingsMenus = [
    { key: 'settings', icon: 'Settings', label: 'Configurações', path: '/dashboard/settings' },
  ];

  // Menu Super Admin (apenas para superadmins)
  const adminMenus = isSuperAdmin 
    ? [{ key: 'superadmin', icon: 'Shield', label: 'Super Admin', path: '/dashboard/superadmin' }]
    : [];

  // Combinar todos os menus
  const menuItems = [...fixedMenus, ...entityMenus, ...settingsMenus, ...adminMenus];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="w-full flex justify-center">
            <BrandLogo className="w-[160px]" />
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {routesLoading ? (
            <div className="text-sidebar-foreground text-sm px-4 py-3">Carregando menus...</div>
          ) : (
            menuItems.map((item) => {
              const Icon = iconMap[item.icon];
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                >
                  {Icon && <Icon className="w-5 h-5" />}
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              );
            })
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={signOut}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar contatos, cards, tarefas..."
              className="border-0 focus-visible:ring-0"
            />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-hero" />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;