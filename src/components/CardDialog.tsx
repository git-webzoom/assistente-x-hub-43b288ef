import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomFieldsSection } from "@/components/CustomFieldsSection";

interface CardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; value: number; description?: string; tags?: string[] }) => void;
  cardId?: string;
}

export const CardDialog = ({
  open,
  onOpenChange,
  onSubmit,
  cardId,
}: CardDialogProps) => {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && value) {
      onSubmit({
        title: title.trim(),
        value: parseFloat(value),
        description: description.trim() || undefined,
        tags: tags.trim() ? tags.split(",").map(t => t.trim()) : undefined,
      });
      setTitle("");
      setValue("");
      setDescription("");
      setTags("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Novo Card</DialogTitle>
          <DialogDescription>
            Adicione uma nova oportunidade à pipeline
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <form id="card-form" onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Ex: João Silva - Empresa ABC"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 5000.00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Detalhes da oportunidade..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                <Input
                  id="tags"
                  placeholder="Ex: quente, empresa, urgente"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
              
              <CustomFieldsSection
                entityType="card"
                entityId={cardId}
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="card-form">Criar Card</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
