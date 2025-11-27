import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { role, loading, isSuperAdmin } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-2xl p-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Acesso negado. Esta página é restrita a Super Administradores.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
