import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag } from '@/hooks/useTags';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#71717a', '#78716c',
];

interface TagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag?: Tag | null;
  onSubmit: (data: { name: string; color?: string }) => void;
}

export const TagDialog = ({ open, onOpenChange, tag, onSubmit }: TagDialogProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (tag) {
      setName(tag.name);
      setColor(tag.color || PRESET_COLORS[0]);
    } else {
      setName('');
      setColor(PRESET_COLORS[0]);
    }
  }, [tag, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({ name: name.trim(), color });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{tag ? 'Editar Tag' : 'Nova Tag'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Tag</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cliente, Lead, VIP..."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === presetColor ? 'border-primary scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {name || 'Tag Preview'}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {tag ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
