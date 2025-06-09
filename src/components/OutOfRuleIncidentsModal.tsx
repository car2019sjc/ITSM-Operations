import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, Filter, AlertCircle, Clock, ExternalLink, FileText } from 'lucide-react';
import { Incident } from '../types/incident';
import { parseISO, format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';
import { IncidentDetails } from './IncidentDetails';

interface OutOfRuleIncidentsModalProps {
  incidents: Incident[];
  onClose: () => void;
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
  }
];

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

export function OutOfRuleIncidentsModal({ incidents, onClose }: OutOfRuleIncidentsModalProps) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

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

  const getElapsedTime = (incident: Incident) => {
    try {
      const now = new Date();
      const lastUpdate = incident.Updated ? parseISO(incident.Updated) : now;
      const hours = differenceInHours(now, lastUpdate);
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      
      if (days > 0) {
        return `${days} ${days === 1 ? 'dia' : 'dias'}${remainingHours > 0 ? ` e ${remainingHours} ${remainingHours === 1 ? 'hora' : 'horas'}` : ''}`;
      }
      
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } catch (error) {
      return 'Tempo desconhecido';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Chamados Fora de Regra
              </h2>
              <p className="text-gray-400 mt-1">
                {filteredIncidents.length} chamados sem atualização por mais de 48 horas
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
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-4">
            {filteredIncidents.map((incident) => (
              <div 
                key={incident.Number}
                className="bg-[#1C2333] p-4 rounded-lg hover:bg-[#1F2937] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <AlertTriangle className="h-5 w-5 mt-1 flex-shrink-0" style={{ 
                    color: CHART_COLORS[normalizePriority(incident.Priority) as keyof typeof CHART_COLORS] 
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-white">{incident.Number}</span>
                      <span className="font-medium" style={{ 
                        color: CHART_COLORS[normalizePriority(incident.Priority) as keyof typeof CHART_COLORS] 
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
                      <div className="mb-2 p-3 bg-[#151B2B] rounded border border-gray-700">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-indigo-400 mt-0.5" />
                          <p className="text-sm text-gray-400 whitespace-pre-wrap">{incident.CommentsAndWorkNotes}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-red-400" />
                        <span className="text-red-400">Sem atualização por {getElapsedTime(incident)}</span>
                      </div>
                      {incident.AssignmentGroup && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400">{incident.AssignmentGroup}</span>
                        </>
                      )}
                      {incident.Caller && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400">{incident.Caller}</span>
                        </>
                      )}
                    </div>
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
    </div>
  );
} 