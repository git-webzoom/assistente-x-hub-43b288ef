import { useState } from 'react';
import { Plus, Trash2, Copy, Eye, EyeOff, BookOpen } from 'lucide-react';
import { useApiKeys, type ApiKey } from '@/hooks/useApiKeys';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

export default function ApiKeySettings() {
  const { toast } = useToast();
  const { apiKeys = [], isLoading, createApiKey, updateApiKey, deleteApiKey } = useApiKeys();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: 'API Key copiada para a área de transferência',
    });
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setKeyName('');
    setNewApiKey(null);
    setShowNewKey(false);
  };

  const handleCreateKey = () => {
    if (!keyName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe um nome para a API Key',
        variant: 'destructive',
      });
      return;
    }

    createApiKey(
      { name: keyName.trim() },
      {
        onSuccess: (data: any) => {
          setNewApiKey(data.api_key);
          setShowNewKey(true);
        },
      }
    );
  };

  const handleToggleActive = (key: ApiKey) => {
    updateApiKey({
      id: key.id,
      updates: { is_active: !key.is_active },
    });
  };

  const handleDelete = (id: string) => {
    setKeyToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (keyToDelete) {
      deleteApiKey(keyToDelete);
      setKeyToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Keys</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie as chaves de API para integração com sistemas externos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard/api-docs">
              <BookOpen className="w-4 h-4 mr-2" />
              Ver Documentação
            </Link>
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova API Key
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova API Key</DialogTitle>
              <DialogDescription>
                Crie uma nova chave de API para integração com sistemas externos.
              </DialogDescription>
            </DialogHeader>

            {newApiKey ? (
              <div className="space-y-4 py-4">
                <Alert>
                  <AlertTitle>⚠️ Importante</AlertTitle>
                  <AlertDescription>
                    Copie esta chave agora. Por segurança, ela não será exibida novamente.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Sua API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showNewKey ? 'text' : 'password'}
                      value={newApiKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowNewKey(!showNewKey)}
                    >
                      {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(newApiKey)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Nome da API Key</Label>
                  <Input
                    id="keyName"
                    placeholder="Ex: Integração Zapier"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use um nome descritivo para identificar onde esta chave será usada.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              {newApiKey ? (
                <Button onClick={handleCloseDialog}>Fechar</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateKey}>Criar API Key</Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta API Key? Sistemas que a utilizam perderão acesso
              imediatamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setKeyToDelete(null)}>Cancelar</AlertDialogCancel>
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
              <TableHead>Nome</TableHead>
              <TableHead>Chave</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último uso</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : apiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma API Key criada ainda.
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{key.key_prefix}...</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={key.is_active}
                        onCheckedChange={() => handleToggleActive(key)}
                      />
                      <span className="text-sm">{key.is_active ? 'Ativa' : 'Inativa'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleString()
                      : 'Nunca usado'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(key.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(key.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Alert>
        <AlertTitle>📘 Como usar as API Keys</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Inclua a API Key no header das requisições HTTP:</p>
          <code className="block bg-muted p-2 rounded text-xs mt-2">
            Authorization: Bearer sua-api-key-aqui
          </code>
        </AlertDescription>
      </Alert>
    </div>
  );
}
