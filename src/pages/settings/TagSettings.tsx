import { useState } from 'react';
import { useTags, Tag } from '@/hooks/useTags';
import { Badge } from '@/components/ui/badge';
import { CrudSettingsPage } from '@/components/CrudSettingsPage';
import { TagDialog } from '@/components/TagDialog';
import { Tags } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { DEFAULT_BADGE_COLOR } from '@/lib/constants';

export default function TagSettings() {
  const { tags, isLoading, createTag, updateTag, deleteTag } = useTags();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTag(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTag(null);
  };

  const handleSubmit = async (data: { name: string; color?: string }) => {
    if (editingTag) {
      await updateTag.mutateAsync({ id: editingTag.id, updates: data });
    } else {
      await createTag.mutateAsync(data);
    }
    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    await deleteTag.mutateAsync(id);
  };

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (tag: Tag) => <span className="font-medium">{tag.name}</span>,
    },
    {
      key: 'preview',
      header: 'Preview',
      render: (tag: Tag) => (
        <Badge
          className="text-white"
          style={{ backgroundColor: tag.color || DEFAULT_BADGE_COLOR }}
        >
          {tag.name}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Criada em',
      render: (tag: Tag) => formatDate(tag.created_at),
    },
  ];

  return (
    <CrudSettingsPage<Tag>
      title="Tags"
      description="Gerencie as tags que podem ser usadas em contatos e cards"
      items={tags}
      isLoading={isLoading}
      columns={columns}
      searchPlaceholder="Buscar por nome..."
      filterFn={(tag, query) => tag.name.toLowerCase().includes(query)}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onCreate={handleCreate}
      deleteDescription="Tem certeza que deseja excluir esta tag? Esta ação não pode ser desfeita e a tag será removida de todos os contatos e cards."
      emptyIcon={Tags}
      emptyTitle="Nenhuma tag criada ainda"
      emptyDescription="Clique em 'Nova Tag' para criar sua primeira tag."
      createButtonLabel="Nova Tag"
      dialogComponent={
        <TagDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseDialog();
            setDialogOpen(open);
          }}
          tag={editingTag}
          onSubmit={handleSubmit}
        />
      }
    />
  );
}
