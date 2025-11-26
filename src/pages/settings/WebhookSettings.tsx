import { useState } from "react";
import { Plus, Trash2, Copy, Pencil } from "lucide-react";

import { useWebhooks, type Webhook } from "@/hooks/useWebhooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AVAILABLE_EVENTS = [
  { id: "card.created", label: "Card criado" },
  { id: "card.updated", label: "Card atualizado" },
  { id: "card.deleted", label: "Card excluído" },
  { id: "card.moved", label: "Card movido" },
  { id: "contact.created", label: "Contato criado" },
  { id: "contact.updated", label: "Contato atualizado" },
  { id: "contact.deleted", label: "Contato excluído" },
  { id: "product.created", label: "Produto criado" },
  { id: "product.updated", label: "Produto atualizado" },
  { id: "product.deleted", label: "Produto excluído" },
  { id: "appointment.created", label: "Agenda criada" },
  { id: "appointment.updated", label: "Agenda atualizada" },
  { id: "appointment.deleted", label: "Agenda excluída" },
  { id: "task.created", label: "Tarefa criada" },
  { id: "task.updated", label: "Tarefa atualizada" },
  { id: "task.deleted", label: "Tarefa excluída" },
  { id: "task.completed", label: "Tarefa completada" },
] as const;

export default function WebhookSettings() {
  const { toast } = useToast();
  const { webhooks = [], isLoading, createWebhook, updateWebhook, deleteWebhook } = useWebhooks();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "URL copiada para a área de transferência",
    });
  };

  const handleOpenDialog = (webhook?: Webhook) => {
    if (webhook) {
      setEditingWebhook(webhook);
      setUrl(webhook.url);
      setSelectedEvents(webhook.events);
    } else {
      setEditingWebhook(null);
      setUrl("");
      setSelectedEvents([]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingWebhook(null);
    setUrl("");
    setSelectedEvents([]);
  };

  const handleSaveWebhook = () => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, informe a URL do webhook",
        variant: "destructive",
      });
      return;
    }

    if (!selectedEvents.length) {
      toast({
        title: "Eventos obrigatórios",
        description: "Selecione ao menos um evento",
        variant: "destructive",
      });
      return;
    }

    if (editingWebhook) {
      // Editar webhook existente
      updateWebhook(
        { id: editingWebhook.id, updates: { url: trimmedUrl, events: selectedEvents } },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      // Criar novo webhook
      createWebhook(
        { url: trimmedUrl, events: selectedEvents },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    }
  };

  const handleToggleActive = (webhook: Webhook) => {
    updateWebhook({
      id: webhook.id,
      updates: { active: !webhook.active },
    });
  };

  const handleDelete = (id: string) => {
    setWebhookToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (webhookToDelete) {
      deleteWebhook(webhookToDelete);
      setWebhookToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Webhooks</h2>
          <p className="text-muted-foreground mt-1">
            Configure webhooks para receber notificações de eventos em tempo real.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWebhook ? "Editar webhook" : "Novo webhook"}</DialogTitle>
              <DialogDescription>
                Informe a URL que receberá as requisições e quais eventos devem
                disparar o webhook.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL do Webhook</Label>
                <Input
                  id="url"
                  placeholder="https://seu-servidor.com/webhook"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Eventos</Label>
                <div className="space-y-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <div key={event.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={event.id}
                        checked={selectedEvents.includes(event.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEvents([...selectedEvents, event.id]);
                          } else {
                            setSelectedEvents(
                              selectedEvents.filter((e) => e !== event.id)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={event.id} className="cursor-pointer">
                        {event.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSaveWebhook}>
                {editingWebhook ? "Salvar alterações" : "Criar webhook"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este webhook? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWebhookToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Eventos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : webhooks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhum webhook configurado ainda.
                </TableCell>
              </TableRow>
            ) : (
              webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded max-w-md truncate">
                        {webhook.url}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(webhook.url)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events?.map((event) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {
                            AVAILABLE_EVENTS.find((e) => e.id === event)
                              ?.label
                          }
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.active}
                        onCheckedChange={() => handleToggleActive(webhook)}
                      />
                      <span className="text-sm">
                        {webhook.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(webhook.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(webhook)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(webhook.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
