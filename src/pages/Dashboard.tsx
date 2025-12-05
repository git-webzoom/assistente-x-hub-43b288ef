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
  Menu,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useTenantMenus } from "@/hooks/useTenantMenus";
import { ThemeToggle } from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import { GlobalSearchDialog } from "@/components/GlobalSearchDialog";
import { UserProfileMenu } from "@/components/UserProfileMenu";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

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
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Adicionar Super Admin ao final se o usuário for superadmin
  const menuItems = isSuperAdmin 
    ? [...enabledMenus, { key: 'superadmin', icon: 'Shield', label: "Super Admin", path: "/dashboard/superadmin" }]
    : enabledMenus;

  const SidebarContent = () => (
    <>
      <div className="p-4 md:p-6 border-b border-sidebar-border">
        <Link to="/" className="w-full flex justify-center" onClick={() => setSidebarOpen(false)}>
          <BrandLogo className="w-[140px] md:w-[160px]" />
        </Link>
      </div>

      <nav className="flex-1 p-3 md:p-4 space-y-1">
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
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-colors ${
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

      <div className="p-3 md:p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={() => {
            setSidebarOpen(false);
            signOut();
          }}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
          <SidebarContent />
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 md:h-16 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Menu Button */}
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0 bg-sidebar">
                  <div className="flex flex-col h-full">
                    <SidebarContent />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            
            {/* Mobile Logo */}
            {isMobile && (
              <Link to="/" className="flex items-center">
                <BrandLogo className="w-[100px]" />
              </Link>
            )}
            
            {/* Global Search - hidden on mobile, shown in header on desktop */}
            {!isMobile && <GlobalSearchDialog />}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Global Search Button for Mobile */}
            {isMobile && <GlobalSearchDialog />}
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
              <Bell className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
            <UserProfileMenu />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;