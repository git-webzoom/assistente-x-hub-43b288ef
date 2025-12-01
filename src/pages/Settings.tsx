import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomFieldSettings from './settings/CustomFieldSettings';
import WebhookSettings from './settings/WebhookSettings';
import ApiKeySettings from './settings/ApiKeySettings';
import TagSettings from './settings/TagSettings';
import UserSettings from './settings/UserSettings';
import CategorySettings from './settings/CategorySettings';
import { useUserRole } from '@/hooks/useUserRole';

export default function Settings() {
  const { role } = useUserRole();
  const isAdmin = role === 'admin' || role === 'superadmin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as configurações do seu sistema
        </p>
      </div>

      <Tabs defaultValue="custom-fields" className="space-y-6">
        <TabsList>
          <TabsTrigger value="custom-fields">Campos Personalizados</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Usuários</TabsTrigger>}
        </TabsList>

        <TabsContent value="custom-fields">
          <CustomFieldSettings />
        </TabsContent>

        <TabsContent value="tags">
          <TagSettings />
        </TabsContent>

        <TabsContent value="categories">
          <CategorySettings />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhookSettings />
        </TabsContent>

        <TabsContent value="api">
          <ApiKeySettings />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <UserSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
