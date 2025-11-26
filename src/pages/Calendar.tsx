import { useState } from 'react';
import { Plus, Calendar as CalendarIcon, Clock, MapPin, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAppointments, type Appointment } from '@/hooks/useAppointments';
import { useContacts } from '@/hooks/useContacts';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Calendar() {
  const { appointments, isLoading, createAppointment, updateAppointment, deleteAppointment } =
    useAppointments();
  const { contacts } = useContacts();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    contact_id: string;
    start_time: string;
    end_time: string;
    location: string;
    status: 'scheduled' | 'completed' | 'cancelled';
  }>({
    title: '',
    description: '',
    contact_id: '',
    start_time: '',
    end_time: '',
    location: '',
    status: 'scheduled',
  });

  const handleOpenDialog = (appointment?: Appointment, date?: Date) => {
    if (appointment) {
      setEditingAppointment(appointment);
      setFormData({
        title: appointment.title,
        description: appointment.description || '',
        contact_id: appointment.contact_id || '',
        start_time: format(new Date(appointment.start_time), "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(appointment.end_time), "yyyy-MM-dd'T'HH:mm"),
        location: appointment.location || '',
        status: appointment.status,
      });
    } else {
      setEditingAppointment(null);
      const selectedDateTime = date || new Date();
      const startTime = format(selectedDateTime, "yyyy-MM-dd'T'09:00");
      const endTime = format(selectedDateTime, "yyyy-MM-dd'T'10:00");
      setFormData({
        title: '',
        description: '',
        contact_id: '',
        start_time: startTime,
        end_time: endTime,
        location: '',
        status: 'scheduled',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAppointment(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      contact_id: formData.contact_id && formData.contact_id !== 'none' ? formData.contact_id : null,
      description: formData.description || null,
      location: formData.location || null,
    };

    if (editingAppointment) {
      updateAppointment({ id: editingAppointment.id, ...data });
    } else {
      createAppointment(data);
    }
    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    setAppointmentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (appointmentToDelete) {
      deleteAppointment(appointmentToDelete);
      setAppointmentToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAppointmentsForDay = (day: Date) => {
    return appointments?.filter((appointment) =>
      isSameDay(new Date(appointment.start_time), day)
    ) || [];
  };

  const getStatusColor = (status: Appointment['status']) => {
    const colors = {
      scheduled: 'bg-blue-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colors[status];
  };

  const getDayAppointments = (date: Date) => {
    return appointments?.filter((appointment) =>
      isSameDay(new Date(appointment.start_time), date)
    ) || [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus compromissos e reuniões</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Compromisso
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Calendário */}
        <Card className="p-6">
          <div className="space-y-4">
            {/* Header do Calendário */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Grid do Calendário */}
            <div className="grid grid-cols-7 gap-1">
              {/* Dias da semana */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}

              {/* Dias do mês */}
              {isLoading ? (
                Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square" />
                ))
              ) : (
                calendarDays.map((day, idx) => {
                  const dayAppointments = getAppointmentsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <Popover key={idx}>
                      <PopoverTrigger asChild>
                        <button
                          onClick={() => setSelectedDate(day)}
                          className={`aspect-square p-2 rounded-lg border transition-colors ${
                            isCurrentMonth
                              ? 'bg-background hover:bg-accent'
                              : 'bg-muted/30 text-muted-foreground'
                          } ${
                            isToday ? 'border-primary font-bold' : 'border-border'
                          } ${
                            isSelected ? 'ring-2 ring-primary' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center justify-start h-full">
                            <span className="text-sm">{format(day, 'd')}</span>
                            {dayAppointments.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {dayAppointments.slice(0, 3).map((appointment) => (
                                  <div
                                    key={appointment.id}
                                    className={`w-1.5 h-1.5 rounded-full ${getStatusColor(
                                      appointment.status
                                    )}`}
                                  />
                                ))}
                                {dayAppointments.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{dayAppointments.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                      {dayAppointments.length > 0 && (
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-2">
                            <h4 className="font-medium">
                              {format(day, "dd 'de' MMMM", { locale: ptBR })}
                            </h4>
                            <ScrollArea className="max-h-[300px]">
                              <div className="space-y-2">
                                {dayAppointments.map((appointment) => (
                                  <div
                                    key={appointment.id}
                                    className="p-2 rounded-lg bg-muted/50 space-y-1"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">
                                          {appointment.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {format(new Date(appointment.start_time), 'HH:mm')} -{' '}
                                          {format(new Date(appointment.end_time), 'HH:mm')}
                                        </p>
                                        {appointment.location && (
                                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            <MapPin className="w-3 h-3" />
                                            {appointment.location}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleOpenDialog(appointment)}
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleDelete(appointment.id)}
                                        >
                                          <Trash2 className="w-3 h-3 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>
                  );
                })
              )}
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-4 pt-4 border-t text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Agendado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Concluído</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Cancelado</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Sidebar com próximos compromissos */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Próximos Compromissos</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenDialog(undefined, selectedDate || new Date())}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))
                ) : appointments && appointments.length > 0 ? (
                  appointments
                    .filter((apt) => new Date(apt.start_time) >= new Date())
                    .slice(0, 10)
                    .map((appointment) => {
                      const statusVariants = {
                        scheduled: { variant: 'default' as const, label: 'Agendado' },
                        completed: { variant: 'secondary' as const, label: 'Concluído' },
                        cancelled: { variant: 'destructive' as const, label: 'Cancelado' },
                      };
                      const status = statusVariants[appointment.status];

                      return (
                        <Card
                          key={appointment.id}
                          className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleOpenDialog(appointment)}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm">{appointment.title}</h4>
                              <Badge variant={status.variant} className="text-xs">
                                {status.label}
                              </Badge>
                            </div>

                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-3 h-3" />
                                <span>
                                  {format(
                                    new Date(appointment.start_time),
                                    "dd 'de' MMMM",
                                    { locale: ptBR }
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {format(new Date(appointment.start_time), 'HH:mm')} -{' '}
                                  {format(new Date(appointment.end_time), 'HH:mm')}
                                </span>
                              </div>
                              {appointment.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate">{appointment.location}</span>
                                </div>
                              )}
                            </div>

                            {appointment.contact && (
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-xs font-medium text-primary">
                                    {appointment.contact.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-xs font-medium">
                                  {appointment.contact.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum compromisso agendado</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? 'Editar Compromisso' : 'Novo Compromisso'}
            </DialogTitle>
            <DialogDescription>
              {editingAppointment
                ? 'Atualize as informações do compromisso'
                : 'Preencha os dados do novo compromisso'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Data e Hora Início *</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">Data e Hora Fim *</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_id">Contato</Label>
                <Select
                  value={formData.contact_id}
                  onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um contato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {contacts?.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}
                      </SelectItem>
                    ))}
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
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              {editingAppointment && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    handleDelete(editingAppointment.id);
                    handleCloseDialog();
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingAppointment ? 'Salvar Alterações' : 'Criar Compromisso'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este compromisso? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAppointmentToDelete(null)}>
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
