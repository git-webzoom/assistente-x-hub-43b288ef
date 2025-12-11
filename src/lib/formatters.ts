import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  return format(parsed, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  return format(parsed, 'HH:mm', { locale: ptBR });
}

export function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  return format(parsed, 'dd MMM', { locale: ptBR });
}

export function formatWeekday(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  return format(parsed, 'EEEE', { locale: ptBR });
}
