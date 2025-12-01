import { useParams, Navigate } from 'react-router-dom';
import { useEntityRoutes } from '@/hooks/useEntityRoutes';
import { EntityProvider } from '@/contexts/EntityContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface DynamicEntityGuardProps {
  children: React.ReactNode;
}

export function DynamicEntityGuard({ children }: DynamicEntityGuardProps) {
  const { entitySlug } = useParams<{ entitySlug: string }>();
  const { routes, isLoading } = useEntityRoutes();

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

  // Encontrar a rota pelo slug
  const route = routes.find(r => r.slug === entitySlug);

  // Se a rota não existe, redirecionar para 404
  if (!route) {
    return <Navigate to="/404" replace />;
  }

  // Fornecer contexto da rota para componentes filhos
  return (
    <EntityProvider value={route}>
      {children}
    </EntityProvider>
  );
}
