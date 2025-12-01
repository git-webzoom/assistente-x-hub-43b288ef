import { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CategoryDialog } from './CategoryDialog';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
}

export const CategorySelector = ({ selectedCategoryIds, onChange }: CategorySelectorProps) => {
  const { categories, createCategory } = useCategories();
  const [open, setOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const selectedCategories = categories.filter(cat => 
    selectedCategoryIds.includes(cat.id)
  );

  const toggleCategory = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onChange(selectedCategoryIds.filter(id => id !== categoryId));
    } else {
      onChange([...selectedCategoryIds, categoryId]);
    }
  };

  const removeCategory = (categoryId: string) => {
    onChange(selectedCategoryIds.filter(id => id !== categoryId));
  };

  const handleCreateCategory = async (data: { name: string; description?: string; color?: string }) => {
    await createCategory.mutateAsync(data);
    setCategoryDialogOpen(false);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedCategories.length === 0 ? (
              <span className="text-muted-foreground">Selecione categorias...</span>
            ) : (
              <span>{selectedCategories.length} categoria(s) selecionada(s)</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar categoria..." />
            <CommandList>
              <CommandEmpty>
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhuma categoria encontrada
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCategoryDialogOpen(true);
                      setOpen(false);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar categoria
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {categories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.name}
                    onSelect={() => toggleCategory(category.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCategoryIds.includes(category.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Badge
                      className="text-white mr-2"
                      style={{ backgroundColor: category.color || '#64748b' }}
                    >
                      {category.name}
                    </Badge>
                    {category.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {category.description}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setCategoryDialogOpen(true);
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar nova categoria
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map((category) => (
            <Badge
              key={category.id}
              className="text-white cursor-pointer"
              style={{ backgroundColor: category.color || '#64748b' }}
              onClick={() => removeCategory(category.id)}
            >
              {category.name}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSubmit={handleCreateCategory}
      />
    </div>
  );
};
