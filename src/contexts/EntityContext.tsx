import { createContext, useContext } from 'react';

export interface EntityRoute {
  id: string;
  key: string;
  slug: string;
  label: string;
  icon: string;
  entity_type: string;
  is_active: boolean;
  order_index: number;
  config: Record<string, any>;
}

const EntityContext = createContext<EntityRoute | null>(null);

export const EntityProvider = EntityContext.Provider;

export function useEntityContext() {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntityContext must be used within EntityProvider');
  }
  return context;
}
