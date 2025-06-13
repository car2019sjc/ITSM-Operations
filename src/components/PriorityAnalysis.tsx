import React, { useMemo, useState } from 'react';
import { X, AlertTriangle, ExternalLink } from 'lucide-react';
import { Incident } from '../types/incident';
import { parseISO, isWithinInterval, format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IncidentDetails } from './IncidentDetails';
import { getIncidentState, normalizePriority, isCancelled } from '../utils/incidentUtils';

interface PriorityAnalysisProps {
  incidents: Incident[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

interface IncidentModalProps {
  incidents: Incident[];
  priority: string;
  state: string;
  onClose: () => void;
}

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

const SLA_THRESHOLDS = {
  P1: 1,  // 1 hour
  P2: 4,  // 4 hours
  P3: 24, // 24 hours
  P4: 48  // 48 hours
};

function IncidentModal({ incidents, priority, state, onClose }: IncidentModalProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

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
    if (normalizedState === 'On Hold') return 'bg-orange-500/20 text-orange-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Chamados {priority} - {state}
            </h2>
            <p className="text-gray-400 mt-1">
              {incidents.length} chamados encontrados
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        </div>
        
        <div className="overflow-auto max-h-[calc(90vh-120px)]">
          <table className="w-full">
            <thead className="bg-[#1C2333] sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Número</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Data</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Descrição</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Solicitante</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Grupo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {incidents.map((incident) => (
                <tr 
                  key={incident.Number} 
                  className="hover:bg-[#1C2333] transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-white">{incident.Number}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{formatDate(incident.Opened)}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{incident.ShortDescription}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{incident.Caller}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{incident.AssignmentGroup}</td>
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

export function PriorityAnalysis({ incidents, onClose, startDate, endDate }: PriorityAnalysisProps) {
  const [selectedIncidents, setSelectedIncidents] = useState<Incident[] | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');

  const priorityData = useMemo(() => {
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

    // Initialize data structure with all priority levels
    const data = {
      P1: {
        priority: 'P1',
        total: 0,
        Aberto: 0,
        'Em Andamento': 0,
        'On Hold': 0,
        Fechado: 0,
        withinSLA: 0,
        outsideSLA: 0,
        groups: new Set<string>()
      },
      P2: {
        priority: 'P2',
        total: 0,
        Aberto: 0,
        'Em Andamento': 0,
        'On Hold': 0,
        Fechado: 0,
        withinSLA: 0,
        outsideSLA: 0,
        groups: new Set<string>()
      },
      P3: {
        priority: 'P3',
        total: 0,
        Aberto: 0,
        'Em Andamento': 0,
        'On Hold': 0,
        Fechado: 0,
        withinSLA: 0,
        outsideSLA: 0,
        groups: new Set<string>()
      },
      P4: {
        priority: 'P4',
        total: 0,
        Aberto: 0,
        'Em Andamento': 0,
        'On Hold': 0,
        Fechado: 0,
        withinSLA: 0,
        outsideSLA: 0,
        groups: new Set<string>()
      },
      'Não definido': {
        priority: 'Não definido',
        total: 0,
        Aberto: 0,
        'Em Andamento': 0,
        'On Hold': 0,
        Fechado: 0,
        withinSLA: 0,
        outsideSLA: 0,
        groups: new Set<string>()
      }
    };

    // Process each incident
    filteredIncidents.forEach(incident => {
      const priority = normalizePriority(incident.Priority);
      const state = getIncidentState(incident.State);
      
      // Skip cancelled incidents
      if (isCancelled(incident.State)) {
        return;
      }

      // Update counters
      data[priority].total++;
      data[priority][state]++;

      // Track groups
      if (incident.AssignmentGroup) {
        data[priority].groups.add(incident.AssignmentGroup);
      }

      // Calculate SLA compliance
      const threshold = SLA_THRESHOLDS[priority as keyof typeof SLA_THRESHOLDS] || 24;
      try {
        const responseTime = differenceInHours(parseISO(incident.Updated), parseISO(incident.Opened));
        if (responseTime <= threshold) {
          data[priority].withinSLA++;
        } else {
          data[priority].outsideSLA++;
        }
      } catch (error) {
        data[priority].outsideSLA++;
      }
    });

    // Convert to array and sort by priority
    return Object.values(data);
  }, [incidents, startDate, endDate]);

  const handleStateClick = (priority: string, state: string) => {
    const filteredIncidents = incidents.filter(incident => {
      const matchesPriority = normalizePriority(incident.Priority) === priority;
      const matchesState = getIncidentState(incident.State) === state;
      const notCancelled = !isCancelled(incident.State);
      return matchesPriority && matchesState && notCancelled;
    });

    setSelectedIncidents(filteredIncidents);
    setSelectedPriority(priority);
    setSelectedState(state);
  };

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Análise por Prioridade</h2>
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {priorityData.map(data => (
          <div 
            key={data.priority}
            className="bg-[#1C2333] p-4 rounded-lg"
            style={{ borderLeft: `4px solid ${CHART_COLORS[data.priority as keyof typeof CHART_COLORS]}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-medium" style={{ color: CHART_COLORS[data.priority as keyof typeof CHART_COLORS] }}>
                {data.priority}
              </h4>
              <span className="text-2xl font-bold text-white">{data.total}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <button 
                  className="text-yellow-400 hover:underline"
                  onClick={() => handleStateClick(data.priority, 'Em Aberto')}
                  disabled={data.Aberto === 0}
                >
                  Em Aberto
                </button>
                <span className="text-white">{data.Aberto}</span>
              </div>
              <div className="flex items-center justify-between">
                <button 
                  className="text-blue-400 hover:underline"
                  onClick={() => handleStateClick(data.priority, 'Em Andamento')}
                  disabled={data['Em Andamento'] === 0}
                >
                  Em Andamento
                </button>
                <span className="text-white">{data['Em Andamento']}</span>
              </div>
              <div className="flex items-center justify-between">
                <button 
                  className="text-orange-400 hover:underline"
                  onClick={() => handleStateClick(data.priority, 'On Hold')}
                  disabled={data['On Hold'] === 0}
                >
                  Em Espera
                </button>
                <span className="text-white">{data['On Hold']}</span>
              </div>
              <div className="flex items-center justify-between">
                <button 
                  className="text-green-400 hover:underline"
                  onClick={() => handleStateClick(data.priority, 'Fechado')}
                  disabled={data.Fechado === 0}
                >
                  Fechados
                </button>
                <span className="text-white">{data.Fechado}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Grupos</span>
                  <span className="text-white">{data.groups.size}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-400">SLA</span>
                  <span className={`${
                    data.withinSLA === 0 && data.outsideSLA === 0 
                      ? 'text-gray-400' 
                      : ((data.withinSLA / (data.withinSLA + data.outsideSLA)) * 100) >= 90
                        ? 'text-green-400'
                        : ((data.withinSLA / (data.withinSLA + data.outsideSLA)) * 100) >= 70
                          ? 'text-yellow-400'
                          : 'text-red-400'
                  }`}>
                    {data.withinSLA === 0 && data.outsideSLA === 0 
                      ? 'N/A'
                      : `${((data.withinSLA / (data.withinSLA + data.outsideSLA)) * 100).toFixed(1)}%`
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedIncidents && (
        <IncidentModal
          incidents={selectedIncidents}
          priority={selectedPriority}
          state={selectedState}
          onClose={() => {
            setSelectedIncidents(null);
            setSelectedPriority('');
            setSelectedState('');
          }}
        />
      )}
    </div>
  );
}