import { useState } from 'react';
import { useCategories, Category } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CategoryDialog } from '@/components/CategoryDialog';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { usePagination } from '@/hooks/usePagination';
import { DataPagination } from '@/components/DataPagination';

export default function CategorySettings() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = categories?.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = usePagination(filteredCategories, 8);

  const handleOpenDialog = (category?: Category) => {
    setEditingCategory(category || null);
    setCategoryDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (data: { name: string; description?: string; color?: string }) => {
    if (editingCategory) {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        updates: data,
      });
    } else {
      await createCategory.mutateAsync(data);
    }
    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (categoryToDelete) {
      await deleteCategory.mutateAsync(categoryToDelete);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Categorias</CardTitle>
            <CardDescription>
              Gerencie as categorias que podem ser usadas em produtos
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por nome ou descrição..."
        />

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando categorias...
          </div>
        ) : filteredCategories && filteredCategories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{searchQuery ? 'Nenhuma categoria encontrada.' : 'Nenhuma categoria criada ainda.'}</p>
            {!searchQuery && (
              <p className="text-sm mt-2">
                Clique em "Nova Categoria" para criar sua primeira categoria.
              </p>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {category.description || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="text-white"
                        style={{ backgroundColor: category.color || '#64748b' }}
                      >
                        {category.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(category.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <DataPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </CardContent>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog();
          setCategoryDialogOpen(open);
        }}
        category={editingCategory}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita e a categoria será removida de todos os produtos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
