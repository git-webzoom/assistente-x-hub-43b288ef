import { useState } from 'react';
import { useManageUserPermissions } from '@/hooks/useManageUserPermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { User, RefreshCw } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const ENTITY_LABELS: Record<string, string> = {
  contacts: 'Contatos',
  products: 'Produtos',
  pipelines: 'Funis',
  tasks: 'Tarefas',
  calendar: 'Agenda',
  settings: 'Configurações',
};

const ACTION_LABELS: Record<string, string> = {
  can_view: 'Visualizar',
  can_create: 'Criar',
  can_edit: 'Editar',
  can_delete: 'Excluir',
};

export function UserPermissionsManager() {
  const { usersWithPermissions, isLoading, updatePermission, resetPermissions, availableEntities } = useManageUserPermissions();
  const [expandedUser, setExpandedUser] = useState<string>('');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const handlePermissionChange = (
    userId: string,
    entityKey: string,
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    checked: boolean
  ) => {
    const user = usersWithPermissions.find(u => u.id === userId);
    const existingPerm = user?.permissions.find(p => p.entity_key === entityKey);

    const newPermissions = {
      can_view: existingPerm?.can_view ?? true,
      can_create: existingPerm?.can_create ?? true,
      can_edit: existingPerm?.can_edit ?? true,
      can_delete: existingPerm?.can_delete ?? true,
      [action]: checked,
    };

    updatePermission.mutate({ userId, entityKey, permissions: newPermissions });
  };

  const handleResetUser = (userId: string) => {
    if (confirm('Tem certeza que deseja resetar todas as permissões deste usuário? Ele terá acesso total novamente.')) {
      resetPermissions.mutate(userId);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Gerenciar Permissões de Usuários
          </CardTitle>
          <CardDescription>
            Configure quais funcionalidades cada usuário pode acessar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersWithPermissions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum usuário encontrado.</p>
          ) : (
            <Accordion type="single" collapsible value={expandedUser} onValueChange={setExpandedUser}>
              {usersWithPermissions.map((user) => (
                <AccordionItem key={user.id} value={user.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{user.full_name || user.email}</span>
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetUser(user.id)}
                          disabled={resetPermissions.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Resetar Permissões
                        </Button>
                      </div>
                      
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3 font-medium">Funcionalidade</th>
                              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                                <th key={key} className="text-center p-3 font-medium">{label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {availableEntities.map((entityKey) => {
                              const permission = user.permissions.find(p => p.entity_key === entityKey);
                              
                              return (
                                <tr key={entityKey} className="border-t">
                                  <td className="p-3 font-medium">{ENTITY_LABELS[entityKey] || entityKey}</td>
                                  {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map((action) => (
                                    <td key={action} className="p-3 text-center">
                                      <div className="flex justify-center">
                                        <Checkbox
                                          checked={permission?.[action] ?? true}
                                          onCheckedChange={(checked) => 
                                            handlePermissionChange(user.id, entityKey, action, checked as boolean)
                                          }
                                          disabled={updatePermission.isPending}
                                        />
                                      </div>
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
