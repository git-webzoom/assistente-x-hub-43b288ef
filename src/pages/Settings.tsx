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
  const canManageUsers = role === 'admin' || role === 'superadmin' || role === 'supervisor';

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Gerencie as configurações do seu sistema
        </p>
      </div>

      <Tabs defaultValue="custom-fields" className="space-y-4 md:space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max min-w-full md:w-auto md:min-w-0">
            <TabsTrigger value="custom-fields" className="text-xs md:text-sm whitespace-nowrap">
              Campos Personalizados
            </TabsTrigger>
            <TabsTrigger value="tags" className="text-xs md:text-sm whitespace-nowrap">
              Tags
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs md:text-sm whitespace-nowrap">
              Categorias
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs md:text-sm whitespace-nowrap">
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="api" className="text-xs md:text-sm whitespace-nowrap">
              API
            </TabsTrigger>
            {canManageUsers && (
              <TabsTrigger value="users" className="text-xs md:text-sm whitespace-nowrap">
                Usuários
              </TabsTrigger>
            )}
          </TabsList>
        </div>

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

        {canManageUsers && (
          <TabsContent value="users">
            <UserSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}