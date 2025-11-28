import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Users, Kanban, CheckSquare, Calendar, Package, Settings } from 'lucide-react';

interface MenuOption {
  key: string;
  label: string;
  icon: any;
}

const AVAILABLE_MENUS: MenuOption[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'contacts', label: 'Contatos', icon: Users },
  { key: 'pipelines', label: 'Pipelines', icon: Kanban },
  { key: 'tasks', label: 'Tarefas', icon: CheckSquare },
  { key: 'calendar', label: 'Calendário', icon: Calendar },
  { key: 'products', label: 'Produtos', icon: Package },
  { key: 'settings', label: 'Configurações', icon: Settings },
];

interface TenantMenuSettingsProps {
  value: any;
  onChange: (value: any) => void;
}

export function TenantMenuSettings({ value, onChange }: TenantMenuSettingsProps) {
  const currentSettings = value || {};
  const enabledMenus = currentSettings.enabled_menus || AVAILABLE_MENUS.map(m => m.key);

  const handleToggle = (menuKey: string) => {
    const newEnabledMenus = enabledMenus.includes(menuKey)
      ? enabledMenus.filter((k: string) => k !== menuKey)
      : [...enabledMenus, menuKey];

    onChange({
      ...currentSettings,
      enabled_menus: newEnabledMenus,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menus Disponíveis</CardTitle>
        <CardDescription>
          Selecione quais menus estarão disponíveis para este tenant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {AVAILABLE_MENUS.map((menu) => {
          const Icon = menu.icon;
          const isEnabled = enabledMenus.includes(menu.key);

          return (
            <div key={menu.key} className="flex items-center space-x-3">
              <Checkbox
                id={`menu-${menu.key}`}
                checked={isEnabled}
                onCheckedChange={() => handleToggle(menu.key)}
              />
              <Label
                htmlFor={`menu-${menu.key}`}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Icon className="h-4 w-4" />
                {menu.label}
              </Label>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
