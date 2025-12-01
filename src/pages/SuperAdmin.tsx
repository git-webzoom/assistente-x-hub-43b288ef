import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useTenants } from '@/hooks/useTenants';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useApiConfig } from '@/hooks/useApiConfig';
import { useCreateTenant } from '@/hooks/useCreateTenant';
import { SearchInput } from '@/components/SearchInput';
import { TenantMenuSettings } from '@/components/TenantMenuSettings';
import { JsonEditor } from '@/components/JsonEditor';
import { Shield, Settings, Users, History, CheckCircle2, XCircle, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

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
          <TabsTrigger value="create-tenant">
            <Plus className="h-4 w-4 mr-2" />
            Criar Tenant
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

        <TabsContent value="create-tenant">
          <CreateTenantSection />
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
  const { invalidateApiConfig } = useApiConfig();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSave = (key: string) => {
    const value = editedValues[key];
    if (value !== undefined) {
      updateSetting({ key, value });
      setEditedValues(prev => {
        const newValues = { ...prev };
        delete newValues[key];
        return newValues;
      });
      
      // Invalidar cache da API config se for a URL base
      if (key === 'API_BASE_URL') {
        invalidateApiConfig();
      }
    }
  };

  const testConnection = async () => {
    const apiUrl = editedValues['API_BASE_URL'] || settings.find(s => s.key === 'API_BASE_URL')?.value;
    
    if (!apiUrl) {
      toast({
        title: 'Erro',
        description: 'URL base não configurada',
        variant: 'destructive',
      });
      return;
    }

    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const response = await fetch(`${apiUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (response.ok) {
        setConnectionResult({ success: true, message: 'Conexão bem-sucedida!' });
      } else {
        setConnectionResult({ success: false, message: `Erro: HTTP ${response.status}` });
      }
    } catch (err) {
      setConnectionResult({ 
        success: false, 
        message: err instanceof Error ? err.message : 'Erro ao conectar' 
      });
    } finally {
      setTestingConnection(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
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
                {setting.key === 'API_BASE_URL' && (
                  <Button
                    variant="outline"
                    onClick={testConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Testar'
                    )}
                  </Button>
                )}
                <Button
                  onClick={() => handleSave(setting.key)}
                  disabled={editedValues[setting.key] === undefined}
                >
                  Salvar
                </Button>
              </div>
            </div>
          ))}

          {connectionResult && (
            <Alert variant={connectionResult.success ? 'default' : 'destructive'}>
              {connectionResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{connectionResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TenantsSection() {
  const { tenants, isLoading, updateTenant } = useTenants();
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (selectedTenant) {
    const tenant = tenants.find(t => t.id === selectedTenant);
    if (tenant) {
      return <TenantDetail tenant={tenant} onBack={() => setSelectedTenant(null)} />;
    }
  }

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar por nome ou ID do tenant..."
      />

      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Tenants</CardTitle>
          <CardDescription>
            {filteredTenants.length} tenant(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTenants.map((tenant) => (
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
  const [name, setName] = useState(tenant.name);
  const [menuSettings, setMenuSettings] = useState(tenant.menu_settings || {});
  const [customConfig, setCustomConfig] = useState(tenant.custom_config || {});
  const [saving, setSaving] = useState(false);

  const handleToggleActive = () => {
    const newValue = !isActive;
    setIsActive(newValue);
    updateTenant({ id: tenant.id, is_active: newValue });
  };

  const handleSaveName = () => {
    if (name.trim() && name !== tenant.name) {
      updateTenant({ id: tenant.id, name: name.trim() });
    }
  };

  const handleSaveMenuSettings = () => {
    setSaving(true);
    updateTenant({ id: tenant.id, menu_settings: menuSettings });
    setTimeout(() => setSaving(false), 500);
  };

  const handleSaveCustomConfig = () => {
    setSaving(true);
    updateTenant({ id: tenant.id, custom_config: customConfig });
    setTimeout(() => setSaving(false), 500);
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        ← Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>Dados principais do tenant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Nome do Tenant</Label>
            <div className="flex gap-2">
              <Input
                id="tenant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSaveName}
                disabled={!name.trim() || name === tenant.name}
              >
                Salvar
              </Button>
            </div>
          </div>

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
            <Label>ID do Tenant</Label>
            <Input value={tenant.id} disabled className="font-mono text-sm" />
          </div>

          <div className="space-y-2">
            <Label>Criado em</Label>
            <Input
              value={format(new Date(tenant.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <TenantMenuSettings
          value={menuSettings}
          onChange={setMenuSettings}
        />
        <Button onClick={handleSaveMenuSettings} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Salvar Configurações de Menu
        </Button>
      </div>

      <div className="space-y-4">
        <JsonEditor
          value={customConfig}
          onChange={setCustomConfig}
          title="Configurações Personalizadas"
          description="Configurações customizadas em formato JSON para este tenant"
        />
        <Button onClick={handleSaveCustomConfig} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Salvar Configurações Personalizadas
        </Button>
      </div>

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

function CreateTenantSection() {
  const { createTenant, isCreating } = useCreateTenant();
  const [formData, setFormData] = useState({
    tenantName: '',
    adminEmail: '',
    adminName: '',
    adminPassword: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tenantName.trim() || !formData.adminEmail.trim() || !formData.adminPassword.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    if (formData.adminPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    createTenant(formData);
    
    // Reset form on success
    setFormData({
      tenantName: '',
      adminEmail: '',
      adminName: '',
      adminPassword: '',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Novo Tenant com Admin</CardTitle>
        <CardDescription>
          Crie um novo tenant e seu usuário administrador em uma única operação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantName">Nome do Tenant *</Label>
            <Input
              id="tenantName"
              value={formData.tenantName}
              onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
              placeholder="Empresa X"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email do Admin *</Label>
            <Input
              id="adminEmail"
              type="email"
              value={formData.adminEmail}
              onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
              placeholder="admin@empresa.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminName">Nome do Admin</Label>
            <Input
              id="adminName"
              value={formData.adminName}
              onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
              placeholder="João Silva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminPassword">Senha do Admin *</Label>
            <Input
              id="adminPassword"
              type="password"
              value={formData.adminPassword}
              onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Criar Tenant com Admin
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
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
