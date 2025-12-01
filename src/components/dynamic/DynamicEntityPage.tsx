import { useEntityContext } from '@/contexts/EntityContext';
import { ContactsView } from '@/components/views/ContactsView';
import Products from '@/pages/Products';
import Tasks from '@/pages/Tasks';
import Calendar from '@/pages/Calendar';
import Pipelines from '@/pages/Pipelines';

export function DynamicEntityPage() {
  const route = useEntityContext();

  // Renderizar componente baseado no entity_type
  switch (route.entity_type) {
    case 'contacts':
      return <ContactsView />;
    case 'products':
      return <Products />;
    case 'tasks':
      return <Tasks />;
    case 'calendar':
      return <Calendar />;
    case 'pipelines':
      return <Pipelines />;
    default:
      return (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Tipo de entidade desconhecido</h2>
          <p className="text-muted-foreground">
            O tipo "{route.entity_type}" não está implementado ainda.
          </p>
        </div>
      );
  }
}
