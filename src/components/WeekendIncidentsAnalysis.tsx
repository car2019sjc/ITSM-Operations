import React, { useState } from 'react';
import { Calendar, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts';

interface WeekendIncidentsAnalysisProps {
  data: any;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export function WeekendIncidentsAnalysis({ data, dateRange }: WeekendIncidentsAnalysisProps) {
  const [drilldown, setDrilldown] = useState<{ monthYear: string; turno: string } | null>(null);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const turnosList = ['Manhã', 'Tarde', 'Noite', 'Madrugada', 'Desconhecido'];

  // Estado para localidade selecionada no drilldown
  const [selectedLocalidade, setSelectedLocalidade] = useState<string | null>(null);

  // Estado para modal de detalhes do chamado
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  // Função para verificar se uma data é fim de semana
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
  };

  // Função para verificar se uma data é feriado (exemplo de feriados nacionais)
  const isHoliday = (date: Date) => {
    const holidays = [
      '01-01', // Ano Novo
      '04-21', // Tiradentes
      '05-01', // Dia do Trabalho
      '09-07', // Independência
      '10-12', // Nossa Senhora Aparecida
      '11-02', // Finados
      '11-15', // Proclamação da República
      '12-25'  // Natal
    ];
    
    const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidays.includes(monthDay);
  };

  // Filtrar chamados de finais de semana e feriados
  const weekendIncidents = data.filter((incident: any) => {
    const incidentDate = new Date(incident.Opened);
    return isWeekend(incidentDate) || isHoliday(incidentDate);
  });

  // Agrupar por tipo de dia (fim de semana ou feriado)
  const groupedIncidents = weekendIncidents.reduce((acc: any, incident: any) => {
    const date = new Date(incident.Opened);
    const type = isHoliday(date) ? 'Feriado' : 'Fim de Semana';
    
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(incident);
    return acc;
  }, {});

  // Encontrar todos os dias únicos de finais de semana/feriados
  const diasUnicos = new Set(weekendIncidents.map((incident: any) => {
    const d = new Date(incident.Opened);
    return d.toISOString().slice(0, 10); // yyyy-mm-dd
  }));
  const totalDiasUnicos = diasUnicos.size;
  const mediaPorDia = totalDiasUnicos > 0 ? (weekendIncidents.length / totalDiasUnicos).toFixed(1) : '0';

  // Gerar dados agrupados por mês/ano
  const monthYearCount: Record<string, number> = {};
  weekendIncidents.forEach((incident: any) => {
    const date = new Date(incident.Opened);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const key = `${month}/${year}`;
    monthYearCount[key] = (monthYearCount[key] || 0) + 1;
  });

  // Agrupar por mês/ano e contar dias únicos de fim de semana/feriado por mês
  const monthYearDiasUnicos: Record<string, Set<string>> = {};
  weekendIncidents.forEach((incident: any) => {
    const date = new Date(incident.Opened);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const key = `${month}/${year}`;
    const dia = date.toISOString().slice(0, 10);
    if (!monthYearDiasUnicos[key]) monthYearDiasUnicos[key] = new Set();
    monthYearDiasUnicos[key].add(dia);
  });

  // Gerar dados agrupados por mês/ano com média por mês
  const chartData = Object.entries(monthYearCount).map(([monthYear, count]) => ({
    monthYear,
    count,
    media: monthYearDiasUnicos[monthYear] ? (count / monthYearDiasUnicos[monthYear].size).toFixed(1) : '0',
    dias: monthYearDiasUnicos[monthYear] ? monthYearDiasUnicos[monthYear].size : 0
  })).sort((a, b) => {
    // Ordenar por ano e mês
    const [mA, yA] = a.monthYear.split('/').map(Number);
    const [mB, yB] = b.monthYear.split('/').map(Number);
    return yA !== yB ? yA - yB : mA - mB;
  });

  // Função para identificar o turno do chamado
  const getTurno = (date: Date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return 'Desconhecido';
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'Manhã';
    if (hour >= 12 && hour < 18) return 'Tarde';
    if (hour >= 18 && hour < 24) return 'Noite';
    if (hour >= 0 && hour < 6) return 'Madrugada';
    return 'Desconhecido';
  };

  // Gerar dados para gráfico empilhado por mês/ano e turno
  const stackedMonthTurno: Record<string, Record<string, number>> = {};
  weekendIncidents.forEach((incident: any) => {
    const date = new Date(incident.Opened);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const key = `${month}/${year}`;
    const turno = getTurno(date);
    if (!stackedMonthTurno[key]) stackedMonthTurno[key] = { 'Manhã': 0, 'Tarde': 0, 'Noite': 0, 'Madrugada': 0, 'Desconhecido': 0 };
    stackedMonthTurno[key][turno] = (stackedMonthTurno[key][turno] || 0) + 1;
  });
  const stackedChartData = Object.entries(stackedMonthTurno).map(([monthYear, turnos]) => ({
    monthYear,
    ...turnos
  })).sort((a, b) => {
    const [mA, yA] = a.monthYear.split('/').map(Number);
    const [mB, yB] = b.monthYear.split('/').map(Number);
    return yA !== yB ? yA - yB : mA - mB;
  });

  // Função para abrir drilldown por mês (padrão: Manhã)
  const handleMonthClick = (monthYear: string) => {
    setDrilldown({ monthYear, turno: 'Manhã' });
    setShowDrilldown(true);
  };

  // Função para abrir drilldown por turno (usada no gráfico)
  const handleBarClick = (data: any, index: number, turno: string) => {
    setDrilldown({ monthYear: data.monthYear, turno });
    setShowDrilldown(true);
  };

  // Função para trocar turno no drilldown
  const handleTurnoChange = (turno: string) => {
    if (drilldown) setDrilldown({ ...drilldown, turno });
  };

  // Filtrar chamados do drilldown
  let drilldownIncidents: any[] = [];
  if (drilldown) {
    drilldownIncidents = weekendIncidents.filter((incident: any) => {
      const date = new Date(incident.Opened);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const key = `${month}/${year}`;
      const turno = getTurno(date);
      return key === drilldown.monthYear && turno === drilldown.turno;
    });
  }

  // Agrupar por função e localidade
  const funcaoCount: Record<string, number> = {};
  const localidadeCount: Record<string, number> = {};
  drilldownIncidents.forEach((incident: any) => {
    let funcao = incident.FuncaoAssociada ? String(incident.FuncaoAssociada).trim() : '';
    let local = incident.AssignmentGroup ? String(incident.AssignmentGroup).trim() : '';
    funcao = funcao ? funcao.toUpperCase() : 'NÃO INFORMADA';
    local = local ? local.toUpperCase() : 'NÃO INFORMADA';
    funcaoCount[funcao] = (funcaoCount[funcao] || 0) + 1;
    localidadeCount[local] = (localidadeCount[local] || 0) + 1;
  });

  // Filtrar chamados do drilldown por localidade, se selecionada
  let filteredDrilldownIncidents = drilldownIncidents;
  if (selectedLocalidade) {
    filteredDrilldownIncidents = drilldownIncidents.filter((incident: any) => {
      let local = incident.AssignmentGroup ? String(incident.AssignmentGroup).trim().toUpperCase() : 'NÃO INFORMADA';
      return local === selectedLocalidade;
    });
  }

  // Função para abrir modal de detalhes
  const handleIncidentDetails = (incident: any) => {
    setSelectedIncident(incident);
  };
  // Função para fechar modal de detalhes
  const closeIncidentDetails = () => {
    setSelectedIncident(null);
  };

  // Função utilitária para converter data brasileira para Date
  function parseDateBR(dateStr: string): Date | null {
    if (!dateStr || typeof dateStr !== 'string') return null;
    // Tenta converter formato brasileiro dd/MM/yyyy HH:mm:ss
    const match = dateStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      const [_, dd, mm, yyyy, hh, min, ss] = match;
      return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`);
    }
    // Tenta converter formato ISO ou outros
    const d = new Date(dateStr.trim());
    return isNaN(d.getTime()) ? null : d;
  }

  // Função para identificar o tipo de dia da abertura
  function getTipoDia(date: Date) {
    if (isHoliday(date)) return 'Feriado';
    if (date.getDay() === 0) return 'Domingo';
    if (date.getDay() === 6) return 'Sábado';
    return 'Dia útil';
  }

  // Tooltip customizado para o gráfico de turnos
  const CustomTurnoTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    return (
      <div style={{
        background: '#232B3B',
        borderRadius: 8,
        padding: 14,
        color: '#fff',
        boxShadow: '0 2px 8px #0008',
        minWidth: 150,
        border: '1px solid #334155',
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 15 }}>{label}</div>
        <div style={{ fontSize: 13, marginBottom: 8, color: '#fbbf24' }}>Total: <b>{total}</b></div>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 4, fontSize: 13 }}>
            <span style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              background: entry.color,
              borderRadius: '50%',
              marginRight: 8,
              border: '1px solid #fff2',
            }} />
            <span style={{ color: entry.color, fontWeight: 600 }}>{entry.name}</span>
            <span style={{ marginLeft: 8, color: '#fff' }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas compactas no topo */}
      <div className="flex flex-wrap gap-6 mb-2 justify-center">
        <div className="bg-[#232B3B] rounded-lg px-6 py-3 flex flex-col items-center min-w-[160px]">
          <span className="text-xs text-gray-400">Total de Chamados</span>
          <span className="text-2xl font-bold text-white">{weekendIncidents.length}</span>
        </div>
        <div className="bg-[#232B3B] rounded-lg px-6 py-3 flex flex-col items-center min-w-[160px]">
          <span className="text-xs text-gray-400">Média por Dia <span className='text-[10px]'>(em {totalDiasUnicos} dias)</span></span>
          <span className="text-2xl font-bold text-white">{mediaPorDia}</span>
        </div>
      </div>
      <div className="flex flex-col items-center w-full">
        <div className="bg-[#1E293B] rounded-lg p-6 w-full max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 text-blue-500" />
            <h3 className="text-xl font-bold text-white">Chamados em Fins de Semana</h3>
          </div>
          {/* Gráfico mês a mês */}
          {chartData.length > 0 && (
            <div className="mt-8">
              <h4 className="text-white font-bold mb-2">Distribuição Mês a Mês</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="monthYear" stroke="#cbd5e1" onClick={(e) => { if (e && e.activeLabel) handleMonthClick(e.activeLabel); }} />
                  <YAxis stroke="#cbd5e1" allowDecimals={false} />
                  <Tooltip formatter={(value: any, name: any, props: any) => [value, name === 'media' ? 'Média por Dia' : name]} />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Chamados">
                    <LabelList dataKey="count" position="top" fill="#fff" fontSize={14} fontWeight={700} />
                    <LabelList dataKey="media" position="insideBottom" fill="#fbbf24" fontSize={12} formatter={(v: any, entry: any) => `Média: ${v}`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {chartData.map(({ monthYear, media, dias }) => (
                  <div key={monthYear} className="bg-[#232B3B] rounded px-4 py-2 text-center">
                    <span className="block text-xs text-gray-400">{monthYear} — Média por FDS/Feriado</span>
                    <span className="block text-lg font-bold text-white">{media}</span>
                    <span className="block text-xs text-gray-400">({dias} dias)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Gráfico empilhado por turnos */}
          {stackedChartData.length > 0 && (
            <div className="mt-8">
              <h4 className="text-white font-bold mb-2">Distribuição por Turnos (Mês a Mês) <span className='text-xs text-gray-300 font-normal'>... clique no gráfico para obter detalhes</span></h4>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stackedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="monthYear" stroke="#cbd5e1" />
                  <YAxis stroke="#cbd5e1" allowDecimals={false} />
                  <Tooltip content={<CustomTurnoTooltip />} />
                  <Legend
                    wrapperStyle={{
                      paddingTop: 8,
                      fontSize: 13,
                      color: '#cbd5e1',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                    iconType="circle"
                    align="center"
                    verticalAlign="top"
                  />
                  <Bar dataKey="Manhã" stackId="a" fill="#ffe066" name="Manhã" onClick={(data, idx) => handleBarClick(data, idx, 'Manhã')} cursor="pointer" />
                  <Bar dataKey="Tarde" stackId="a" fill="#60a5fa" name="Tarde" onClick={(data, idx) => handleBarClick(data, idx, 'Tarde')} cursor="pointer" />
                  <Bar dataKey="Noite" stackId="a" fill="#a78bfa" name="Noite" onClick={(data, idx) => handleBarClick(data, idx, 'Noite')} cursor="pointer" />
                  <Bar dataKey="Madrugada" stackId="a" fill="#94a3b8" name="Madrugada" onClick={(data, idx) => handleBarClick(data, idx, 'Madrugada')} cursor="pointer" />
                  <Bar dataKey="Desconhecido" stackId="a" fill="#f87171" name="Desconhecido" onClick={(data, idx) => handleBarClick(data, idx, 'Desconhecido')} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Drilldown Modal */}
      {showDrilldown && drilldown && (
        /*
          ===================== INÍCIO DO MODAL DE DRILLDOWN =====================
          Este modal exibe detalhes dos chamados agrupados por mês/turno.
          Permite navegação entre turnos, filtro por localidade e visualização detalhada.
          Para customizar, altere as seções abaixo conforme a necessidade.
        */
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={() => setShowDrilldown(false)}>
          <div
            className="bg-[#151B2B] rounded-lg p-8 max-w-4xl w-full relative shadow-2xl border border-gray-700"
            onClick={e => e.stopPropagation()}
          >
            {/* Botão de fechar modal */}
            <button
              onClick={() => setShowDrilldown(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
              aria-label="Fechar drilldown"
            >
              ×
            </button>
            {/* Título e navegação de turnos */}
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Clock className="w-7 h-7 text-blue-400" /> Drilldown: {drilldown.monthYear}
            </h2>
            <div className="mb-6 flex flex-wrap gap-2">
              {/* Botões de turno - destaque para o selecionado */}
              {turnosList.map((turno) => (
                <button
                  key={turno}
                  onClick={() => handleTurnoChange(turno)}
                  className={`px-4 py-2 rounded font-bold text-base shadow transition-all border-2 ${drilldown.turno === turno ? 'bg-blue-600 text-white border-blue-400 scale-105' : 'bg-[#232B3B] text-gray-300 border-transparent hover:bg-blue-800 hover:border-blue-400'}`}
                >
                  {turno}
                  <span className="ml-2 text-xs font-normal text-blue-200">{drilldown.turno === turno ? filteredDrilldownIncidents.length : ''}</span>
                </button>
              ))}
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Turno Selecionado: <span className="text-blue-300">{drilldown.turno}</span></h3>
            <div className="flex flex-col md:flex-row gap-8 mb-8">
              {/* Seção Por Função: mostra agrupamento e mini barras de proporção */}
              <div className="flex-1 min-w-[260px]">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center justify-between">
                  Por Função <span className="text-blue-400 font-bold">({Object.values(funcaoCount).reduce((a, b) => a + b, 0)})</span>
                </h3>
                <ul>
                  {Object.entries(funcaoCount).map(([funcao, count]) => {
                    const max = Math.max(...Object.values(funcaoCount));
                    return (
                      <li key={funcao} className="flex items-center justify-between mb-1">
                        <span className="break-words whitespace-normal" title={funcao}>{funcao}</span>
                        <div className="flex items-center gap-2 min-w-[60px]">
                          <div className="bg-blue-600 h-2 rounded transition-all" style={{ width: `${(count / (max || 1)) * 60}px` }} />
                          <span className="font-bold text-white">{count}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {/* Seção Por Localidade: agrupamento e filtro por localidade */}
              <div className="flex-1 min-w-[260px]">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center justify-between">
                  Por Localidade <span className="text-blue-400 font-bold">({Object.values(localidadeCount).reduce((a, b) => a + b, 0)})</span>
                </h3>
                <ul>
                  {Object.entries(localidadeCount).map(([local, count]) => {
                    const max = Math.max(...Object.values(localidadeCount));
                    return (
                      <li key={local} className="flex items-center justify-between mb-1 cursor-pointer hover:text-blue-400" onClick={() => setSelectedLocalidade(local)}>
                        <span className="break-words whitespace-normal" title={local}>{local}</span>
                        <div className="flex items-center gap-2 min-w-[60px]">
                          <div className="bg-green-600 h-2 rounded transition-all" style={{ width: `${(count / (max || 1)) * 60}px` }} />
                          <span className="font-bold text-white">{count}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {/* Botão para remover filtro de localidade */}
                {selectedLocalidade && (
                  <button onClick={() => setSelectedLocalidade(null)} className="mt-2 px-3 py-1 rounded bg-blue-600 text-white font-bold text-sm">Voltar para todas as localidades</button>
                )}
              </div>
            </div>
            {/* Lista de detalhes dos chamados filtrados */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Detalhes dos Chamados{selectedLocalidade ? ` - ${selectedLocalidade}` : ''}</h3>
              <ul className="space-y-1 max-h-60 overflow-y-auto pr-2">
                {filteredDrilldownIncidents.length === 0 && (
                  <li className="text-gray-400 italic">Nenhum chamado encontrado para este turno/localidade.</li>
                )}
                {filteredDrilldownIncidents.map((incident: any) => (
                  <li key={incident.id || incident.Number} className="flex flex-col text-gray-400 border-b border-gray-700 py-1 relative group">
                    <span className="font-bold text-white flex items-center justify-between">
                      {incident.ShortDescription}
                      {/* Botão para abrir modal de detalhes do chamado */}
                      <button onClick={() => handleIncidentDetails(incident)} className="ml-2 p-1 rounded hover:bg-blue-700 transition-colors" title="Ver detalhes do chamado">
                        <ExternalLink className="w-4 h-4 text-blue-400 group-hover:text-white" />
                      </button>
                    </span>
                    <span>Função: {incident.FuncaoAssociada ? String(incident.FuncaoAssociada).trim().toUpperCase() : 'NÃO INFORMADA'} | Localidade: {incident.AssignmentGroup ? String(incident.AssignmentGroup).trim().toUpperCase() : 'NÃO INFORMADA'}</span>
                    <span>Data/Hora: {new Date(incident.Opened).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        /*
          ===================== FIM DO MODAL DE DRILLDOWN =====================
        */
      )}

      {/* Modal de detalhes do chamado */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#151B2B] rounded-lg p-8 max-w-xl w-full relative shadow-2xl border border-gray-700">
            <button
              onClick={closeIncidentDetails}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
              aria-label="Fechar detalhes do chamado"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-white mb-4">Chamado {selectedIncident.Number}</h2>
            <div className="flex gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedIncident.State === 'Closed' ? 'bg-green-700 text-white' : 'bg-yellow-700 text-white'}`}>{selectedIncident.State}</span>
              {selectedIncident.Priority && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-800 text-white">Prioridade {selectedIncident.Priority}</span>
              )}
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-1">Descrição</h3>
              <div className="bg-[#232B3B] rounded p-2 text-gray-200">{selectedIncident.ShortDescription}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="block text-xs text-gray-400">Solicitante</span>
                <span className="block text-white font-bold">{selectedIncident.Caller}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400">Grupo Responsável</span>
                <span className="block text-white font-bold">{selectedIncident.AssignmentGroup}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400">Data de Abertura</span>
                <span className="block text-white font-bold">{selectedIncident.Opened ? new Date(selectedIncident.Opened).toLocaleString() : '-'}</span>
                {selectedIncident.Opened && (
                  <span className="block text-xs text-blue-400 mt-1">Aberto em: {getTipoDia(new Date(selectedIncident.Opened))}</span>
                )}
              </div>
              <div>
                <span className="block text-xs text-gray-400">Categoria</span>
                <span className="block text-white font-bold">{selectedIncident.Category || '-'}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400">Analista Responsável</span>
                <span className="block text-white font-bold">{selectedIncident.AssignedTo || '-'}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400">{['Closed','Resolved'].includes((selectedIncident.State || '').toString()) ? 'Data de Fechamento' : 'Última Atualização'}</span>
                <span className="block text-white font-bold">
                  {selectedIncident.Updated && typeof selectedIncident.Updated === 'string' && selectedIncident.Updated.trim() && selectedIncident.Updated.trim().toLowerCase() !== 'null'
                    ? (parseDateBR(selectedIncident.Updated.trim()) ? parseDateBR(selectedIncident.Updated.trim())!.toLocaleString() : '-')
                    : '-'}
                </span>
              </div>
            </div>
            {/* SLA e outros campos podem ser adicionados aqui */}
            {selectedIncident.ResponseTime && (
              <div className="mt-2 text-red-400 font-bold">{selectedIncident.ResponseTime}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 