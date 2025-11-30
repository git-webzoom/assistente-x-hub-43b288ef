import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { CustomFieldDialog } from '@/components/CustomFieldDialog';
import { useCustomFields, CustomField, CustomFieldEntity } from '@/hooks/useCustomFields';
import { useProducts } from '@/hooks/useProducts';

const entityLabels: Record<CustomFieldEntity, string> = {
  contact: 'Contato',
  product: 'Produto',
  card: 'Card',
  appointment: 'Agenda',
  task: 'Tarefa',
};

const fieldTypeLabels = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  boolean: 'Sim/Não',
  select: 'Seleção',
};

export default function CustomFieldSettings() {
  const { products } = useProducts();
  const [filterEntity, setFilterEntity] = useState<CustomFieldEntity | 'all'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);

  const { customFields, isLoading, createCustomField, updateCustomField, deleteCustomField } =
    useCustomFields(filterEntity === 'all' ? undefined : filterEntity);

  const handleOpenDialog = (field?: CustomField) => {
    setEditingField(field || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingField(null);
  };

  const handleSubmit = (data: any) => {
    if (editingField) {
      updateCustomField({ id: editingField.id, updates: data });
    } else {
      createCustomField(data);
    }
  };

  const handleDelete = (id: string) => {
    setFieldToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (fieldToDelete) {
      deleteCustomField(fieldToDelete);
      setFieldToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Campos Personalizados</h2>
        <p className="text-muted-foreground mt-1">
          Crie campos personalizados para adicionar informações específicas às suas entidades.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filtrar por:</span>
          <Select
            value={filterEntity}
            onValueChange={(value: CustomFieldEntity | 'all') => setFilterEntity(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as entidades</SelectItem>
              {Object.entries(entityLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Campo
        </Button>
      </div>

      <CustomFieldDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        customField={editingField}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este campo personalizado? Esta ação não pode ser
              desfeita e todos os valores associados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFieldToDelete(null)}>
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
              <TableHead>Nome</TableHead>
              <TableHead>Identificador</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Obrigatório</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : customFields?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum campo personalizado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              customFields?.map((field) => {
                const targetProduct = field.scope === 'product' && field.scope_target_id
                  ? products?.find(p => p.id === field.scope_target_id)
                  : null;

                return (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.field_label}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{field.field_name}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entityLabels[field.entity_type]}</Badge>
                    </TableCell>
                    <TableCell>
                      {field.scope === 'entity' ? (
                        <Badge variant="default">Global</Badge>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary">Específico</Badge>
                          {targetProduct && (
                            <span className="text-xs text-muted-foreground">{targetProduct.name}</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{fieldTypeLabels[field.field_type]}</TableCell>
                    <TableCell>
                      {field.is_required ? (
                        <Badge variant="secondary">Sim</Badge>
                      ) : (
                        <span className="text-muted-foreground">Não</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {field.has_stock_control ? (
                        <Badge variant="default">Sim</Badge>
                      ) : (
                        <span className="text-muted-foreground">Não</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(field)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(field.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
