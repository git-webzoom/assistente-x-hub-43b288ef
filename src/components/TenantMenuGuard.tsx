import { Navigate } from 'react-router-dom';
import { useTenantMenuAccess } from '@/hooks/useTenantMenuAccess';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface TenantMenuGuardProps {
  menuKey: string;
  children: React.ReactNode;
}

export function TenantMenuGuard({ menuKey, children }: TenantMenuGuardProps) {
  const { isMenuEnabled, isLoading } = useTenantMenuAccess();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-2xl p-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isMenuEnabled(menuKey)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Esta funcionalidade não está disponível para sua organização. Entre em contato com o administrador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
