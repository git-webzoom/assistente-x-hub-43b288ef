import { useState } from 'react';
import { useTags, Tag } from '@/hooks/useTags';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { TagDialog } from './TagDialog';
import { Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export const TagSelector = ({ selectedTagIds, onChange }: TagSelectorProps) => {
  const { tags, isLoading, createTag } = useTags();
  const [open, setOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    onChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleCreateTag = async (data: { name: string; color?: string }) => {
    await createTag.mutateAsync(data);
    setTagDialogOpen(false);
  };

  return (
    <>
      <div className="space-y-2">
        {/* Selected tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag.id}
                className="text-white"
                style={{ backgroundColor: tag.color || '#64748b' }}
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => removeTag(tag.id)}
                  className="ml-1 hover:opacity-75"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Tag selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedTags.length > 0
                ? `${selectedTags.length} tag(s) selecionada(s)`
                : 'Selecionar tags...'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar tags..." />
              <CommandEmpty>
                <div className="p-2">
                  <p className="text-sm text-muted-foreground mb-2">Nenhuma tag encontrada</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setOpen(false);
                      setTagDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar nova tag
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => toggleTag(tag.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedTagIds.includes(tag.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <Badge
                      className="text-white"
                      style={{ backgroundColor: tag.color || '#64748b' }}
                    >
                      {tag.name}
                    </Badge>
                  </CommandItem>
                ))}
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setTagDialogOpen(true);
                  }}
                  className="cursor-pointer border-t"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar nova tag
                </CommandItem>
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <TagDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        onSubmit={handleCreateTag}
      />
    </>
  );
};
