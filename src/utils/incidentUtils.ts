import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function normalizePriority(priority: string): string {
  if (!priority) return 'Não definido';

  // Normaliza: remove acentos, pontuações e espaços extras; coloca em maiúsculas
  const sanitized = priority
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[\.:;-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  // Casos comuns que devemos aceitar:
  // - P1, P2, P3, P4
  // - 1, 2, 3, 4
  // - PAG 1, PAG. 2, PAGINA 3, PAGINA: 4
  // - PRIORIDADE 1, PRIORITY 2
  // - CRITICO/CRITICO, ALTO, MEDIO, BAIXO

  if (/^P\s*1$/.test(sanitized) || /^1$/.test(sanitized)) return 'P1';
  if (/^P\s*2$/.test(sanitized) || /^2$/.test(sanitized)) return 'P2';
  if (/^P\s*3$/.test(sanitized) || /^3$/.test(sanitized)) return 'P3';
  if (/^P\s*4$/.test(sanitized) || /^4$/.test(sanitized)) return 'P4';

  if (/^(PAG|PAGINA|PAG\s)\s*1$/.test(sanitized)) return 'P1';
  if (/^(PAG|PAGINA|PAG\s)\s*2$/.test(sanitized)) return 'P2';
  if (/^(PAG|PAGINA|PAG\s)\s*3$/.test(sanitized)) return 'P3';
  if (/^(PAG|PAGINA|PAG\s)\s*4$/.test(sanitized)) return 'P4';

  if (/^(PRIORIDADE|PRIORITY)\s*1$/.test(sanitized)) return 'P1';
  if (/^(PRIORIDADE|PRIORITY)\s*2$/.test(sanitized)) return 'P2';
  if (/^(PRIORIDADE|PRIORITY)\s*3$/.test(sanitized)) return 'P3';
  if (/^(PRIORIDADE|PRIORITY)\s*4$/.test(sanitized)) return 'P4';

  if (sanitized.includes('CRITICO') || sanitized.includes('CRITIC')) return 'P1';
  if (sanitized.includes('ALTO') || sanitized.includes('HIGH')) return 'P2';
  if (sanitized.includes('MEDIO') || sanitized.includes('MEDIUM')) return 'P3';
  if (sanitized.includes('BAIXO') || sanitized.includes('LOW')) return 'P4';

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