import React, { useState } from 'react';
import { X, Eye } from 'lucide-react';
import type { Incident } from '../types/incident';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizePriority, getIncidentState, formatIncidentDate } from '../utils/incidentUtils';

interface IncidentModalProps {
  incidents: Incident[];
  user: string;
  onClose: () => void;
  startDate: string;
  endDate: string;
}

const formatDate = (dateStr: string) => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (!date || isNaN(date.getTime())) return 'Data inválida';
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch (e) {
    return 'Data inválida';
  }
};

export function IncidentModal({ incidents, user, onClose, startDate, endDate }: IncidentModalProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#151B2B] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Incidentes do Associado: {user}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
              aria-label="Fechar modal"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          </div>
          <p className="text-gray-400 mt-1">
            Total de incidentes: {incidents.length}
          </p>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(90vh-8rem)]">
          <div className="rounded-xl bg-[#1C2333] p-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-300 border-b border-[#232B41]">
                  <th className="px-2 py-2 text-left">Número</th>
                  <th className="px-2 py-2 text-left">Data</th>
                  <th className="px-2 py-2 text-left">Descrição</th>
                  <th className="px-2 py-2 text-left">Solicitante</th>
                  <th className="px-2 py-2 text-left">Grupo</th>
                  <th className="px-2 py-2 text-left">Tempo</th>
                  <th className="px-2 py-2 text-left">Estado</th>
                  <th className="px-2 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => {
                  // Calcular tempo fora do SLA (se aplicável)
                  let tempoFora = '';
                  let tempoForaColor = '';
                  if (incident.Opened && incident.Updated) {
                    const opened = new Date(incident.Opened);
                    const updated = new Date(incident.Updated);
                    if (!isNaN(opened.getTime()) && !isNaN(updated.getTime())) {
                      const diffMs = updated.getTime() - opened.getTime();
                      const diffH = Math.floor(diffMs / (1000 * 60 * 60));
                      const dias = Math.floor(diffH / 24);
                      const horas = diffH % 24;
                      if (dias > 0 || horas > 0) {
                        tempoFora = `${dias > 0 ? dias + ' dias' : ''}${dias > 0 && horas > 0 ? ' e ' : ''}${horas > 0 ? horas + ' horas' : ''}`;
                      }
                    }
                  }
                  // Estado
                  const estado = getIncidentState(incident.State);
                  // Prioridade
                  const prioridade = normalizePriority(incident.Priority);
                  // SLA (exemplo: se for fechado e tempo > SLA, mostrar fora do SLA)
                  let slaMsg = '';
                  let slaColor = '';
                  if (incident.Opened && incident.Updated) {
                    const opened = new Date(incident.Opened);
                    const updated = new Date(incident.Updated);
                    if (!isNaN(opened.getTime()) && !isNaN(updated.getTime())) {
                      const diffH = Math.floor((updated.getTime() - opened.getTime()) / (1000 * 60 * 60));
                      let sla = 36;
                      if (prioridade === 'P1') sla = 1;
                      if (prioridade === 'P2') sla = 4;
                      if (prioridade === 'P3') sla = 36;
                      if (prioridade === 'P4') sla = 72;
                      if (diffH > sla) {
                        slaMsg = tempoFora + ' fora do SLA';
                        slaColor = 'text-red-500 font-semibold';
                      }
                    }
                  }
                  return (
                    <tr key={incident.Number} className="border-b border-[#232B41] hover:bg-[#232B41] transition-colors">
                      <td className="px-2 py-2 font-semibold text-white whitespace-nowrap">
                        <span className="font-mono">{incident.Number}</span>
                      </td>
                      <td className="px-2 py-2 text-gray-200 whitespace-nowrap">{formatIncidentDate(incident.Opened)}</td>
                      <td className="px-2 py-2 text-gray-200">{incident.ShortDescription}</td>
                      <td className="px-2 py-2 text-gray-200 break-words whitespace-pre-line">{incident.Caller}</td>
                      <td className="px-2 py-2 text-gray-200 break-words whitespace-pre-line">{incident.AssignmentGroup}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {slaMsg ? <span className={slaColor}>{slaMsg}</span> : '-'}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estado === 'Fechado' ? 'bg-green-600/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{estado}</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          className="p-2 rounded-full hover:bg-[#2D3748] text-gray-400 hover:text-white transition-colors"
                          title="Ver detalhes do chamado"
                          onClick={() => setSelectedIncident(incident)}
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Modal de detalhes do chamado */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#232B41] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto p-6 relative">
            <button
              onClick={() => setSelectedIncident(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              aria-label="Fechar detalhes do chamado"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold text-white mb-4">
              Chamado {selectedIncident.Number}
            </h2>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getIncidentState(selectedIncident.State) === 'Fechado' ? 'bg-green-600/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{getIncidentState(selectedIncident.State)}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${normalizePriority(selectedIncident.Priority) === 'P1' ? 'bg-red-500/20 text-red-400' : normalizePriority(selectedIncident.Priority) === 'P2' ? 'bg-orange-500/20 text-orange-400' : normalizePriority(selectedIncident.Priority) === 'P3' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>Prioridade {normalizePriority(selectedIncident.Priority)}</span>
            </div>
            <div className="font-semibold text-gray-200 block mb-2 text-lg">Descrição</div>
            <div className="text-base text-gray-100 bg-[#151B2B] rounded p-3 shadow-inner mb-4">
              {selectedIncident.Description || selectedIncident.ShortDescription || '-'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-semibold">Solicitante</span>
                  <span className="text-white font-normal">{selectedIncident.Caller || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-semibold">Data de Abertura</span>
                  <span className="text-white font-normal">{formatIncidentDate(selectedIncident.Opened)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-semibold">Categoria</span>
                  <span className="text-white font-normal">{selectedIncident.Category || '-'}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-semibold">Grupo Responsável</span>
                  <span className="text-white font-normal">{selectedIncident.AssignmentGroup || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-semibold">Analista Responsável</span>
                  <span className="text-white font-normal">{selectedIncident.AssignedTo || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-semibold">Última Atualização</span>
                  <span className="text-white font-normal">
                    {['Data inválida', '-'].includes(formatIncidentDate(selectedIncident.Updated)) ? '-' : formatIncidentDate(selectedIncident.Updated)}
                  </span>
                </div>
                {/* SLA info */}
                <div className="flex items-center gap-1 mt-1 text-red-500 font-semibold text-base">
                  {(() => {
                    const prioridade = normalizePriority(selectedIncident.Priority);
                    let sla = 36;
                    if (prioridade === 'P1') sla = 1;
                    if (prioridade === 'P2') sla = 4;
                    if (prioridade === 'P3') sla = 36;
                    if (prioridade === 'P4') sla = 72;
                    if (selectedIncident.Opened && selectedIncident.Updated) {
                      const opened = new Date(selectedIncident.Opened);
                      const updated = new Date(selectedIncident.Updated);
                      if (!isNaN(opened.getTime()) && !isNaN(updated.getTime())) {
                        const diffH = Math.floor((updated.getTime() - opened.getTime()) / (1000 * 60 * 60));
                        if (diffH > sla) {
                          const dias = Math.floor((diffH - sla) / 24);
                          const horas = (diffH - sla) % 24;
                          return <span>⏱ {dias > 0 ? dias + ' dias' : ''}{dias > 0 && horas > 0 ? ' e ' : ''}{horas > 0 ? horas + ' horas' : ''} fora do SLA</span>;
                        }
                      }
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 