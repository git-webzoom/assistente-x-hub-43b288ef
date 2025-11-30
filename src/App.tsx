import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, PublicRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import DashboardHome from "./pages/DashboardHome";
import Pipelines from "./pages/Pipelines";
import Contacts from "./pages/Contacts";
import Products from "./pages/Products";
import ProductPage from "./pages/ProductPage";
import Calendar from "./pages/Calendar";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import SuperAdmin from "./pages/SuperAdmin";
import ApiDocumentation from "./pages/ApiDocumentation";
import NotFound from "./pages/NotFound";
import { SuperAdminGuard } from "./components/SuperAdminGuard";
import { TenantMenuGuard } from "./components/TenantMenuGuard";
import { EntityPermissionGuard } from "./components/EntityPermissionGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
              <Route path="/p/:slug" element={<ProductPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
                <Route index element={<DashboardHome />} />
                <Route path="pipelines" element={
                  <TenantMenuGuard menuKey="pipelines">
                    <EntityPermissionGuard entity="pipelines" action="view">
                      <Pipelines />
                    </EntityPermissionGuard>
                  </TenantMenuGuard>
                } />
                <Route path="contacts" element={
                  <TenantMenuGuard menuKey="contacts">
                    <EntityPermissionGuard entity="contacts" action="view">
                      <Contacts />
                    </EntityPermissionGuard>
                  </TenantMenuGuard>
                } />
                <Route path="products" element={
                  <TenantMenuGuard menuKey="products">
                    <EntityPermissionGuard entity="products" action="view">
                      <Products />
                    </EntityPermissionGuard>
                  </TenantMenuGuard>
                } />
                <Route path="calendar" element={
                  <TenantMenuGuard menuKey="calendar">
                    <EntityPermissionGuard entity="calendar" action="view">
                      <Calendar />
                    </EntityPermissionGuard>
                  </TenantMenuGuard>
                } />
                <Route path="tasks" element={
                  <TenantMenuGuard menuKey="tasks">
                    <EntityPermissionGuard entity="tasks" action="view">
                      <Tasks />
                    </EntityPermissionGuard>
                  </TenantMenuGuard>
                } />
                <Route path="api-docs" element={<ApiDocumentation />} />
                <Route path="settings" element={<Settings />} />
                <Route path="superadmin" element={<SuperAdminGuard><SuperAdmin /></SuperAdminGuard>} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
