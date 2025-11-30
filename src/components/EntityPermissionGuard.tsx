import { Navigate } from 'react-router-dom';
import { useUserEntityPermissions } from '@/hooks/useUserEntityPermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface EntityPermissionGuardProps {
  entity: string;
  action: 'view' | 'create' | 'edit' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function EntityPermissionGuard({ 
  entity, 
  action, 
  children, 
  fallback 
}: EntityPermissionGuardProps) {
  const { hasPermission, isLoading } = useUserEntityPermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  if (!hasPermission(entity, action)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Você não tem permissão para {action === 'view' ? 'visualizar' : action === 'create' ? 'criar' : action === 'edit' ? 'editar' : 'excluir'} este recurso.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
