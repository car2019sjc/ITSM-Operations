import React, { useMemo } from 'react';
import { X, AlertTriangle, ExternalLink } from 'lucide-react';
import { Incident } from '../types/incident';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IncidentDetails } from './IncidentDetails';
import { normalizePriority, getIncidentState, isCancelled } from '../utils/incidentUtils';

interface PendingIncidentsAnalysisProps {
  incidents: Incident[];
  onClose: () => void;
  onShowIncidentDetails: (incident: Incident) => void;
}

const PRIORITY_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

export function PendingIncidentsAnalysis({ incidents, onClose, onShowIncidentDetails }: PendingIncidentsAnalysisProps) {
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

  const pendingIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const state = incident.State?.toLowerCase() || '';
      const normalizedState = getIncidentState(incident.State);
      const cancelled = isCancelled(incident.State);
      
      // Excluir chamados fechados, cancelados e em espera
      if (normalizedState === 'Fechado' || cancelled || 
          state.includes('hold') || state.includes('pending') || state.includes('aguardando')) {
        return false;
      }

      // Incluir apenas chamados abertos ou em andamento
      return state.includes('open') || 
             state.includes('in progress') || 
             state.includes('assigned') ||
             state.includes('aberto') ||
             state.includes('em andamento') ||
             state.includes('atribuído');
    });
  }, [incidents]);

  return (
    <div className="bg-[#151B2B] rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Chamados Pendentes
          </h2>
          <p className="text-gray-400 mt-1">
            {pendingIncidents.length} chamados encontrados
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-400 hover:text-white" />
        </button>
      </div>

      <div className="space-y-4">
        {pendingIncidents.map((incident) => (
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
                    onClick={() => onShowIncidentDetails(incident)}
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
  );
} 