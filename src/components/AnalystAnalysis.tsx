import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { 
  X, 
  AlertTriangle, 
  ExternalLink, 
  Filter, 
  Users,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Incident } from '../types/incident';
import { parseISO, isWithinInterval, format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IncidentDetails } from './IncidentDetails';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';
import { normalizeLocationName } from '../utils/locationUtils';
import { AnalystPerformanceChart } from './AnalystPerformanceChart';
import { MonthlyIncidentsChart } from './MonthlyIncidentsChart';

interface AnalystAnalysisProps {
  incidents: Incident[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

interface IncidentModalProps {
  incidents: Incident[];
  analyst: string;
  onClose: () => void;
  startDate?: string;
  endDate?: string;
}

interface AnalystData {
  name: string;
  total: number;
  P1: number;
  P2: number;
  P3: number;
  P4: number;
  undefined: number;
  openIncidents: number;
  criticalPending: number;
  withinSLA: number;
  outsideSLA: number;
  groups: Set<string>;
  states: {
    Aberto: number;
    'Em Andamento': number;
    Fechado: number;
  };
  groupCount?: number;
  slaPercentage?: number;
  [key: string]: any; // Para permitir indexação dinâmica
}

interface AnalystStates {
  Aberto: number;
  'Em Andamento': number;
  Fechado: number;
  [key: string]: number; // Para permitir indexação dinâmica
}

const STATUS_OPTIONS = [
  { 
    value: '', 
    label: 'Todos os Estados',
    icon: Filter,
    color: 'text-gray-400'
  },
  { 
    value: 'Aberto', 
    label: 'Em Aberto',
    icon: AlertCircle,
    color: 'text-yellow-400'
  },
  { 
    value: 'Em Andamento', 
    label: 'Em Andamento',
    icon: Clock,
    color: 'text-blue-400'
  },
  { 
    value: 'Fechado', 
    label: 'Fechados',
    icon: CheckCircle2,
    color: 'text-green-400'
  }
];

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

const SLA_THRESHOLDS = {
  P1: 1,   // 1 hour
  P2: 4,   // 4 hours
  P3: 36,  // 36 hours
  P4: 72   // 72 hours
};

const ANALYST_NAME_MAPPING: Record<string, string> = {
  'Anderson': 'Matheus Borges Brandao',
  'Goncales': 'Matheus Borges Brandao',
  // Add more mappings as needed
};

// Função para obter o nome original do analista
const getOriginalAnalystName = (normalizedName: string): string => {
  // Procurar nas entradas do mapeamento
  for (const [original, normalized] of Object.entries(ANALYST_NAME_MAPPING)) {
    if (normalized === normalizedName) {
      return original;
    }
  }
  return normalizedName;
};

const normalizeAnalystName = (name: string): string => {
  return ANALYST_NAME_MAPPING[name] || name;
};

function IncidentModal({ incidents, analyst, onClose, startDate, endDate }: IncidentModalProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [monthlyIncidents, setMonthlyIncidents] = useState<Incident[] | null>(null);

  const filteredIncidents = useMemo(() => {
    let filtered = monthlyIncidents || incidents;
    
    if (!selectedStatus) return filtered;
    return filtered.filter(incident => 
      getIncidentState(incident.State) === selectedStatus
    );
  }, [incidents, selectedStatus, monthlyIncidents]);

  const handleMonthSelect = (monthIncidents: Incident[]) => {
    setMonthlyIncidents(monthIncidents);
  };

  const clearMonthFilter = () => {
    setMonthlyIncidents(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const getStatusColor = (state: string) => {
    const normalizedState = getIncidentState(state);
    if (normalizedState === 'Fechado') return 'bg-green-500/20 text-green-400';
    if (normalizedState === 'Em Andamento') return 'bg-blue-500/20 text-blue-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Chamados de {analyst}
                {monthlyIncidents && (
                  <button
                    onClick={clearMonthFilter}
                    className="ml-2 text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    (Limpar filtro mensal)
                  </button>
                )}
              </h2>
              <p className="text-gray-400 mt-1">
                {filteredIncidents.length} chamados encontrados
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          </div>

          <div className="flex gap-2 items-center">
            {STATUS_OPTIONS.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors
                    ${option.value === selectedStatus 
                      ? `${option.color} bg-[#0B1120] border border-current` 
                      : 'text-gray-400 hover:text-white hover:bg-[#1C2333]'}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </button>
              );
            })}
            <div className="ml-4 border-l border-gray-700 pl-4">
              <MonthlyIncidentsChart
                incidents={incidents}
                startDate={startDate}
                endDate={endDate}
                onBarClick={handleMonthSelect}
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-auto max-h-[calc(90vh-200px)]">
          <table className="w-full">
            <thead className="bg-[#1C2333] sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Número</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Data</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Descrição</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Solicitante</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Prioridade</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredIncidents.map((incident) => (
                <tr 
                  key={incident.Number} 
                  className="hover:bg-[#1C2333] transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-white">{incident.Number}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{formatDate(incident.Opened)}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{incident.ShortDescription}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{incident.Caller}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="text-sm" style={{ color: CHART_COLORS[normalizePriority(incident.Priority) as keyof typeof CHART_COLORS] }}>
                      {incident.Priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.State)}`}>
                      {incident.State}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => setSelectedIncident(incident)}
                      className="text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIncident && (
        <IncidentDetails
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}

export function AnalystAnalysis({ incidents, onClose, startDate, endDate }: AnalystAnalysisProps) {
  const [selectedAnalyst, setSelectedAnalyst] = useState<string | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedIncidents, setSelectedIncidents] = useState<Incident[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('');

  const analystData = useMemo(() => {
    const filteredIncidents = incidents.filter(incident => {
      if (!startDate || !endDate) return true;
      
      try {
        const incidentDate = parseISO(incident.Opened);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        return isWithinInterval(incidentDate, { start, end });
      } catch (error) {
        return false;
      }
    });

    const data: Record<string, AnalystData> = {};

    filteredIncidents.forEach(incident => {
      const analyst = normalizeAnalystName(incident.AssignedTo || 'Não atribuído');
      const priority = normalizePriority(incident.Priority);
      const state = getIncidentState(incident.State);
      
      if (!data[analyst]) {
        data[analyst] = {
          name: analyst,
          total: 0,
          P1: 0,
          P2: 0,
          P3: 0,
          P4: 0,
          undefined: 0,
          openIncidents: 0,
          criticalPending: 0,
          withinSLA: 0,
          outsideSLA: 0,
          groups: new Set<string>(),
          states: {
            Aberto: 0,
            'Em Andamento': 0,
            Fechado: 0
          }
        };
      }

      data[analyst].total++;
      if (priority in data[analyst]) {
        data[analyst][priority]++;
      }
      if (state in data[analyst].states) {
        (data[analyst].states as AnalystStates)[state]++;
      }

      if (state !== 'Fechado') {
        data[analyst].openIncidents++;
        if (priority === 'P1' || priority === 'P2') {
          data[analyst].criticalPending++;
        }
      }

      if (incident.AssignmentGroup) {
        data[analyst].groups.add(normalizeLocationName(incident.AssignmentGroup));
      }

      const threshold = SLA_THRESHOLDS[priority as keyof typeof SLA_THRESHOLDS] || 36;
      try {
        const opened = parseISO(incident.Opened);
        const lastUpdate = incident.Updated ? parseISO(incident.Updated) : new Date();
        const responseTime = differenceInHours(lastUpdate, opened);
        if (responseTime <= threshold) {
          data[analyst].withinSLA++;
        } else {
          data[analyst].outsideSLA++;
        }
      } catch (error) {
        data[analyst].outsideSLA++;
      }
    });

    return Object.values(data)
      .map(analyst => ({
        ...analyst,
        groupCount: analyst.groups.size,
        slaPercentage: ((analyst.withinSLA / (analyst.withinSLA + analyst.outsideSLA)) * 100) || 0
      }))
      .filter(analyst => {
        if (!selectedStatus) return true;
        return analyst.states[selectedStatus as keyof typeof analyst.states] > 0;
      })
      .sort((a, b) => b.total - a.total);
  }, [incidents, startDate, endDate, selectedStatus]);

  const handleAnalystClick = (analyst: string) => {
    try {
      // Filtrar incidentes usando o nome do analista
      const analystIncidents = incidents.filter(incident => {
        const assignedTo = incident.AssignedTo || '';
        return assignedTo === analyst;
      });

      if (analystIncidents.length === 0) {
        console.warn(`Nenhum incidente encontrado para o analista: ${analyst}`);
        return;
      }

      setSelectedIncidents(analystIncidents);
      setSelectedAnalyst(analyst);
      setShowIncidentModal(true);
    } catch (error) {
      console.error('Erro ao processar clique do analista:', error);
    }
  };

  if (analystData.length === 0) {
    return (
      <div className="bg-[#151B2B] p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Análise por Analista</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          )}
        </div>
        <div className="text-center py-8">
          <p className="text-gray-400">Nenhum incidente encontrado no período selecionado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Análise por Analista</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
              aria-label="Fechar análise"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between">
          <div className="flex gap-2 items-center">
            {STATUS_OPTIONS.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap
                    ${option.value === selectedStatus 
                      ? `${option.color} bg-[#0B1120] border border-current` 
                      : 'text-gray-400 hover:text-white hover:bg-[#1C2333]'}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
          <div className="border-l border-gray-700 pl-4 ml-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Evolução Mensal</span>
              <MonthlyIncidentsChart
                incidents={incidents}
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Distribuição por Analista</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analystData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fill: '#9CA3AF' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={({ x, y, payload }) => {
                    const analyst = analystData.find(a => a.name === payload.value);
                    const hasCriticalPending = analyst?.criticalPending ?? 0 > 0;
                    return (
                      <text 
                        x={x} 
                        y={y} 
                        dy={4} 
                        textAnchor="end" 
                        fill={hasCriticalPending ? '#FDE047' : '#9CA3AF'}
                        fontWeight={hasCriticalPending ? 'bold' : 'normal'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleAnalystClick(payload.value)}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Bar dataKey="P1" name="Crítico" fill={CHART_COLORS.P1} stackId="stack" />
                <Bar dataKey="P2" name="Alto" fill={CHART_COLORS.P2} stackId="stack" />
                <Bar dataKey="P3" name="Médio" fill={CHART_COLORS.P3} stackId="stack" />
                <Bar dataKey="P4" name="Baixo" fill={CHART_COLORS.P4} stackId="stack" />
                <Bar dataKey="undefined" name="Não definido" fill={CHART_COLORS['Não definido']} stackId="stack" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analystData.map(analyst => (
            <div 
              key={analyst.name}
              className="bg-[#1C2333] p-4 rounded-lg cursor-pointer hover:bg-[#1F2937] transition-colors"
              onClick={() => handleAnalystClick(analyst.name)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-white truncate">{analyst.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm text-gray-400">
                      {analyst.groupCount} {analyst.groupCount === 1 ? 'grupo' : 'grupos'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-white">{analyst.total}</span>
                  <p className="text-sm text-gray-400">chamados</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <span className="text-yellow-400">{analyst.states.Aberto}</span>
                    <p className="text-gray-400 text-xs">Abertos</p>
                  </div>
                  <div className="text-center">
                    <span className="text-blue-400">{analyst.states['Em Andamento']}</span>
                    <p className="text-gray-400 text-xs">Em Andamento</p>
                  </div>
                  <div className="text-center">
                    <span className="text-green-400">{analyst.states.Fechado}</span>
                    <p className="text-gray-400 text-xs">Fechados</p>
                  </div>
                </div>

                {analyst.criticalPending > 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{analyst.criticalPending} críticos pendentes</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">SLA</span>
                  </div>
                  <span className={`font-medium ${
                    analyst.slaPercentage >= 95 ? 'text-green-400' :
                    analyst.slaPercentage >= 85 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {analyst.slaPercentage.toFixed(1)}%
                  </span>
                </div>

                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  {['P1', 'P2', 'P3', 'P4'].map((priority) => {
                    const width = (analyst[priority as keyof typeof analyst] as number / analyst.total) * 100;
                    return (
                      <div
                        key={priority}
                        className="h-full float-left"
                        style={{
                          width: `${width}%`,
                          backgroundColor: CHART_COLORS[priority as keyof typeof CHART_COLORS]
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedAnalyst && (
        <AnalystPerformanceChart
          incidents={incidents}
          analyst={selectedAnalyst}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      {showIncidentModal && (
        <IncidentModal
          incidents={selectedIncidents}
          analyst={selectedAnalyst!}
          onClose={() => {
            setShowIncidentModal(false);
            setSelectedAnalyst(null);
          }}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  );
}