import { Incident } from './incident';
import { Request } from './request';

export interface HistoricalData {
  month: string; // Format: YYYY-MM
  incidents: {
    total: number;
    byPriority: {
      P1: number;
      P2: number;
      P3: number;
      P4: number;
      'Não definido': number;
    };
    byCategory: Record<string, number>;
    byState: {
      'Em Aberto': number;
      'Em Andamento': number;
      'Fechado': number;
      'Em Espera': number;
      'Cancelado': number;
    };
    slaCompliance: {
      withinSLA: number;
      outsideSLA: number;
      percentage: number;
    };
  };
  requests: {
    total: number;
    byPriority: {
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    };
    byStatus: {
      NEW: number;
      IN_PROGRESS: number;
      COMPLETED: number;
      CANCELLED: number;
    };
    byCategory: Record<string, number>;
    completionRate: number;
  };
}