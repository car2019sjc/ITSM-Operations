import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, ExternalLink, Filter, AlertCircle, Clock } from 'lucide-react';
import { Incident } from '../types/incident';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IncidentDetails } from './IncidentDetails';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';

interface PendingIncidentsModalProps {
  incidents: Incident[];
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { 
    value: '', 
    label: 'Todos os Estados',
    icon: Filter,
    color: 'text-gray-400',
    count: 19
  },
  { 
    value: 'Aberto', 
    label: 'Em Aberto',
    icon: AlertCircle,
    color: 'text-yellow-400',
    count: 0
  },
  { 
    value: 'Em Andamento', 
    label: 'Em Andamento',
    icon: Clock,
    color: 'text-blue-400',
    count: 0
  }
];

const PRIORITY_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

export function PendingIncidentsModal({ incidents, onClose }: PendingIncidentsModalProps) {
  console.log('[PENDENTES MODAL] Renderizando modal. Incidentes recebidos:', incidents.length, incidents.slice(0, 5));
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');

  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      if (!selectedStatus) return true;
      return getIncidentState(incident.State) === selectedStatus;
    });
  }, [incidents, selectedStatus]);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const getStatusColor = (state: string) => {
    const normalizedState = getIncidentState(state);
    if (normalizedState === 'Em Andamento') return 'bg-blue-500/20 text-blue-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
        <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Chamados Pendentes
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

            <div className="flex gap-2">
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
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-[#151B2B] text-xs">
                      {option.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="overflow-auto max-h-[calc(90vh-200px)]">
            <div className="p-6 space-y-4">
              {filteredIncidents.map((incident) => (
                <div 
                  key={incident.Number}
                  className="bg-[#1C2333] p-4 rounded-lg hover:bg-[#1F2937] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4" style={{ 
                          color: PRIORITY_COLORS[normalizePriority(incident.Priority) as keyof typeof PRIORITY_COLORS] 
                        }} />
                        <span className="font-medium text-white">{incident.Number}</span>
                        <span className="font-medium" style={{ 
                          color: PRIORITY_COLORS[normalizePriority(incident.Priority) as keyof typeof PRIORITY_COLORS] 
                        }}>
                          {incident.Priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.State)}`}>
                          {incident.State}
                        </span>
                        <button
                          onClick={() => setSelectedIncident(incident)}
                          className="ml-auto text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-gray-300 mb-2">{incident.ShortDescription}</p>
                      {incident.CommentsAndWorkNotes && (
                        <div className="mb-2 text-sm text-gray-400 whitespace-pre-wrap">
                          {incident.CommentsAndWorkNotes.split('\n').map((line, index) => (
                            <div key={index} className="mb-2">
                              {line}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedIncident && (
          <IncidentDetails
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
          />
        )}
        {/* Rodapé de referência do componente */}
        <div className="absolute bottom-2 left-2 text-xs text-red-600 z-50 select-none">
          CD03
        </div>
      </div>
    </>
  );
}