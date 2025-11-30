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
import { useTasks, type Task } from '@/hooks/useTasks';
import { useContacts } from '@/hooks/useContacts';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomFieldsSection } from '@/components/CustomFieldsSection';
import { ContactSelect } from '@/components/ContactSelect';
import { UserSelect } from '@/components/UserSelect';
import { SearchWithFilter } from '@/components/SearchWithFilter';
import { useUserRole } from '@/hooks/useUserRole';

export default function Tasks() {
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useTasks();
  const { contacts } = useContacts();
  const { role } = useUserRole();
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas tarefas e atividades</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      <SearchWithFilter
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar por título, descrição ou contato..."
        filter={
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
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

      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : filteredTasks && filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const priorityBadge = getPriorityBadge(task.priority);
            const statusBadge = getStatusBadge(task.status);
            const isCompleted = task.status === 'completed';

            return (
              <Card
                key={task.id}
                className={`p-4 ${isCompleted ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => handleToggleComplete(task)}
                    className="mt-1"
                  />

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3
                        className={`font-semibold ${
                          isCompleted ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {task.title}
                      </h3>
                      <Badge variant={priorityBadge.variant}>{priorityBadge.label}</Badge>
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                    </div>

                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {task.due_date && (
                        <span>
                          Vencimento:{' '}
                          {format(new Date(task.due_date), "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                      )}
                      {task.contact && (
                        <span className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {task.contact.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {task.contact.name}
                        </span>
                      )}
                      {task.assigned_user && (
                        <span className="flex items-center gap-2">
                          👤
                          <span className="font-medium text-foreground">
                            {task.assigned_user.full_name || task.assigned_user.email}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(task)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-12">
            <div className="flex flex-col items-center gap-2 text-center">
              <CheckSquare className="w-12 h-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {searchQuery || filterStatus !== 'all'
                  ? 'Nenhuma tarefa encontrada'
                  : 'Nenhuma tarefa criada ainda'}
              </p>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
            <DialogDescription>
              {editingTask
                ? 'Atualize as informações da tarefa'
                : 'Preencha os dados da nova tarefa'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-4">
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

              <div className="grid grid-cols-3 gap-4">
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

              {(role === 'admin' || role === 'superadmin') && (
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

          <DialogFooter className="flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button type="submit" form="task-form">
              {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
