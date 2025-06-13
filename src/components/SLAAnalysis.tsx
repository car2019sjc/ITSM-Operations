/*
  =====================================================================
  SLAAnalysis
  ---------------------------------------------------------------------
  Este componente é responsável pela análise e apresentação dos SLAs 
  (Service Level Agreements) exclusivamente para incidentes.
  
  Os parâmetros de SLA definidos neste arquivo (SLA_THRESHOLDS) 
  são utilizados apenas para os chamados do tipo incidente e não afetam 
  requests ou outros módulos do sistema.
  
  Parâmetros atuais de SLA (em horas):
    - P1: 1 hora
    - P2: 3 horas
    - P3: 8 horas
    - P4: 12 horas
  
  Para alterar os limites de SLA de incidentes, edite o objeto 
  SLA_THRESHOLDS abaixo.
  =====================================================================
*/
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { X, AlertTriangle, ExternalLink, PauseCircle, Timer } from 'lucide-react';
import { Incident } from '../types/incident';
import { parseISO, isWithinInterval, format, differenceInMinutes, differenceInHours, differenceInDays, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IncidentDetails } from './IncidentDetails';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';
import { OutOfSLAIncidents } from './OutOfSLAIncidents';

interface SLAAnalysisProps {
  incidents: Incident[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

interface IncidentModalProps {
  incidents: Incident[];
  priority: string;
  compliant: boolean;
  onClose: () => void;
}

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280',
  withinSLA: '#10B981', // Verde
  outsideSLA: '#EF4444'  // Vermelho
};

const SLA_THRESHOLDS = {
  P1: 1,   // 1 hora
  P2: 3,  // 3 horas
  P3: 8,  // 8 horas
  P4: 12  // 12 horas
};

function IncidentModal({ incidents, priority, compliant, onClose }: IncidentModalProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const formatDate = (dateStr: string) => {
    try {
      if (!dateStr) return 'Data não disponível';
      const date = parseDate(dateStr);
      if (!date || isNaN(date.getTime())) return 'Data inválida';
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      console.error('Erro ao formatar data:', e);
      return 'Data inválida';
    }
  };

  const getResponseTime = (incident: Incident): string => {
    try {
      if (!incident.Opened) return 'Data de abertura não disponível';
      
      const opened = parseDate(incident.Opened);
      if (!opened || isNaN(opened.getTime())) return 'Data de abertura inválida';
      
      const lastUpdate = incident.Updated ? parseDate(incident.Updated) : new Date();
      if (!lastUpdate || isNaN(lastUpdate.getTime())) return 'Data de atualização inválida';
      
      const priority = normalizePriority(incident.Priority);
      const threshold = SLA_THRESHOLDS[priority as keyof typeof SLA_THRESHOLDS] || 36;
      const totalHours = differenceInHours(lastUpdate, opened);
      
      if (isNaN(totalHours)) return 'Tempo não calculado';
      
      if (totalHours <= threshold) {
        return 'Dentro do SLA';
      }

      const hoursOverSLA = totalHours - threshold;
      const days = Math.floor(hoursOverSLA / 24);
      const remainingHours = hoursOverSLA % 24;

      if (days > 0) {
        return `${days} ${days === 1 ? 'dia' : 'dias'}${remainingHours > 0 ? ` e ${remainingHours} ${remainingHours === 1 ? 'hora' : 'horas'}` : ''} fora do SLA`;
      }
      
      return `${hoursOverSLA} ${hoursOverSLA === 1 ? 'hora' : 'horas'} fora do SLA`;
    } catch (e) {
      console.error('Erro ao calcular tempo de resposta:', e);
      return 'Tempo não calculado';
    }
  };

  const getStatusColor = (state: string) => {
    const normalizedState = getIncidentState(state);
    if (normalizedState === 'Fechado') return 'bg-green-500/20 text-green-400';
    if (normalizedState === 'Em Andamento') return 'bg-blue-500/20 text-blue-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Chamados {priority} - {compliant ? 'Dentro do SLA' : 'Fora do SLA'}
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Solicitante</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Grupo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Tempo</th>
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
                  <td className="px-4 py-3 text-sm text-gray-300">{incident.Caller}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{incident.AssignmentGroup}</td>
                  <td className="px-4 py-3 text-sm text-red-400">{getResponseTime(incident)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.State)}`}>
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

// Função para parsear datas em diferentes formatos e garantir validade
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  let d: Date;
  d = parseISO(dateStr);
  if (!isNaN(d.getTime())) return d;
  d = parse(dateStr, "dd/MM/yyyy HH:mm:ss", new Date());
  if (!isNaN(d.getTime())) return d;
  d = parse(dateStr, "dd/MM/yyyy HH:mm", new Date());
  if (!isNaN(d.getTime())) return d;
  return new Date();
}

export function SLAAnalysis({ incidents, onClose, startDate, endDate }: SLAAnalysisProps) {
  const [selectedIncidents, setSelectedIncidents] = useState<Incident[] | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedCompliant, setSelectedCompliant] = useState<boolean>(true);
  const [showOnHoldOnly, setShowOnHoldOnly] = useState(false);
  const [showOutOfSLA, setShowOutOfSLA] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const slaData = useMemo(() => {
    console.log('[SLA LOG] Iniciando cálculo do SLA');
    console.log('[SLA LOG] Incidents recebidos:', incidents.length);
    console.log('[SLA LOG] Período:', startDate, endDate);
    let cancelados = 0;
    let foraDoPeriodo = 0;
    let erroData = 0;
    let semPrioridade = 0;
    let semData = 0;
    let totalFiltrados = 0;
    const filteredIncidents = incidents.filter(incident => {
      if (!startDate || !endDate) return true;
      try {
        const incidentDate = parseDate(incident.Opened);
        if (!incidentDate) { semData++; return false; }
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        const inInterval = isWithinInterval(incidentDate, { start, end });
        if (!inInterval) foraDoPeriodo++;
        return inInterval;
      } catch (error) {
        erroData++;
        return false;
      }
    });
    totalFiltrados = filteredIncidents.length;
    console.log('[SLA LOG] Filtrados:', totalFiltrados, 'Fora do período:', foraDoPeriodo, 'Erro de data:', erroData, 'Sem data:', semData);

    const priorityData = {
      P1: { withinSLA: 0, outsideSLA: 0, total: 0 },
      P2: { withinSLA: 0, outsideSLA: 0, total: 0 },
      P3: { withinSLA: 0, outsideSLA: 0, total: 0 },
      P4: { withinSLA: 0, outsideSLA: 0, total: 0 },
      'Não definido': { withinSLA: 0, outsideSLA: 0, total: 0 }
    };

    filteredIncidents.forEach(incident => {
      const priority = normalizePriority(incident.Priority) || 'Não definido';
      if (priority === 'Não definido') semPrioridade++;
      const threshold = SLA_THRESHOLDS[priority as keyof typeof SLA_THRESHOLDS] || 36;
      const opened = parseDate(incident.Opened || '');
      const lastUpdate = parseDate(incident.Updated || '');
      if (!opened || !lastUpdate) { semData++; return; }
      const responseTime = differenceInHours(lastUpdate, opened);
      if (isNaN(responseTime)) { erroData++; return; }
      const priorityKey = priority as keyof typeof priorityData;
      if (responseTime <= threshold) {
        priorityData[priorityKey].withinSLA++;
      } else {
        priorityData[priorityKey].outsideSLA++;
      }
      priorityData[priorityKey].total++;
    });
    console.log('[SLA LOG] Prioridades sem definição:', semPrioridade);
    console.log('[SLA LOG] Resultado final priorityData:', priorityData);
    return priorityData;
  }, [incidents, startDate, endDate]);

  const totalWithinSLA = Object.values(slaData).reduce((acc, curr) => acc + curr.withinSLA, 0);
  const totalOutsideSLA = Object.values(slaData).reduce((acc, curr) => acc + curr.outsideSLA, 0);
  const totalIncidents = totalWithinSLA + totalOutsideSLA;
  const slaPercentage = totalIncidents > 0 ? (totalWithinSLA / totalIncidents) * 100 : 0;

  const handleSLAClick = (priority: string, compliant: boolean) => {
    const threshold = SLA_THRESHOLDS[priority as keyof typeof SLA_THRESHOLDS] || 36;
    let logCount = 0;
    const filteredIncidents = incidents.filter(incident => {
      const normalizedPriority = normalizePriority(incident.Priority);
      if (normalizedPriority !== priority) return false;
      try {
        const opened = parseDate(incident.Opened || '');
        const lastUpdate = parseDate(incident.Updated || '');
        const responseTime = differenceInHours(lastUpdate, opened);
        const isAtrasado = responseTime > threshold;
        if (!compliant && isAtrasado && logCount < 20) {
          logCount++;
          console.log('[LOG SLA] P2 atrasado:', {
            Numero: incident.Number,
            Priority: incident.Priority,
            Normalizado: normalizedPriority,
            Opened: incident.Opened,
            Updated: incident.Updated,
            responseTime,
            threshold,
            Estado: incident.State
          });
        }
        return compliant ? responseTime <= threshold : isAtrasado;
      } catch (error) {
        return !compliant;
      }
    });

    setSelectedIncidents(filteredIncidents);
    setSelectedPriority(priority);
    setSelectedCompliant(compliant);
  };

  // Logar até 20 exemplos de incidentes reconhecidos como P4
  useEffect(() => {
    let logCount = 0;
    incidents.forEach(incident => {
      const normalizedPriority = normalizePriority(incident.Priority);
      if (normalizedPriority === 'P4' && logCount < 20) {
        logCount++;
        console.log('[LOG SLA] Exemplo de incidente reconhecido como P4:', {
          Numero: incident.Number,
          Priority: incident.Priority,
          Normalizado: normalizedPriority,
          Opened: incident.Opened,
          Updated: incident.Updated,
          Estado: incident.State
        });
      }
    });
  }, [incidents]);

  // Memo para filtrar incidentes do período selecionado (igual ao gráfico)
  const filteredIncidentsForSLA = useMemo(() => {
    if (!startDate || !endDate) return incidents;
    return incidents.filter(incident => {
      const incidentDate = parseDate(incident.Opened);
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      return isWithinInterval(incidentDate, { start, end });
    });
  }, [incidents, startDate, endDate]);

  // Função para filtrar incidentes atrasados por prioridade, usando o mesmo filtro do gráfico
  function getAtrasadosPorPrioridade(priority: string) {
    const atrasados = filteredIncidentsForSLA.filter(incident => {
      const normalizedPriority = normalizePriority(incident.Priority);
      if (normalizedPriority !== priority) return false;
      const opened = parseDate(incident.Opened || '');
      const lastUpdate = parseDate(incident.Updated || '');
      if (!opened || !lastUpdate) return false;
      const threshold = SLA_THRESHOLDS[priority as keyof typeof SLA_THRESHOLDS] || 36;
      const responseTime = differenceInHours(lastUpdate, opened);
      return responseTime > threshold;
    });
    console.log(`[SLA LOG][getAtrasadosPorPrioridade] Priority: ${priority} | Total atrasados: ${atrasados.length}`);
    if (atrasados.length > 0) {
      console.log('[SLA LOG][getAtrasadosPorPrioridade] Exemplos:', atrasados.slice(0, 5));
    }
    return atrasados;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#111827] rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Análise de SLA</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Fechar
              </button>
            )}
          </div>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(90vh-80px)] space-y-8">
          {/* Barras de progresso por prioridade */}
          <div className="bg-[#181F32] rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-white mb-4">Cumprimento de SLA por Prioridade</h3>
            {Object.entries(slaData).map(([priority, data]) => {
              const percentage = data.total > 0 ? (data.withinSLA / data.total) * 100 : 0;
              const atrasados = data.outsideSLA;
              const emEspera = 0; // Ajuste se houver lógica para "em espera"
              const noPrazo = data.withinSLA;
              let percentColor = '#10B981'; // verde
              if (atrasados > noPrazo) percentColor = '#EF4444'; // vermelho
              else if (atrasados === noPrazo && atrasados !== 0) percentColor = '#FACC15'; // amarelo
              return (
                <div key={priority} className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 font-medium">{priority}</span>
                    <span className="text-white font-semibold">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-[#10B981] transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    <span className="text-green-400">{noPrazo} no prazo</span>
                    {/* Em espera pode ser adicionado aqui se necessário */}
                    <button
                      className="text-red-500 underline hover:text-red-400 cursor-pointer font-semibold"
                      onClick={() => { setSelectedPriority(priority); setShowModal(true); }}
                      style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                      {atrasados} atrasados
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cartões de resumo por prioridade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(slaData).map(([priority, data]) => {
              const percentage = data.total > 0 ? (data.withinSLA / data.total) * 100 : 0;
              const atrasados = data.outsideSLA;
              const noPrazo = data.withinSLA;
              let percentColor = '#10B981'; // verde
              if (atrasados > noPrazo) percentColor = '#EF4444'; // vermelho
              else if (atrasados === noPrazo && atrasados !== 0) percentColor = '#FACC15'; // amarelo
              return (
                <div key={priority} className="rounded-lg p-6 bg-[#181F32] border border-gray-700 flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-${priority === 'P2' ? 'blue' : priority === 'P3' ? 'yellow' : 'green'}-400 font-bold text-lg`}>{priority}</span>
                    <span className="ml-auto text-2xl font-bold" style={{ color: percentColor }}>{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="text-gray-400 text-sm mb-1">Meta de atendimento: {SLA_THRESHOLDS[priority as keyof typeof SLA_THRESHOLDS]} horas</div>
                  <div className="text-gray-400 text-sm mb-1">Total de chamados: {data.total}</div>
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-green-400">{noPrazo} no prazo</span>
                    <button
                      className="text-red-500 underline hover:text-red-400 cursor-pointer font-semibold text-left"
                      onClick={() => { setSelectedPriority(priority); setShowModal(true); }}
                      style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                      {atrasados} atrasados
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal de detalhes dos atrasados */}
          {showModal && selectedPriority && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-[#1C2333] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 relative">
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                  Fechar
                </button>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Chamados {selectedPriority} fora do SLA
                </h2>
                <OutOfSLAIncidents incidents={getAtrasadosPorPrioridade(selectedPriority)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}