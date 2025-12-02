import { useState } from 'react';
import { useManageUserPermissions } from '@/hooks/useManageUserPermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { User, RefreshCw, Edit, KeyRound, Ban, CheckCircle } from 'lucide-react';
import { CreateUserDialog } from '@/components/CreateUserDialog';
import { EditUserDialog } from '@/components/EditUserDialog';
import { ResetPasswordDialog } from '@/components/ResetPasswordDialog';
import { useToggleUserStatus } from '@/hooks/useToggleUserStatus';
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

const ROLE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  superadmin: { label: 'Super Admin', variant: 'destructive' },
  admin: { label: 'Admin', variant: 'default' },
  supervisor: { label: 'Supervisor', variant: 'secondary' },
  user: { label: 'Usuário', variant: 'outline' },
};

export function UserPermissionsManager() {
  const { usersWithPermissions, isLoading, updatePermission, resetPermissions, availableEntities, currentUserRole } = useManageUserPermissions();
  
  // Check if current user can edit a specific user based on role hierarchy
  const canEditUser = (targetRole: string): boolean => {
    if (currentUserRole === 'superadmin') return true;
    if (currentUserRole === 'admin') return targetRole === 'supervisor' || targetRole === 'user';
    if (currentUserRole === 'supervisor') return targetRole === 'user';
    return false;
  };
  const { toggleStatus, isToggling } = useToggleUserStatus();
  const [expandedUser, setExpandedUser] = useState<string>('');
  const [editingUser, setEditingUser] = useState<{ id: string; email: string; name: string | null; role: string } | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ id: string; email: string; name: string | null } | null>(null);

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

  const handleToggleStatus = (userId: string, currentlyBanned: boolean) => {
    const action = currentlyBanned ? 'ativar' : 'desativar';
    if (confirm(`Tem certeza que deseja ${action} este usuário?`)) {
      toggleStatus({ userId, enable: currentlyBanned });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Gerenciar Permissões de Usuários
              </CardTitle>
              <CardDescription>
                Configure quais funcionalidades cada usuário pode acessar
              </CardDescription>
            </div>
            <CreateUserDialog />
          </div>
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
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.name || user.email}</span>
                          <Badge variant={ROLE_LABELS[user.role]?.variant || 'outline'}>
                            {ROLE_LABELS[user.role]?.label || user.role}
                          </Badge>
                          {user.is_banned && (
                            <Badge variant="destructive">Desativado</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                      <div className="space-y-4 pt-4">
                      {canEditUser(user.role) && (
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser({ id: user.id, email: user.email, name: user.name, role: user.role })}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setResetPasswordUser({ id: user.id, email: user.email, name: user.name })}
                          >
                            <KeyRound className="h-4 w-4 mr-2" />
                            Resetar Senha
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(user.id, user.is_banned)}
                            disabled={isToggling}
                          >
                            {user.is_banned ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4 mr-2" />
                                Desativar
                              </>
                            )}
                          </Button>
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
                      )}
                      
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
                                          disabled={updatePermission.isPending || !canEditUser(user.role)}
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

      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordDialog
          open={!!resetPasswordUser}
          onOpenChange={(open) => !open && setResetPasswordUser(null)}
          user={resetPasswordUser}
        />
      )}
    </div>
  );
}
