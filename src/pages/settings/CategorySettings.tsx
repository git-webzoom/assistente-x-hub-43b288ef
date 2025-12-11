import { useState } from 'react';
import { useCategories, Category } from '@/hooks/useCategories';
import { Badge } from '@/components/ui/badge';
import { CrudSettingsPage } from '@/components/CrudSettingsPage';
import { CategoryDialog } from '@/components/CategoryDialog';
import { FolderTree } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { DEFAULT_BADGE_COLOR } from '@/lib/constants';

export default function CategorySettings() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (data: { name: string; description?: string; color?: string }) => {
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, updates: data });
    } else {
      await createCategory.mutateAsync(data);
    }
    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    await deleteCategory.mutateAsync(id);
  };

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (category: Category) => <span className="font-medium">{category.name}</span>,
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (category: Category) => (
        <span className="text-sm text-muted-foreground">
          {category.description || '-'}
        </span>
      ),
      className: 'hidden sm:table-cell',
    },
    {
      key: 'preview',
      header: 'Preview',
      render: (category: Category) => (
        <Badge
          className="text-white"
          style={{ backgroundColor: category.color || DEFAULT_BADGE_COLOR }}
        >
          {category.name}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Criada em',
      render: (category: Category) => formatDate(category.created_at),
      className: 'hidden md:table-cell',
    },
  ];

  return (
    <CrudSettingsPage<Category>
      title="Categorias"
      description="Gerencie as categorias que podem ser usadas em produtos"
      items={categories}
      isLoading={isLoading}
      columns={columns}
      searchPlaceholder="Buscar por nome ou descrição..."
      filterFn={(category, query) =>
        category.name.toLowerCase().includes(query) ||
        category.description?.toLowerCase().includes(query) ||
        false
      }
      onEdit={handleEdit}
      onDelete={handleDelete}
      onCreate={handleCreate}
      deleteDescription="Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita e a categoria será removida de todos os produtos."
      emptyIcon={FolderTree}
      emptyTitle="Nenhuma categoria criada ainda"
      emptyDescription="Clique em 'Nova Categoria' para criar sua primeira categoria."
      createButtonLabel="Nova Categoria"
      dialogComponent={
        <CategoryDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseDialog();
            setDialogOpen(open);
          }}
          category={editingCategory}
          onSubmit={handleSubmit}
        />
      }
    />
  );
}
