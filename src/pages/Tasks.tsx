import { useState } from 'react';
import { Plus, CheckSquare, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTasks, type Task } from '@/hooks/useTasks';
import { useContacts } from '@/hooks/useContacts';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomFieldsSection } from '@/components/CustomFieldsSection';
import { ContactSelect } from '@/components/ContactSelect';
import { UserSelect } from '@/components/UserSelect';
import { SearchWithFilter } from '@/components/SearchWithFilter';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserEntityPermissions } from '@/hooks/useUserEntityPermissions';
import { usePagination } from '@/hooks/usePagination';
import { DataPagination } from '@/components/DataPagination';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

export default function Tasks() {
  const { hasPermission } = useUserEntityPermissions();
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useTasks();
  const { contacts } = useContacts();
  const { isSupervisor } = useUserRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    contact_id: string;
    assigned_to: string;
    due_date: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed';
  }>({
    title: '',
    description: '',
    contact_id: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium',
    status: 'pending',
  });

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        contact_id: task.contact_id || '',
        assigned_to: task.assigned_to || '',
        due_date: task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
        priority: task.priority,
        status: task.status,
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        contact_id: '',
        assigned_to: '',
        due_date: '',
        priority: 'medium',
        status: 'pending',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      contact_id: formData.contact_id && formData.contact_id !== 'none' ? formData.contact_id : null,
      assigned_to: formData.assigned_to && formData.assigned_to !== 'none' ? formData.assigned_to : null,
      description: formData.description || null,
      due_date: formData.due_date || null,
    };

    if (editingTask) {
      updateTask({ id: editingTask.id, ...data });
    } else {
      createTask(data);
    }
    handleCloseDialog();
  };

  const handleToggleComplete = (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTask({ id: task.id, status: newStatus });
  };

  const handleDelete = (id: string) => {
    setTaskToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete);
      setTaskToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const filteredTasks = tasks?.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.contact?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = usePagination(filteredTasks, 8);

  const getPriorityBadge = (priority: Task['priority']) => {
    const variants = {
      low: { variant: 'secondary' as const, label: 'Baixa' },
      medium: { variant: 'default' as const, label: 'Média' },
      high: { variant: 'destructive' as const, label: 'Alta' },
    };
    return variants[priority];
  };

  const getStatusBadge = (status: Task['status']) => {
    const variants = {
      pending: { variant: 'secondary' as const, label: 'Pendente' },
      in_progress: { variant: 'default' as const, label: 'Em Progresso' },
      completed: { variant: 'outline' as const, label: 'Concluída' },
    };
    return variants[status];
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Gerencie suas tarefas e atividades</p>
        </div>
        {hasPermission('tasks', 'create') && (
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Nova Tarefa
          </Button>
        )}
      </div>

      <SearchWithFilter
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar por título, descrição ou contato..."
        filter={
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="completed">Concluídas</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-3 md:gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 md:h-24 w-full" />)
        ) : paginatedItems && paginatedItems.length > 0 ? (
          paginatedItems.map((task) => {
            const priorityBadge = getPriorityBadge(task.priority);
            const statusBadge = getStatusBadge(task.status);
            const isCompleted = task.status === 'completed';

            return (
              <Card
                key={task.id}
                className={`p-3 md:p-4 ${isCompleted ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => handleToggleComplete(task)}
                    className="mt-1"
                  />

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`font-semibold text-sm md:text-base ${
                          isCompleted ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {task.title}
                      </h3>
                      <Badge variant={priorityBadge.variant} className="text-xs">{priorityBadge.label}</Badge>
                      <Badge variant={statusBadge.variant} className="text-xs">{statusBadge.label}</Badge>
                    </div>

                    {task.description && (
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                      {task.due_date && (
                        <span>
                          Vencimento:{' '}
                          {format(new Date(task.due_date), "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                      )}
                      {task.contact && (
                        <span className="flex items-center gap-1 md:gap-2">
                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-[10px] md:text-xs font-medium text-primary">
                              {task.contact.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="truncate max-w-[80px] md:max-w-none">{task.contact.name}</span>
                        </span>
                      )}
                      {task.assigned_user && (
                        <span className="flex items-center gap-1 md:gap-2">
                          👤
                          <span className="font-medium text-foreground truncate max-w-[80px] md:max-w-none">
                            {task.assigned_user.name || task.assigned_user.email}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {hasPermission('tasks', 'edit') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(task)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {hasPermission('tasks', 'delete') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(task.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-8 md:p-12">
            <div className="flex flex-col items-center gap-2 text-center">
              <CheckSquare className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm md:text-base">
                {searchQuery || filterStatus !== 'all'
                  ? 'Nenhuma tarefa encontrada'
                  : 'Nenhuma tarefa criada ainda'}
              </p>
            </div>
          </Card>
        )}
      </div>

      {filteredTasks && filteredTasks.length > 0 && (
        <DataPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
            <DialogDescription>
              {editingTask
                ? 'Atualize as informações da tarefa'
                : 'Preencha os dados da nova tarefa'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 md:pr-4">
            <form id="task-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Data de Vencimento</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_progress">Em Progresso</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_id">Contato</Label>
                <ContactSelect
                  value={formData.contact_id || undefined}
                  onChange={(value) =>
                    setFormData({ ...formData, contact_id: value || '' })
                  }
                />
              </div>

              {isSupervisor && (
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Responsável</Label>
                  <UserSelect
                    value={formData.assigned_to || undefined}
                    onChange={(value) =>
                      setFormData({ ...formData, assigned_to: value || '' })
                    }
                  />
                </div>
              )}

              <CustomFieldsSection
                entityType="task"
                entityId={editingTask?.id}
              />
            </form>
          </div>

          <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" form="task-form" className="w-full sm:w-auto">
              {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        description="Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita."
      />
    </div>
  );
}