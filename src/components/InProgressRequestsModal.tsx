import React, { useState, useMemo } from 'react';
import { 
  X, 
  Clock, 
  ExternalLink, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  PauseCircle, 
  Calendar, 
  Users, 
  Timer,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { Request } from '../types/request';
import { parseISO, format, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeRequestPriority, normalizeRequestStatus } from '../types/request';
import { normalizeLocationName } from '../utils/locationUtils';

interface InProgressRequestsModalProps {
  requests: Request[];
  onClose: () => void;
}

// SLA thresholds for requests (in days)
const REQUEST_SLA_THRESHOLDS = {
  HIGH: 3,    // 3 days
  MEDIUM: 5,  // 5 days
  LOW: 7      // 7 days
};

const CHART_COLORS = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#10B981'
};

const STATUS_OPTIONS = [
  { 
    value: '', 
    label: 'Todos os Estados',
    icon: Filter,
    color: 'text-gray-400'
  },
  { 
    value: 'IN_PROGRESS', 
    label: 'Em Andamento',
    icon: Clock,
    color: 'text-blue-400'
  },
  { 
    value: 'ON_HOLD', 
    label: 'Em Espera',
    icon: PauseCircle,
    color: 'text-orange-400'
  }
];

export function InProgressRequestsModal({ requests, onClose }: InProgressRequestsModalProps) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'sla'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const inProgressRequests = useMemo(() => {
    return requests.filter(request => {
      const status = normalizeRequestStatus(request.State);
      return status === 'IN_PROGRESS' || status === 'NEW';
    });
  }, [requests]);

  const filteredRequests = useMemo(() => {
    let result = inProgressRequests;
    
    // Filter by selected status
    if (selectedStatus) {
      if (selectedStatus === 'ON_HOLD') {
        result = result.filter(request => {
          const state = request.State?.toLowerCase() || '';
          return state.includes('hold') || state.includes('pending') || state.includes('aguardando');
        });
      } else if (selectedStatus === 'IN_PROGRESS') {
        result = result.filter(request => {
          const state = request.State?.toLowerCase() || '';
          return !state.includes('hold') && !state.includes('pending') && !state.includes('aguardando');
        });
      }
    }
    
    // Sort the results
    return result.sort((a, b) => {
      if (sortBy === 'date') {
        try {
          const dateA = parseISO(a.Opened);
          const dateB = parseISO(b.Opened);
          return sortDirection === 'asc' 
            ? dateA.getTime() - dateB.getTime() 
            : dateB.getTime() - dateA.getTime();
        } catch (error) {
          return 0;
        }
      } else if (sortBy === 'priority') {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        const priorityA = normalizeRequestPriority(a.Priority);
        const priorityB = normalizeRequestPriority(b.Priority);
        return sortDirection === 'asc'
          ? priorityOrder[priorityA] - priorityOrder[priorityB]
          : priorityOrder[priorityB] - priorityOrder[priorityA];
      } else if (sortBy === 'sla') {
        const slaA = getSLAStatus(a);
        const slaB = getSLAStatus(b);
        return sortDirection === 'asc'
          ? slaA.percentage - slaB.percentage
          : slaB.percentage - slaA.percentage;
      }
      return 0;
    });
  }, [inProgressRequests, selectedStatus, sortBy, sortDirection]);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const getSLAStatus = (request: Request) => {
    try {
      const priority = normalizeRequestPriority(request.Priority);
      const threshold = REQUEST_SLA_THRESHOLDS[priority] || 5; // Default to 5 days
      
      const opened = parseISO(request.Opened);
      const now = new Date();
      const daysElapsed = differenceInDays(now, opened);
      
      // Calculate percentage of SLA consumed
      const percentage = Math.min(100, Math.round((daysElapsed / threshold) * 100));
      
      let status: 'normal' | 'warning' | 'critical';
      let color: string;
      
      if (percentage >= 100) {
        status = 'critical';
        color = 'text-red-400';
      } else if (percentage >= 75) {
        status = 'warning';
        color = 'text-yellow-400';
      } else {
        status = 'normal';
        color = 'text-green-400';
      }
      
      return {
        days: daysElapsed,
        threshold,
        percentage,
        status,
        color,
        remaining: Math.max(0, threshold - daysElapsed)
      };
    } catch (error) {
      return {
        days: 0,
        threshold: 0,
        percentage: 0,
        status: 'normal' as const,
        color: 'text-gray-400',
        remaining: 0
      };
    }
  };

  const getStatusColor = (state: string) => {
    const s = state?.toLowerCase() || '';
    if (s.includes('hold') || s.includes('pending') || s.includes('aguardando')) {
      return 'bg-orange-500/20 text-orange-400';
    }
    return 'bg-blue-500/20 text-blue-400';
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleSortChange = (newSortBy: 'date' | 'priority' | 'sla') => {
    if (sortBy === newSortBy) {
      toggleSortDirection();
    } else {
      setSortBy(newSortBy);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (column: 'date' | 'priority' | 'sla') => {
    if (sortBy !== column) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Solicitações em Andamento
              </h2>
              <p className="text-gray-400 mt-1">
                {filteredRequests.length} solicitações encontradas
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(option => {
              const Icon = option.icon;
              const count = option.value === 'IN_PROGRESS' 
                ? inProgressRequests.filter(r => {
                    const state = r.State?.toLowerCase() || '';
                    return !state.includes('hold') && !state.includes('pending') && !state.includes('aguardando');
                  }).length
                : option.value === 'ON_HOLD'
                ? inProgressRequests.filter(r => {
                    const state = r.State?.toLowerCase() || '';
                    return state.includes('hold') || state.includes('pending') || state.includes('aguardando');
                  }).length
                : inProgressRequests.length;
              
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
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-[#151B2B] text-xs">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="overflow-auto max-h-[calc(90vh-200px)]">
          <table className="w-full">
            <thead className="bg-[#1C2333] sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Número</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                  <button 
                    className="flex items-center gap-1 hover:text-white"
                    onClick={() => handleSortChange('date')}
                  >
                    Data {getSortIcon('date')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Descrição</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Solicitante</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Grupo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                  <button 
                    className="flex items-center gap-1 hover:text-white"
                    onClick={() => handleSortChange('priority')}
                  >
                    Prioridade {getSortIcon('priority')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                  <button 
                    className="flex items-center gap-1 hover:text-white"
                    onClick={() => handleSortChange('sla')}
                  >
                    SLA {getSortIcon('sla')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredRequests.map((request) => {
                const slaStatus = getSLAStatus(request);
                return (
                  <tr 
                    key={request.Number} 
                    className="hover:bg-[#1C2333] transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-white">{request.Number}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{formatDate(request.Opened)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">{request.ShortDescription}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{request.RequestedForName}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{normalizeLocationName(request.AssignmentGroup)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-sm" style={{ 
                        color: CHART_COLORS[normalizeRequestPriority(request.Priority) as keyof typeof CHART_COLORS] 
                      }}>
                        {request.Priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.State)}`}>
                        {request.State}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                slaStatus.status === 'critical' ? 'bg-red-500' :
                                slaStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${slaStatus.percentage}%` }}
                            />
                          </div>
                          <span className={slaStatus.color}>
                            {slaStatus.percentage}%
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 mt-1">
                          {slaStatus.status === 'critical' 
                            ? 'SLA excedido' 
                            : `${slaStatus.remaining} ${slaStatus.remaining === 1 ? 'dia' : 'dias'} restantes`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[70]">
          <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">
                  Solicitação {selectedRequest.Number}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRequest.State)}`}>
                    {selectedRequest.State}
                  </span>
                  <span className="flex items-center gap-1 text-sm" style={{ 
                    color: CHART_COLORS[normalizeRequestPriority(selectedRequest.Priority) as keyof typeof CHART_COLORS] 
                  }}>
                    <AlertCircle className="h-4 w-4" />
                    Prioridade {selectedRequest.Priority}
                  </span>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors ml-2"
                  >
                    <X className="h-5 w-5 text-gray-400 hover:text-white" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg text-white">Descrição Resumida</h3>
              <p className="text-gray-300 mt-2">{selectedRequest.ShortDescription}</p>
              {selectedRequest.Description && (
                <>
                  <h3 className="text-lg text-white mt-4">Descrição Completa</h3>
                  <p className="text-gray-300 mt-2 whitespace-pre-wrap">{selectedRequest.Description}</p>
                </>
              )}
            </div>

            {/* Content - Scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto flex-grow">
              {/* SLA Status */}
              <div className="bg-[#1C2333] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <Timer className="h-5 w-5 text-indigo-400" />
                    <span className="text-white font-medium">
                      Status do SLA
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  {(() => {
                    const slaStatus = getSLAStatus(selectedRequest);
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Progresso do SLA</span>
                          <span className={slaStatus.color}>
                            {slaStatus.percentage}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              slaStatus.status === 'critical' ? 'bg-red-500' :
                              slaStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${slaStatus.percentage}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-400">Tempo Decorrido</p>
                            <p className="text-lg font-medium text-white">
                              {slaStatus.days} {slaStatus.days === 1 ? 'dia' : 'dias'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Prazo SLA</p>
                            <p className="text-lg font-medium text-white">
                              {slaStatus.threshold} {slaStatus.threshold === 1 ? 'dia' : 'dias'}
                            </p>
                          </div>
                        </div>
                        {slaStatus.status === 'critical' ? (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <p className="text-red-400">
                              SLA excedido em {slaStatus.days - slaStatus.threshold} {(slaStatus.days - slaStatus.threshold) === 1 ? 'dia' : 'dias'}
                            </p>
                          </div>
                        ) : (
                          <div className={`${
                            slaStatus.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-green-500/10 border-green-500/20'
                          } border rounded-lg p-3 flex items-center gap-2`}>
                            <Clock className={`h-5 w-5 ${
                              slaStatus.status === 'warning' ? 'text-yellow-500' : 'text-green-500'
                            }`} />
                            <p className={`${
                              slaStatus.status === 'warning' ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                              {slaStatus.remaining} {slaStatus.remaining === 1 ? 'dia' : 'dias'} restantes no SLA
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Comments Section */}
              <div className="bg-[#1C2333] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    <span className="text-white font-medium">
                      Comentários e Notas de Trabalho
                    </span>
                  </div>
                </div>

                <div className="p-4 max-h-[300px] overflow-y-auto">
                  {selectedRequest.CommentsAndWorkNotes ? (
                    <div className="text-gray-300 whitespace-pre-wrap break-words">
                      {selectedRequest.CommentsAndWorkNotes.split('\n').map((line, index) => (
                        <div key={index} className="mb-2">
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">
                      Nenhum comentário ou nota de trabalho disponível.
                    </p>
                  )}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Solicitante</p>
                    <p className="text-white">{selectedRequest.RequestedForName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Grupo Responsável</p>
                    <p className="text-white">{normalizeLocationName(selectedRequest.AssignmentGroup)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Data de Abertura</p>
                    <p className="text-white">{formatDate(selectedRequest.Opened)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Analista Responsável</p>
                    <p className="text-white">{selectedRequest.AssignedTo || 'Não atribuído'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Tipo de Solicitação</p>
                    <p className="text-white">{selectedRequest.RequestItem || 'Não categorizado'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Última Atualização</p>
                    <p className="text-white">
                      {selectedRequest.Updated ? formatDate(selectedRequest.Updated) : 'Não atualizado'}
                    </p>
                    {selectedRequest.UpdatedBy && (
                      <p className="text-sm text-gray-400">por {selectedRequest.UpdatedBy}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-700 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}