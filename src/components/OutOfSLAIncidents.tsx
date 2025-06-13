import React, { useState, useMemo } from 'react';
import { ExternalLink, X, Info, ChevronDown, ChevronUp, User, Users, Calendar, Briefcase, Tag, Clock } from 'lucide-react';
import { Incident } from '../types/incident';
import { normalizePriority } from '../utils/incidentUtils';
import { format, differenceInHours, parseISO, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SLA_THRESHOLDS = {
  P1: 1,   // 1 hora
  P2: 4,   // 4 horas
  P3: 36,  // 36 horas
  P4: 72   // 72 horas
};

const PRIORITY_COLORS = {
  P1: 'bg-red-500/20 text-red-500',
  P2: 'bg-orange-500/20 text-orange-500',
  P3: 'bg-yellow-500/20 text-yellow-500',
  P4: 'bg-green-500/20 text-green-500',
};

/**
 * Função utilitária para converter datas em string ou serial Excel para objeto Date.
 *
 * - Aceita datas ISO, formatos dd/MM/yyyy HH:mm:ss, dd/MM/yyyy HH:mm
 * - Aceita datas no formato serial Excel (ex: 45675.6667), que são comuns em exportações de planilhas.
 *   O número representa dias desde 30/12/1899.
 *
 * Se precisar remover esse suporte no futuro, basta retirar o bloco que faz a conversão do serial Excel.
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) {
    return null;
  }

  try {
    // Se for número (serial Excel)
    if (!isNaN(Number(dateStr)) && dateStr.trim() !== '') {
      const serial = Number(dateStr);
      // Excel: dias desde 1899-12-30
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const ms = serial * 24 * 60 * 60 * 1000;
      const excelDate = new Date(excelEpoch.getTime() + ms);
      if (!isNaN(excelDate.getTime())) {
        return excelDate;
      }
    }

    // Tenta primeiro como ISO
    const isoDate = parseISO(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Tenta como dd/MM/yyyy HH:mm:ss
    const dateWithSeconds = parse(dateStr, "dd/MM/yyyy HH:mm:ss", new Date());
    if (!isNaN(dateWithSeconds.getTime())) {
      return dateWithSeconds;
    }

    // Tenta como dd/MM/yyyy HH:mm
    const dateWithoutSeconds = parse(dateStr, "dd/MM/yyyy HH:mm", new Date());
    if (!isNaN(dateWithoutSeconds.getTime())) {
      return dateWithoutSeconds;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Função utilitária para converter horas em dias e horas
function formatHorasParaDiasHoras(horas: number): string {
  if (horas < 24) return `${horas} horas`;
  const dias = Math.floor(horas / 24);
  const horasRestantes = horas % 24;
  let texto = `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  if (horasRestantes > 0) texto += ` e ${horasRestantes} horas`;
  return texto;
}

interface OutOfSLAIncidentsProps {
  incidents: Incident[];
  priorityLabel?: string;
  onClose?: () => void;
}

// Função para montar link real pelo número do chamado
function getIncidentLink(incident: Incident): string {
  return incident.Number ? `http://localhost:4003/${incident.Number}` : '#';
}

export function OutOfSLAIncidents({ incidents, priorityLabel, onClose }: OutOfSLAIncidentsProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const outOfSLAIncidents = useMemo(() => {
    return incidents.filter(incident => {
      try {
        const priority = normalizePriority(incident.Priority || '');
        const opened = parseDate(incident.Opened || '');
        const lastUpdate = parseDate(incident.Updated || '');
        
        if (!opened || !lastUpdate) {
          return false;
        }

        const threshold = SLA_THRESHOLDS[priority as keyof typeof SLA_THRESHOLDS] || 36;
        const responseTime = differenceInHours(lastUpdate, opened);
        const isOutOfSLA = responseTime > threshold;

        return isOutOfSLA;
      } catch (error) {
        return false;
      }
    });
  }, [incidents]);

  return (
    <div className="bg-[#232B41] rounded-xl shadow-xl w-full max-w-6xl mx-auto px-6 md:px-8 py-0">
      <div className="flex items-center justify-between pt-8 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Chamados {priorityLabel ? priorityLabel + ' - ' : ''}Fora do SLA
          </h2>
          <p className="text-gray-400 text-base">{outOfSLAIncidents.length} chamados encontrados</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-[#1C2333] text-gray-400 hover:text-white"
            title="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>
      {outOfSLAIncidents.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          Nenhum chamado fora do SLA encontrado no período selecionado.
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[60vh] w-full">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <thead className="bg-[#1C2333]">
              <tr className="border-b border-[#2D3344]">
                <th style={{ minWidth: 120 }} className="px-2 py-3 text-center align-middle text-sm font-semibold text-gray-300 whitespace-nowrap">Número</th>
                <th style={{ minWidth: 160 }} className="px-2 py-3 text-center align-middle text-sm font-semibold text-gray-300 whitespace-nowrap">Data</th>
                <th style={{ minWidth: 300 }} className="px-2 py-3 text-center align-middle text-sm font-semibold text-gray-300">Descrição</th>
                <th style={{ minWidth: 180 }} className="px-2 py-3 text-center align-middle text-sm font-semibold text-gray-300">Solicitante</th>
                <th style={{ minWidth: 200 }} className="px-2 py-3 text-center align-middle text-sm font-semibold text-gray-300 group-col">Grupo</th>
                <th style={{ minWidth: 160 }} className="px-2 py-3 text-center align-middle text-sm font-semibold text-gray-300 whitespace-nowrap">Tempo</th>
                <th style={{ minWidth: 120 }} className="px-2 py-3 text-center align-middle text-sm font-semibold text-gray-300 whitespace-nowrap">Estado</th>
                <th className="px-2 py-3 text-center align-middle text-sm font-semibold text-gray-300 whitespace-nowrap" style={{ width: 56 }}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232B41] text-sm">
              {outOfSLAIncidents.map((incident) => {
                try {
                  const priority = normalizePriority(incident.Priority || '');
                  const opened = parseDate(incident.Opened || '');
                  const lastUpdate = parseDate(incident.Updated || '');
                  
                  if (!opened || !lastUpdate) {
                    return null;
                  }

                  const threshold = SLA_THRESHOLDS[priority as keyof typeof SLA_THRESHOLDS] || 36;
                  const responseTime = differenceInHours(lastUpdate, opened);
                  const tempoFora = responseTime - threshold;

                  return (
                    <tr key={incident.Number} className="hover:bg-[#2A2F3A] transition-colors min-h-[56px] border-b border-[#232B41]">
                      <td className="px-2 py-3 text-white font-mono text-center align-middle min-w-[120px] break-words whitespace-pre-line" style={{ lineHeight: 1.4 }}>{incident.Number}</td>
                      <td className="px-2 py-3 text-gray-300 text-center align-middle min-w-[160px] break-words whitespace-pre-line" style={{ lineHeight: 1.4 }}>
                        {format(opened, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-2 py-3 text-gray-300 text-center align-middle min-w-[300px] break-words whitespace-pre-line" style={{ lineHeight: 1.4 }} title={incident.ShortDescription || ''}>
                        {incident.ShortDescription || 'Sem descrição'}
                      </td>
                      <td className="px-2 py-3 text-gray-300 text-center align-middle min-w-[180px] break-words whitespace-pre-line" style={{ lineHeight: 1.4 }} title={incident.Caller || ''}>
                        {incident.Caller || '-'}
                      </td>
                      <td className="px-2 py-3 text-gray-300 text-center align-middle min-w-[200px] break-words whitespace-pre-line group-col" style={{ lineHeight: 1.4 }} title={incident.AssignmentGroup || ''}>
                        <span className="hidden md:inline">{incident.AssignmentGroup || '-'}</span>
                        <span className="md:hidden">
                          <span className="cursor-pointer underline decoration-dotted" title={incident.AssignmentGroup || '-'}>Grupo</span>
                        </span>
                      </td>
                      <td className="px-2 py-3 font-semibold text-red-500 text-center align-middle min-w-[160px] break-words whitespace-pre-line" style={{ lineHeight: 1.4 }}>
                        {tempoFora > 0 ? formatHorasParaDiasHoras(tempoFora) + '\nfora do SLA' : '-'}
                      </td>
                      <td className="px-2 py-3 text-center align-middle min-w-[120px] break-words whitespace-pre-line" style={{ lineHeight: 1.4 }}>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${incident.State === 'Closed' || incident.State === 'Resolved' ? 'bg-green-600/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{incident.State}</span>
                      </td>
                      <td className="pr-4 pl-2 py-3 text-right align-middle" style={{ width: 56 }}>
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedIncident(incident); }}
                          className="text-indigo-400 hover:text-indigo-300 transition-colors"
                          title="Exibir detalhes do chamado"
                          style={{ marginRight: 0 }}
                        >
                          <ExternalLink className="h-4 w-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                } catch (error) {
                  return null;
                }
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Modal de detalhes do chamado */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
             onClick={e => { e.stopPropagation(); }}>
          <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Chamado {selectedIncident.Number}</h2>
              <button onClick={e => { e.stopPropagation(); setSelectedIncident(null); }} className="p-2 hover:bg-[#1C2333] rounded transition-colors">
                <X className="h-6 w-6 text-gray-400 hover:text-white" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${selectedIncident.State === 'Closed' || selectedIncident.State === 'Resolved' ? 'bg-green-600/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{selectedIncident.State}</span>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-500/20 text-red-400">Prioridade {normalizePriority(selectedIncident.Priority || '')}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-200 block mb-2 text-lg">Descrição</span>
                <div className="text-base text-gray-100 bg-[#232B41] rounded p-3 shadow-inner">
                  {selectedIncident.Description || selectedIncident.ShortDescription || 'Sem descrição'}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-400 font-semibold">Solicitante</div>
                      <div className="text-base text-white font-normal">{selectedIncident.Caller || '-'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-400 font-semibold">Data de Abertura</div>
                      <div className="text-base text-white font-normal">{selectedIncident.Opened ? format(parseDate(selectedIncident.Opened)!, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tag className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-400 font-semibold">Categoria</div>
                      <div className="text-base text-white font-normal">{selectedIncident.Category || '-'}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-400 font-semibold">Grupo Responsável</div>
                      <div className="text-base text-white font-normal">{selectedIncident.AssignmentGroup || '-'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-400 font-semibold">Analista Responsável</div>
                      <div className="text-base text-white font-normal">{selectedIncident.AssignedTo || '-'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-gray-400 font-semibold">Última Atualização</div>
                      <div className="text-base text-white font-normal">{selectedIncident.Updated ? format(parseDate(selectedIncident.Updated)!, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}</div>
                      {selectedIncident.UpdatedBy && (
                        <div className="text-xs text-gray-400">por {selectedIncident.UpdatedBy}</div>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-red-500 font-semibold text-base">
                        <Info className="h-4 w-4" />
                        {(() => {
                          const priority = normalizePriority(selectedIncident.Priority || '');
                          const threshold = SLA_THRESHOLDS[priority as keyof typeof SLA_THRESHOLDS] || 36;
                          const opened = parseDate(selectedIncident.Opened || '');
                          const lastUpdate = parseDate(selectedIncident.Updated || '');
                          const responseTime = (opened && lastUpdate) ? differenceInHours(lastUpdate, opened) : 0;
                          const tempoFora = responseTime - threshold;
                          return tempoFora > 0 ? formatHorasParaDiasHoras(tempoFora) + ' fora do SLA' : '-';
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .group-col { display: none !important; }
          td.group-col, th.group-col { display: none !important; }
        }
      `}</style>
    </div>
  );
} 