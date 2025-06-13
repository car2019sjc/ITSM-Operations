import React, { useMemo, useState } from 'react';
import { 
  Building2, 
  Network, 
  Phone, 
  TicketIcon,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  AlertCircle,
  PauseCircle,
  Users,
  X
} from 'lucide-react';
import { Incident } from '../types/incident';
import { normalizePriority, getIncidentState, isCancelled } from '../utils/incidentUtils';
import { IncidentDetails } from './IncidentDetails';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeLocationName } from '../utils/locationUtils';

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

interface QueueStats {
  total: number;
  P1: number;
  P2: number;
  P3: number;
  P4: number;
  undefined: number;
  open: number;
  inProgress: number;
  onHold: number;
}

interface SupportQueuesAnalysisProps {
  incidents: Incident[];
}

interface IncidentModalProps {
  incidents: Incident[];
  queueName: string;
  onClose: () => void;
}

const QUEUE_GROUPS = {
  'N1 Local': {
    groups: [
      'SA-Local Sup',
      'Berrini-Local Sup',
      'SC-Local Sup',
      'BA-Local Sup',
      'BR-Local Sup'
    ],
    categories: ['Hardware', 'Software', 'Service Support']
  },
  'Asset\'s Manager': {
    groups: ['BR-Net/Tel'],
    categories: ['Network', 'Hardware']
  },
  'Ticket Manager': {
    groups: ['BR-TM'],
    categories: ['Service Support', 'Opened']
  },
  'N2 - Internet': {
    groups: [
      'BA-Net/Tel',
      'SA-Net/Tel',
      'Berrini-Net/Tel'
    ],
    categories: ['Network', 'Cloud', 'IT Security']
  }
};

const QUEUE_ICONS = {
  'N1 Local': Building2,
  'Asset\'s Manager': Phone,
  'Ticket Manager': TicketIcon,
  'N2 - Internet': Network
};

const QUEUE_COLORS = {
  'N1 Local': {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/50',
    text: 'text-indigo-400',
    hover: 'hover:bg-indigo-500/20'
  },
  'Asset\'s Manager': {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    hover: 'hover:bg-purple-500/20'
  },
  'Ticket Manager': {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/50',
    text: 'text-emerald-400',
    hover: 'hover:bg-emerald-500/20'
  },
  'N2 - Internet': {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/50',
    text: 'text-orange-400',
    hover: 'hover:bg-orange-500/20'
  }
};

const STATUS_OPTIONS = [
  { 
    value: 'open', 
    label: 'Em Aberto',
    icon: AlertCircle,
    styles: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/50',
      hover: 'hover:bg-yellow-500/20'
    }
  },
  { 
    value: 'inProgress', 
    label: 'Em Andamento',
    icon: Clock,
    styles: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/50',
      hover: 'hover:bg-blue-500/20'
    }
  },
  { 
    value: 'onHold', 
    label: 'Em Espera',
    icon: PauseCircle,
    styles: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border-orange-500/50',
      hover: 'hover:bg-orange-500/20'
    }
  }
];

function IncidentModal({ incidents, queueName, onClose }: IncidentModalProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Chamados em {queueName}
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Categoria</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Subcategoria</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Grupo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Prioridade</th>
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
                  <td className="px-4 py-3 text-sm text-gray-300">{incident.Category}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{incident.Subcategory}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{normalizeLocationName(incident.AssignmentGroup)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="text-sm" style={{ color: CHART_COLORS[normalizePriority(incident.Priority) as keyof typeof CHART_COLORS] }}>
                      {incident.Priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      incident.State?.toLowerCase().includes('progress') ? 'bg-blue-500/20 text-blue-400' :
                      incident.State?.toLowerCase().includes('hold') ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
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

export function SupportQueuesAnalysis({ incidents }: SupportQueuesAnalysisProps) {
  const [selectedStatus, setSelectedStatus] = useState('open');
  const [selectedQueueIncidents, setSelectedQueueIncidents] = useState<Incident[] | null>(null);
  const [selectedQueueName, setSelectedQueueName] = useState<string>('');

  const queueStats = useMemo(() => {
    const stats = {} as Record<string, QueueStats>;

    // Initialize stats for each queue
    Object.keys(QUEUE_GROUPS).forEach(queueName => {
      stats[queueName] = {
        total: 0,
        P1: 0,
        P2: 0,
        P3: 0,
        P4: 0,
        undefined: 0,
        open: 0,
        inProgress: 0,
        onHold: 0
      };
    });

    // Process incidents
    incidents.forEach(incident => {
      // Skip cancelled incidents
      if (isCancelled(incident.State)) {
        return;
      }

      // Skip closed incidents
      const state = incident.State?.toLowerCase() || '';
      if (state.includes('closed') || state.includes('resolved')) {
        return;
      }

      // Normalize the assignment group
      const normalizedGroup = normalizeLocationName(incident.AssignmentGroup || '');

      // First check if incident belongs to Ticket Manager
      if (normalizedGroup === 'BR-TM') {
        const queueStat = stats['Ticket Manager'];
        queueStat.total++;

        // Count by priority
        const priority = normalizePriority(incident.Priority);
        queueStat[priority]++;

        // Count by status
        if (state.includes('progress') || state.includes('assigned')) {
          queueStat.inProgress++;
        } else if (state.includes('hold') || state.includes('pending') || state.includes('aguardando')) {
          queueStat.onHold++;
        } else {
          queueStat.open++;
        }
        return; // Skip further processing
      }

      // Then check if incident belongs to Asset's Manager
      if (normalizedGroup === 'BR-Net/Tel') {
        const queueStat = stats['Asset\'s Manager'];
        queueStat.total++;

        // Count by priority
        const priority = normalizePriority(incident.Priority);
        queueStat[priority]++;

        // Count by status
        if (state.includes('progress') || state.includes('assigned')) {
          queueStat.inProgress++;
        } else if (state.includes('hold') || state.includes('pending') || state.includes('aguardando')) {
          queueStat.onHold++;
        } else {
          queueStat.open++;
        }
        return; // Skip further processing
      }

      // For other queues, check their groups
      Object.entries(QUEUE_GROUPS).forEach(([queueName, { groups }]) => {
        if (queueName !== 'Ticket Manager' && 
            queueName !== 'Asset\'s Manager' && // Skip already handled queues
            groups.some(group => normalizedGroup === group)) {
          const queueStat = stats[queueName];
          queueStat.total++;

          // Count by priority
          const priority = normalizePriority(incident.Priority);
          queueStat[priority]++;

          // Count by status
          if (state.includes('progress') || state.includes('assigned')) {
            queueStat.inProgress++;
          } else if (state.includes('hold') || state.includes('pending') || state.includes('aguardando')) {
            queueStat.onHold++;
          } else {
            queueStat.open++;
          }
        }
      });
    });

    return stats;
  }, [incidents]);

  const getQueueIncidents = (queueName: string) => {
    return incidents.filter(incident => {
      // Skip cancelled incidents
      if (isCancelled(incident.State)) {
        return false;
      }

      const state = incident.State?.toLowerCase() || '';
      
      // Skip closed incidents
      if (state.includes('closed') || state.includes('resolved')) {
        return false;
      }

      // Filter by status
      if (selectedStatus === 'inProgress' && !(state.includes('progress') || state.includes('assigned'))) {
        return false;
      }
      if (selectedStatus === 'onHold' && !(state.includes('hold') || state.includes('pending') || state.includes('aguardando'))) {
        return false;
      }
      if (selectedStatus === 'open' && (state.includes('progress') || state.includes('assigned') || state.includes('hold') || state.includes('pending') || state.includes('aguardando'))) {
        return false;
      }

      // Normalize the assignment group
      const normalizedGroup = normalizeLocationName(incident.AssignmentGroup || '');

      // For Ticket Manager, check if assignment group includes the name
      if (queueName === 'Ticket Manager') {
        return normalizedGroup === 'BR-TM';
      }

      // For Asset's Manager, check if assignment group includes the name
      if (queueName === 'Asset\'s Manager') {
        return normalizedGroup === 'BR-Net/Tel';
      }

      // For other queues, check their groups
      const { groups } = QUEUE_GROUPS[queueName as keyof typeof QUEUE_GROUPS];
      return groups.some(group => normalizedGroup === group);
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(QUEUE_GROUPS).map(([queueName, { categories }]) => {
        const Icon = QUEUE_ICONS[queueName as keyof typeof QUEUE_ICONS];
        const colors = QUEUE_COLORS[queueName as keyof typeof QUEUE_COLORS];
        const stats = queueStats[queueName];
        const queueIncidents = getQueueIncidents(queueName);

        // Get count based on selected status
        const displayCount = selectedStatus === 'open' ? stats.open :
                           selectedStatus === 'inProgress' ? stats.inProgress :
                           selectedStatus === 'onHold' ? stats.onHold : 0;

        // Always show Ticket Manager and Asset's Manager, even with no incidents
        if (displayCount === 0 && queueName !== 'Ticket Manager' && queueName !== 'Asset\'s Manager') return null;

        const statusOption = STATUS_OPTIONS.find(opt => opt.value === selectedStatus)!;
        const StatusIcon = statusOption.icon;

        return (
          <div 
            key={queueName}
            className={`
              ${colors.bg} rounded-lg border ${colors.border} p-6
              transition-all hover:scale-[1.02] cursor-pointer
            `}
            onClick={() => {
              const incidents = getQueueIncidents(queueName);
              setSelectedQueueIncidents(incidents);
              setSelectedQueueName(queueName);
            }}
          >
            <div className="flex items-center gap-4 mb-4">
              <Icon className={`h-8 w-8 ${colors.text}`} />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white">{queueName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Users className={`h-4 w-4 ${colors.text}`} />
                  <p className={`text-sm ${colors.text}`}>
                    {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <StatusIcon className={`h-5 w-5 ${statusOption.styles.text}`} />
              <div className="flex-1">
                <p className={`text-3xl font-bold ${colors.text}`}>
                  {displayCount}
                </p>
                <p className="text-sm text-gray-400">
                  {statusOption.label}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['P1', 'P2', 'P3', 'P4'].map(priority => (
                <div 
                  key={priority}
                  className={`text-center p-2 rounded-lg ${colors.bg} border ${colors.border}`}
                >
                  <p className={`text-sm ${colors.text}`}>{priority}</p>
                  <p className="text-white font-medium">
                    {stats[priority as keyof QueueStats]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Status Filter */}
      <div className="md:col-span-2 flex gap-2 mt-2">
        {STATUS_OPTIONS.map(option => {
          const Icon = option.icon;
          const isSelected = option.value === selectedStatus;
          return (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all
                ${isSelected 
                  ? `${option.styles.bg} ${option.styles.text} border ${option.styles.border}` 
                  : `text-gray-400 hover:text-white ${option.styles.hover}`}
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {selectedQueueIncidents && (
        <IncidentModal
          incidents={selectedQueueIncidents}
          queueName={selectedQueueName}
          onClose={() => {
            setSelectedQueueIncidents(null);
            setSelectedQueueName('');
          }}
        />
      )}
    </div>
  );
}