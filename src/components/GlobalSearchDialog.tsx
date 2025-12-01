import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { Users, Kanban, CheckSquare, Package } from 'lucide-react';

const typeConfig = {
  contact: { label: 'Contatos', icon: Users },
  card: { label: 'Cards', icon: Kanban },
  task: { label: 'Tarefas', icon: CheckSquare },
  product: { label: 'Produtos', icon: Package },
};

export function GlobalSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { groupedResults, isLoading } = useGlobalSearch(query);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
    setQuery('');
  };

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 flex-1 max-w-xl cursor-text"
      >
        <input
          type="text"
          placeholder="Buscar... (Ctrl+K)"
          className="flex h-10 w-full rounded-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          readOnly
        />
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar contatos, cards, tarefas, produtos..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isLoading ? 'Buscando...' : 'Nenhum resultado encontrado.'}
          </CommandEmpty>

          {Object.entries(groupedResults).map(([type, items]) => {
            const config = typeConfig[type as keyof typeof typeConfig];
            const Icon = config.icon;

            return (
              <CommandGroup key={type} heading={config.label}>
                {items.map((item) => (
                  <CommandItem
                    key={`${item.type}-${item.id}`}
                    onSelect={() => handleSelect(item.path)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{item.title}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
