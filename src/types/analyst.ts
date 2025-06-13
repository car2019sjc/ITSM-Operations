export interface Analyst {
  name: string;
  level: string;
  startTime: string;
  endTime: string;
  schedule: string;
  location?: string;
}

export interface AnalystShift {
  location: string;
  level: string;
  startTime: string;
  endTime: string;
  schedule: string;
  expectedTotal?: number;
  analysts?: string[];
}

export interface ShiftHistoryData {
  shift: string;
  level: string;
  schedule: string;
  analysts: string[];
  total: number;
  P1: number;
  P2: number;
  P3: number;
  P4: number;
  undefined: number;
}

export const SHIFTS = {
  MORNING: {
    name: 'Manhã',
    startTime: '06:00',
    endTime: '14:00'
  },
  AFTERNOON: {
    name: 'Tarde',
    startTime: '14:00',
    endTime: '22:00'
  },
  NIGHT: {
    name: 'Noite',
    startTime: '22:00',
    endTime: '06:00'
  }
} as const;

export const SHIFT_LEVELS = {
  N1: 'N1 - Suporte Local',
  N2: 'N2 - Infraestrutura',
  N3: 'N3 - Especialista'
} as const;

export const SHIFT_SCHEDULES = {
  BUSINESS: '5x2',
  CONTINUOUS: '24x7'
} as const;