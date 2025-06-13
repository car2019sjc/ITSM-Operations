export interface Request {
  Number: string;
  Opened: string;
  ShortDescription: string;
  Description: string;
  RequestItem: string;
  RequestedForName: string;
  Priority: string;
  State: string;
  AssignmentGroup: string;
  AssignedTo: string;
  Updated: string;
  UpdatedBy: string;
  CommentsAndWorkNotes: string;
  BusinessImpact: string;
  [key: string]: string; // Add index signature to allow for dynamic field access
}

export interface RequestStats {
  totalByCategory: Record<string, number>;
  totalByAssignmentGroup: Record<string, number>;
  totalByPriority: Record<string, number>;
  totalByStatus: Record<string, number>;
  topRequesters: Array<{ requester: string; count: number }>;
  completionMetrics: {
    onTime: number;
    late: number;
    pending: number;
    total: number;
  };
}

export const REQUEST_PRIORITIES = {
  HIGH: 'Alta',
  MEDIUM: 'Média', 
  LOW: 'Baixa'
} as const;

export const REQUEST_STATUSES = {
  NEW: 'Novo',
  IN_PROGRESS: 'Em Andamento',
  ON_HOLD: 'Em Espera',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado'
} as const;

export const normalizeRequestPriority = (priority: string): keyof typeof REQUEST_PRIORITIES => {
  if (!priority) return 'MEDIUM';
  
  const p = priority.toLowerCase().trim();
  
  if (p.includes('high') || p.includes('alta') || p.includes('urgent') || p.includes('urgente') || 
      p.includes('p1') || p.includes('1') || p.startsWith('1 -')) {
    return 'HIGH';
  }
  
  if (p.includes('low') || p.includes('baixa') || p.includes('p4') || p.includes('4') || p.startsWith('4 -')) {
    return 'LOW';
  }
  
  return 'MEDIUM';
};

export const normalizeRequestStatus = (status: string): keyof typeof REQUEST_STATUSES => {
  if (!status) return 'NEW';
  
  const s = status.toLowerCase().trim();
  
  if (s.includes('open') || s.includes('aberto')) {
    return 'ON_HOLD';
  }
  
  if (s.includes('progress') || s.includes('andamento') || s.includes('assigned')) {
    return 'IN_PROGRESS';
  }
  
  if (s.includes('completed') || s.includes('concluído') || s.includes('done') || 
      s.includes('closed complete') || s.includes('fechado completo')) {
    return 'COMPLETED';
  }
  
  if (s.includes('cancelled') || s.includes('cancelado') || 
      s.includes('closed incomplete') || s.includes('closed skipped')) {
    return 'CANCELLED';
  }
  
  if (s.includes('on hold') || s.includes('hold') || s.includes('espera') || 
      s.includes('pending') || s.includes('aguardando')) {
    return 'ON_HOLD';
  }
  
  return 'NEW';
};

export const isRequestActive = (status: string): boolean => {
  const normalizedStatus = normalizeRequestStatus(status);
  return ![
    'COMPLETED',
    'CANCELLED'
  ].includes(normalizedStatus);
};

export const isRequestHighPriority = (priority: string): boolean => {
  return normalizeRequestPriority(priority) === 'HIGH';
};