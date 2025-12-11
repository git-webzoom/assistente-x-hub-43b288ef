// Priority configuration
export const PRIORITY_CONFIG = {
  low: { label: 'Baixa', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  medium: { label: 'Média', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  high: { label: 'Alta', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
} as const;

// Task status configuration
export const TASK_STATUS_CONFIG = {
  pending: { label: 'Pendente', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  in_progress: { label: 'Em andamento', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  completed: { label: 'Concluída', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
} as const;

// Appointment status configuration
export const APPOINTMENT_STATUS_CONFIG = {
  scheduled: { label: 'Agendado', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  confirmed: { label: 'Confirmado', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  completed: { label: 'Concluído', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
} as const;

// User roles configuration
export const USER_ROLE_CONFIG = {
  superadmin: { label: 'Super Admin', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  admin: { label: 'Admin', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  supervisor: { label: 'Supervisor', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  user: { label: 'Usuário', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
} as const;

// Toast messages
export const TOAST_MESSAGES = {
  create: {
    success: (entity: string) => ({ title: 'Sucesso!', description: `${entity} criado(a) com sucesso.` }),
    error: (entity: string) => ({ title: 'Erro', description: `Erro ao criar ${entity.toLowerCase()}.`, variant: 'destructive' as const }),
  },
  update: {
    success: (entity: string) => ({ title: 'Sucesso!', description: `${entity} atualizado(a) com sucesso.` }),
    error: (entity: string) => ({ title: 'Erro', description: `Erro ao atualizar ${entity.toLowerCase()}.`, variant: 'destructive' as const }),
  },
  delete: {
    success: (entity: string) => ({ title: 'Sucesso!', description: `${entity} excluído(a) com sucesso.` }),
    error: (entity: string) => ({ title: 'Erro', description: `Erro ao excluir ${entity.toLowerCase()}.`, variant: 'destructive' as const }),
  },
} as const;

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  itemsPerPage: 8,
} as const;

// Default colors for tags/categories
export const DEFAULT_BADGE_COLOR = '#64748b';
