import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { Users, Kanban, CheckSquare, Package, Search } from 'lucide-react';

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
  const { groupedResults, isLoading, isDebouncing } = useGlobalSearch(query);

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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setQuery('');
    }
  };

  const showLoading = isLoading || isDebouncing;
  const hasResults = Object.keys(groupedResults).length > 0;

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 flex-1 max-w-xl cursor-text"
      >
        <input
          type="text"
          placeholder="Busca geral (Ctrl+K)"
          className="flex h-10 w-full rounded-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          readOnly
        />
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="overflow-hidden p-0 shadow-lg max-w-lg">
          <Command shouldFilter={false} className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Buscar contatos, cards, tarefas, produtos..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
              {!hasResults && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {showLoading ? 'Buscando...' : query.trim() ? 'Nenhum resultado encontrado.' : 'Digite para buscar...'}
                </div>
              )}

              {Object.entries(groupedResults).map(([type, items]) => {
                const config = typeConfig[type as keyof typeof typeConfig];
                const Icon = config.icon;

                return (
                  <Command.Group key={type} heading={config.label} className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
                    {items.map((item) => (
                      <Command.Item
                        key={`${item.type}-${item.id}`}
                        onSelect={() => handleSelect(item.path)}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground hover:bg-accent"
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{item.title}</span>
                          {item.subtitle && (
                            <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
