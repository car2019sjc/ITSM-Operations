import React from 'react';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Incident } from '../types/incident';
import { getIncidentState } from '../utils/incidentUtils';
import { MonthlyClosedIncidentsChart } from './MonthlyClosedIncidentsChart';

interface OpenIncidentsCardProps {
  incidents: Incident[];
  startDate?: string;
  endDate?: string;
}

export function OpenIncidentsCard({ incidents, startDate, endDate }: OpenIncidentsCardProps) {
  const stats = {
    open: incidents.filter(i => getIncidentState(i.State) === 'Aberto').length,
    inProgress: incidents.filter(i => getIncidentState(i.State) === 'Em Andamento').length,
    closed: incidents.filter(i => getIncidentState(i.State) === 'Fechado').length,
  };

  const total = incidents.length;
  const openPercentage = total > 0 ? ((stats.open + stats.inProgress) / total * 100).toFixed(1) : '0';

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg">
      <h2 className="text-lg font-semibold text-white mb-4">Chamados em Aberto</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1C2333] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <h3 className="text-sm text-gray-400">Em Aberto</h3>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats.open}</p>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm text-gray-400">Em Andamento</h3>
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <h3 className="text-sm text-gray-400">Fechados</h3>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats.closed}</p>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm text-gray-400">Taxa de Abertura</h3>
          </div>
          <p className="text-2xl font-bold text-indigo-400">{openPercentage}%</p>
        </div>
      </div>

      <div className="mt-4">
        <MonthlyClosedIncidentsChart
          incidents={incidents}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
}