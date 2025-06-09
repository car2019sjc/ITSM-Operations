import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function normalizePriority(priority: string): string {
  if (!priority) return 'Não definido';
  const p = priority.trim().toUpperCase();
  if (p === 'P1' || p.startsWith('1') || p.includes('CRÍTICO')) return 'P1';
  if (p === 'P2' || p.startsWith('2') || p.includes('ALTO')) return 'P2';
  if (p === 'P3' || p.startsWith('3') || p.includes('MÉDIO')) return 'P3';
  if (p === 'P4' || p.startsWith('4') || p.includes('BAIXO')) return 'P4';
  return 'Não definido';
}

export function getIncidentState(state: string): string {
  switch (state.toUpperCase()) {
    case 'ABERTO':
    case 'NEW':
      return 'Aberto';
    case 'EM ANDAMENTO':
    case 'IN PROGRESS':
    case 'WORK IN PROGRESS':
      return 'Em Andamento';
    case 'FECHADO':
    case 'CLOSED':
    case 'RESOLVED':
      return 'Fechado';
    default:
      return state;
  }
}

export const isHighPriority = (priority: string): boolean => {
  if (!priority) return false;
  const p = priority.toLowerCase().trim();
  
  // P1/Critical
  if (p === 'p1' || 
      p === '1' || 
      p === 'priority 1' || 
      p === 'critical' || 
      p === 'crítico' ||
      p.startsWith('p1 -') ||
      p.startsWith('p1-') ||
      p.startsWith('1 -') ||
      p.startsWith('1-') ||
      p.includes('critical') ||
      p.includes('crítico')) {
    return true;
  }
  
  // P2/High
  if (p === 'p2' || 
      p === '2' || 
      p === 'priority 2' || 
      p === 'high' || 
      p === 'alta' ||
      p.startsWith('p2 -') ||
      p.startsWith('p2-') ||
      p.startsWith('2 -') ||
      p.startsWith('2-') ||
      p.includes('high priority') ||
      p.includes('alta prioridade')) {
    return true;
  }

  return false;
};

export const isCancelled = (state: string): boolean => {
  if (!state) return false;
  const s = state.toLowerCase().trim();
  return s.includes('canceled') || 
         s.includes('cancelled') || 
         s.includes('cancelado') || 
         s.includes('cancelada');
};

export const isActiveIncident = (state: string): boolean => {
  if (!state) return true;
  const normalizedState = getIncidentState(state);
  return normalizedState !== 'Fechado' && normalizedState !== 'Cancelado';
};

export function formatIncidentDate(dateStr: string | undefined | null): string {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (!date || isNaN(date.getTime())) return 'Data inválida';
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch (e) {
    return 'Data inválida';
  }
}