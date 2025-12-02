import { useState } from 'react';
import { useTags, Tag } from '@/hooks/useTags';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TagDialog } from '@/components/TagDialog';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { usePagination } from '@/hooks/usePagination';
import { DataPagination } from '@/components/DataPagination';

export default function TagSettings() {
  const { tags, isLoading, createTag, updateTag, deleteTag } = useTags();
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTags = tags?.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = usePagination(filteredTags, 8);

  const handleOpenDialog = (tag?: Tag) => {
    setEditingTag(tag || null);
    setTagDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setTagDialogOpen(false);
    setEditingTag(null);
  };

  const handleSubmit = async (data: { name: string; color?: string }) => {
    if (editingTag) {
      await updateTag.mutateAsync({
        id: editingTag.id,
        updates: data,
      });
    } else {
      await createTag.mutateAsync(data);
    }
    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    setTagToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (tagToDelete) {
      await deleteTag.mutateAsync(tagToDelete);
      setDeleteDialogOpen(false);
      setTagToDelete(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tags</CardTitle>
            <CardDescription>
              Gerencie as tags que podem ser usadas em contatos e cards
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tag
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por nome..."
        />

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando tags...
          </div>
        ) : filteredTags && filteredTags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{searchQuery ? 'Nenhuma tag encontrada.' : 'Nenhuma tag criada ainda.'}</p>
            {!searchQuery && (
              <p className="text-sm mt-2">
                Clique em "Nova Tag" para criar sua primeira tag.
              </p>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-medium">{tag.name}</TableCell>
                    <TableCell>
                      <Badge
                        className="text-white"
                        style={{ backgroundColor: tag.color || '#64748b' }}
                      >
                        {tag.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(tag.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(tag)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tag.id)}
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

      <TagDialog
        open={tagDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog();
          setTagDialogOpen(open);
        }}
        tag={editingTag}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tag? Esta ação não pode ser desfeita e a tag será removida de todos os contatos e cards.
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
