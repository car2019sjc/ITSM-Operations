import React, { useState } from 'react';
import { X, AlertTriangle, ExternalLink } from 'lucide-react';
import { Incident } from '../types/incident';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IncidentDetails } from './IncidentDetails';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';

interface CriticalIncidentsModalProps {
  incidents: Incident[];
  onClose: () => void;
}

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

export function CriticalIncidentsModal({ incidents, onClose }: CriticalIncidentsModalProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const getIncidentDuration = (openedDate: string): string => {
    try {
      return formatDistanceToNow(parseISO(openedDate), { 
        locale: ptBR,
        addSuffix: false 
      });
    } catch (error) {
      return 'Data inválida';
    }
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
    if (normalizedState === 'Em Andamento') return 'bg-blue-500/20 text-blue-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Chamados Críticos em Aberto
              </h2>
              <p className="text-gray-400 mt-1">
                {incidents.length} chamados pendentes
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>
        
        <div className="overflow-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-4">
            {incidents.map((incident) => (
              <div 
                key={incident.Number}
                className="bg-[#1C2333] p-4 rounded-lg hover:bg-[#1F2937] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" style={{ 
                        color: CHART_COLORS[normalizePriority(incident.Priority) as keyof typeof CHART_COLORS] 
                      }} />
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
                      <div className="mb-2 text-sm text-gray-400 whitespace-pre-wrap">
                        {incident.CommentsAndWorkNotes.split('\n').map((line, index) => (
                          <div key={index} className="mb-2">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                      <span className="text-amber-400">
                        • Aberto há {getIncidentDuration(incident.Opened)}
                      </span>
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