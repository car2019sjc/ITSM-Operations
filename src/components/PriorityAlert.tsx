import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Incident } from '../types/incident';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getIncidentState, isHighPriority, normalizePriority, isCancelled } from '../utils/incidentUtils';

interface PriorityAlertProps {
  incidents: Incident[];
  onClose: () => void;
}

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

export function PriorityAlert({ incidents, onClose }: PriorityAlertProps) {
  const highPriorityOpenIncidents = incidents
    .filter(incident => {
      const isPriority = isHighPriority(incident.Priority);
      const state = getIncidentState(incident.State);
      const cancelled = isCancelled(incident.State);
      return isPriority && state !== 'Fechado' && !cancelled;
    })
    .sort((a, b) => {
      const priorityA = normalizePriority(a.Priority);
      const priorityB = normalizePriority(b.Priority);
      
      if (priorityA === priorityB) {
        try {
          return parseISO(b.Opened).getTime() - parseISO(a.Opened).getTime();
        } catch (error) {
          return 0;
        }
      }
      
      return priorityA === 'P1' ? -1 : 1;
    });

  if (highPriorityOpenIncidents.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
      
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <h3 className="text-red-500 font-semibold mb-2">
            Atenção: Chamados Críticos em Aberto
          </h3>
          <div className="space-y-2">
            {highPriorityOpenIncidents.map(incident => (
              <div key={incident.Number} className="text-sm text-gray-300">
                <span className="font-medium">{incident.Number}</span>
                <span className={`mx-2 font-medium ${
                  normalizePriority(incident.Priority) === 'P1' ? 'text-red-500' : 'text-orange-500'
                }`}>
                  {normalizePriority(incident.Priority)}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  getIncidentState(incident.State) === 'Em Andamento' 
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {incident.State}
                </span>
                <span className="text-gray-400 ml-2">{incident.ShortDescription}</span>
                <span className="text-amber-400 ml-2">
                  • Aberto há {getIncidentDuration(incident.Opened)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-3">
            Total de chamados críticos em aberto: {highPriorityOpenIncidents.length}
          </p>
        </div>
      </div>
    </div>
  );
}