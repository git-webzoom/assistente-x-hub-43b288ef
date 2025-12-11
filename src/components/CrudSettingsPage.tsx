import { useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { SearchInput } from '@/components/SearchInput';
import { DataPagination } from '@/components/DataPagination';
import { EmptyState } from '@/components/EmptyState';
import { usePagination } from '@/hooks/usePagination';
import { Plus, Pencil, Trash2, LucideIcon } from 'lucide-react';
import { PAGINATION_DEFAULTS } from '@/lib/constants';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface CrudSettingsPageProps<T extends { id: string }> {
  title: string;
  description: string;
  items: T[];
  isLoading: boolean;
  columns: Column<T>[];
  searchPlaceholder?: string;
  filterFn: (item: T, query: string) => boolean;
  onEdit: (item: T) => void;
  onDelete: (id: string) => Promise<void>;
  onCreate: () => void;
  deleteDescription: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  createButtonLabel?: string;
  dialogComponent: ReactNode;
}

export function CrudSettingsPage<T extends { id: string }>({
  title,
  description,
  items,
  isLoading,
  columns,
  searchPlaceholder = 'Buscar...',
  filterFn,
  onEdit,
  onDelete,
  onCreate,
  deleteDescription,
  emptyIcon,
  emptyTitle = 'Nenhum item encontrado',
  emptyDescription,
  createButtonLabel = 'Novo',
  dialogComponent,
}: CrudSettingsPageProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredItems = items.filter((item) => filterFn(item, searchQuery.toLowerCase()));

  const {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = usePagination(filteredItems, PAGINATION_DEFAULTS.itemsPerPage);

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      setIsDeleting(true);
      try {
        await onDelete(itemToDelete);
      } finally {
        setIsDeleting(false);
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {createButtonLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={searchPlaceholder}
        />

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={searchQuery ? 'Nenhum resultado encontrado' : emptyTitle}
            description={searchQuery ? undefined : emptyDescription}
            action={!searchQuery && (
              <Button onClick={onCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {createButtonLabel}
              </Button>
            )}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key} className={col.className}>
                      {col.header}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render(item)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
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

      {dialogComponent}

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        description={deleteDescription}
        isLoading={isDeleting}
      />
    </Card>
  );
}
