import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useTenants } from '@/hooks/useTenants';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Shield, Settings, Users, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SuperAdmin() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Super Admin</h1>
          <p className="text-muted-foreground mt-1">
            Gerenciamento global do sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="tenants">
            <Users className="h-4 w-4 mr-2" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4 mr-2" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <SystemSettingsSection />
        </TabsContent>

        <TabsContent value="tenants">
          <TenantsSection />
        </TabsContent>

        <TabsContent value="audit">
          <AuditSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SystemSettingsSection() {
  const { settings, isLoading, updateSetting } = useSystemSettings();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const handleSave = (key: string) => {
    const value = editedValues[key];
    if (value !== undefined) {
      updateSetting({ key, value });
      setEditedValues(prev => {
        const newValues = { ...prev };
        delete newValues[key];
        return newValues;
      });
    }
  };

  if (isLoading) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Globais do Sistema</CardTitle>
          <CardDescription>
            Gerencie URLs, chaves e configurações gerais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings.map((setting) => (
            <div key={setting.id} className="space-y-2">
              <Label htmlFor={setting.key}>{setting.key}</Label>
              {setting.description && (
                <p className="text-sm text-muted-foreground">{setting.description}</p>
              )}
              <div className="flex gap-2">
                <Input
                  id={setting.key}
                  defaultValue={setting.value}
                  onChange={(e) => setEditedValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSave(setting.key)}
                  disabled={editedValues[setting.key] === undefined}
                >
                  Salvar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TenantsSection() {
  const { tenants, isLoading, updateTenant } = useTenants();
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  if (isLoading) {
    return <div>Carregando tenants...</div>;
  }

  if (selectedTenant) {
    const tenant = tenants.find(t => t.id === selectedTenant);
    if (tenant) {
      return <TenantDetail tenant={tenant} onBack={() => setSelectedTenant(null)} />;
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Tenants</CardTitle>
          <CardDescription>
            Lista de todos os clientes/organizações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{tenant.name}</h3>
                    <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                      {tenant.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ID: {tenant.id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Criado em: {format(new Date(tenant.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>
                <Button onClick={() => setSelectedTenant(tenant.id)}>
                  Gerenciar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TenantDetail({ tenant, onBack }: { tenant: any; onBack: () => void }) {
  const { updateTenant } = useTenants();
  const { logs } = useAuditLog(tenant.id);
  const [isActive, setIsActive] = useState(tenant.is_active);

  const handleToggleActive = () => {
    const newValue = !isActive;
    setIsActive(newValue);
    updateTenant({ id: tenant.id, is_active: newValue });
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack}>
        ← Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{tenant.name}</CardTitle>
          <CardDescription>Gerenciamento individual do tenant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="active">Status do Tenant</Label>
              <p className="text-sm text-muted-foreground">
                {isActive ? 'Tenant ativo no sistema' : 'Tenant desativado'}
              </p>
            </div>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={handleToggleActive}
            />
          </div>

          <div className="space-y-2">
            <Label>Configurações Personalizadas</Label>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-auto">
              {JSON.stringify(tenant.custom_config || {}, null, 2)}
            </pre>
          </div>

          <div className="space-y-2">
            <Label>Configurações de Menu</Label>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-auto">
              {JSON.stringify(tenant.menu_settings || {}, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Auditoria</CardTitle>
          <CardDescription>Últimas 100 alterações deste tenant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-3 border rounded-lg text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline">{log.action}</Badge>
                    <span className="text-muted-foreground">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    Tabela: {log.table_name} | ID: {log.record_id}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditSection() {
  const { logs, isLoading } = useAuditLog();

  if (isLoading) {
    return <div>Carregando logs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log de Auditoria Global</CardTitle>
        <CardDescription>Últimas 100 ações no sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-3 border rounded-lg text-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{log.action}</Badge>
                    <span className="text-muted-foreground">{log.table_name}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  Tenant: {log.tenant_id || 'N/A'} | Record: {log.record_id}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
