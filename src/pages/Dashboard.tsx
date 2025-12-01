import { Button } from "@/components/ui/button";
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
  Shield,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useTenantMenus } from "@/hooks/useTenantMenus";
import { ThemeToggle } from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import { GlobalSearchDialog } from "@/components/GlobalSearchDialog";
import { UserProfileMenu } from "@/components/UserProfileMenu";

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
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { enabledMenus, isLoading: menusLoading } = useTenantMenus();

  // Adicionar Super Admin ao final se o usuário for superadmin
  const menuItems = isSuperAdmin 
    ? [...enabledMenus, { key: 'superadmin', icon: 'Shield', label: "Super Admin", path: "/dashboard/superadmin" }]
    : enabledMenus;

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
          {menusLoading ? (
            <div className="text-sidebar-foreground text-sm px-4 py-3">Carregando menus...</div>
          ) : (
            menuItems.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  {Icon && <Icon className="w-5 h-5" />}
                  <span className="font-medium">{item.label}</span>
                </Link>
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
          <GlobalSearchDialog />

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <UserProfileMenu />
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