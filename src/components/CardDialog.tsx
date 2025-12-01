import { useState, useEffect } from "react";
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
import { TagSelector } from "@/components/TagSelector";
import { UserSelect } from "@/components/UserSelect";
import { useCardTags } from "@/hooks/useCardTags";
import { useUserRole } from "@/hooks/useUserRole";

interface CardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; value: number; description?: string; owner_id?: string }) => void;
  cardId?: string;
  existingCard?: {
    id: string;
    title: string;
    value: number;
    description?: string;
    owner_id?: string;
  };
}

export const CardDialog = ({
  open,
  onOpenChange,
  onSubmit,
  cardId,
  existingCard,
}: CardDialogProps) => {
  const { cardTags, setCardTags } = useCardTags(cardId);
  const { isSupervisor } = useUserRole();
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (existingCard) {
        setTitle(existingCard.title);
        setValue(existingCard.value.toString());
        setDescription(existingCard.description || "");
        setOwnerId(existingCard.owner_id || "");
        setSelectedTagIds(cardTags.map(t => t.id));
      } else {
        setTitle("");
        setValue("");
        setDescription("");
        setOwnerId("");
        setSelectedTagIds([]);
      }
    }
  }, [existingCard?.id, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && value) {
      // Update tags first if editing
      if (existingCard?.id) {
        await setCardTags.mutateAsync({
          cardId: existingCard.id,
          tagIds: selectedTagIds,
        });
      }
      
      onSubmit({
        title: title.trim(),
        value: parseFloat(value),
        description: description.trim() || undefined,
        owner_id: ownerId || undefined,
      });
      
      setTitle("");
      setValue("");
      setDescription("");
      setOwnerId("");
      setSelectedTagIds([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{existingCard ? "Editar Card" : "Novo Card"}</DialogTitle>
          <DialogDescription>
            {existingCard ? "Edite as informações da oportunidade" : "Adicione uma nova oportunidade à pipeline"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-4">
          <form id="card-form" onSubmit={handleSubmit}>
            <div className="space-y-4 pb-4">
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
                <Label>Tags</Label>
                <TagSelector
                  selectedTagIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
              </div>
              
              {isSupervisor && (
                <div className="space-y-2">
                  <Label htmlFor="owner_id">Proprietário</Label>
                  <UserSelect
                    value={ownerId || undefined}
                    onChange={(value) => setOwnerId(value || "")}
                    placeholder="Selecionar proprietário..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Se não selecionado, você será o proprietário.
                  </p>
                </div>
              )}
              
              <CustomFieldsSection
                entityType="card"
                entityId={existingCard?.id}
              />
            </div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="card-form">
            {existingCard ? "Salvar" : "Criar Card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
