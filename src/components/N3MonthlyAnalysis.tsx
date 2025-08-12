import React, { useMemo } from 'react';
import { parseISO, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Incident } from '../types/incident';
import { normalizePriority } from '../utils/incidentUtils';
import { getShiftFromTime, getShiftName } from '../utils/shiftUtils';
import { loadAnalystMapping } from '../utils/analystMappingStore';
import { X } from 'lucide-react';
import { IncidentDetails } from './IncidentDetails';

interface N3MonthlyAnalysisProps {
  incidents: Incident[];
  dateRange: { start: Date; end: Date };
  onClose: () => void;
}

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981'
};

function isIncidentWithinRange(incident: Incident, range: { start: Date; end: Date }): boolean {
  try {
    const d = parseISO(incident.Opened);
    return isWithinInterval(d, range);
  } catch {
    return false;
  }
}

export function N3MonthlyAnalysis({ incidents, dateRange, onClose }: N3MonthlyAnalysisProps) {
  const manual = useMemo(() => loadAnalystMapping(), []);
  const [listMonth, setListMonth] = React.useState<string | null>(null);
  const [listShift, setListShift] = React.useState<'MORNING'|'AFTERNOON'|'NIGHT'|null>(null);
  const [listOpen, setListOpen] = React.useState(false);
  const [selectedIncident, setSelectedIncident] = React.useState<Incident | null>(null);
  const toMonthLabel = (ym: string) => {
    try {
      const [year, month] = ym.split('-').map(Number);
      const d = new Date(year, (month || 1) - 1, 1);
      return format(d, 'MMM/yy', { locale: ptBR }).toLowerCase();
    } catch {
      return ym;
    }
  };

  const normalizeStr = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const getRawLevel = (i: Incident): string => {
    const candidates = [
      (i as any)['Nível de Atendimento'],
      (i as any)['Nivel de Atendimento'],
      (i as any)['Nível de Suporte'],
      (i as any)['Nivel de Suporte'],
      (i as any)['Nível'],
      (i as any)['Nivel'],
      (i as any)['Função Associada'],
      (i as any)['Funcao Associada'],
      (i as any)['FuncaoAssociada'],
      (i as any)['Support Level'],
      (i as any)['SupportLevel'],
      (i as any)['Level'],
      (i as any)['level']
    ];
    const found = candidates.find(v => typeof v === 'string' && v.trim() !== '');
    return String(found || '');
  };
  const isLevelN3 = (value?: string): boolean => {
    if (!value) return false;
    const v = normalizeStr(value);
    if (!v) return false;
    if (v.includes('suporte') && v.includes('n3')) return true;
    return /(\bn\s*3\b|nivel\s*3|nivel de suporte\s*3|support\s*level\s*3|level\s*3)/i.test(v);
  };
  const isN3 = (i: Incident): boolean => {
    const analyst = (i.AssignedTo || '').trim().toLowerCase();
    const match = manual.find(m => (m.analyst || '').trim().toLowerCase() === analyst);
    const manualLevel = match?.level ? String(match.level) : '';
    const rawLevel = getRawLevel(i);
    return isLevelN3(manualLevel) || isLevelN3(rawLevel);
  };

  const data = useMemo(() => {

    // Filtrar incidentes N3 dentro do período
    const filtered = incidents.filter(i => isIncidentWithinRange(i, dateRange) && isN3(i));

    // Agrupar mês a mês e preparar chaves por turno e prioridade
    const shifts = ['MORNING','AFTERNOON','NIGHT'] as const;
    const priorities = ['P1','P2','P3','P4'] as const;
    const byMonth: Record<string, any> = {};
    filtered.forEach(i => {
      const d = parseISO(i.Opened);
      const key = format(d, 'yyyy-MM');
      const shift = getShiftFromTime(i.Opened);
      const priority = normalizePriority(i.Priority);
      if (!byMonth[key]) {
        const base: any = { month: key, total: 0, P1:0,P2:0,P3:0,P4:0, MORNING:0, AFTERNOON:0, NIGHT:0 };
        shifts.forEach(s => priorities.forEach(p => { base[`${s}_${p}`] = 0; }));
        byMonth[key] = base;
      }
      byMonth[key].total++;
      byMonth[key][priority]++;
      byMonth[key][shift]++;
      byMonth[key][`${shift}_${priority}`]++;
    });

    // Ordenar por mês ascendente
    const chartData = Object.values(byMonth).sort((a: any, b: any) => (a.month < b.month ? -1 : 1));
    return chartData as Array<{
      month: string; total: number; P1: number; P2: number; P3: number; P4: number; MORNING: number; AFTERNOON: number; NIGHT: number;
    }>;
  }, [incidents, dateRange, manual]);

  const PriorityLegend = () => (
    <div className="flex flex-wrap items-center gap-4 justify-center text-sm text-gray-300 mt-2">
      {(
        [
          { key: 'P1', color: CHART_COLORS.P1 },
          { key: 'P2', color: CHART_COLORS.P2 },
          { key: 'P3', color: CHART_COLORS.P3 },
          { key: 'P4', color: CHART_COLORS.P4 }
        ] as const
      ).map(item => (
        <div key={item.key} className="flex items-center gap-2">
          <span style={{ background: item.color }} className="inline-block w-3 h-3 rounded-sm" />
          <span>{item.key}</span>
        </div>
      ))}
    </div>
  );

  // Máximo global entre turnos para alinhar as alturas em todos os gráficos
  const yMax = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return 0;
    return Math.max(
      ...data.map(d => Math.max(Number(d.MORNING || 0), Number(d.AFTERNOON || 0), Number(d.NIGHT || 0)))
    );
  }, [data]);

  // Lista de incidentes por mês/turno quando solicitado
  const listIncidents = useMemo(() => {
    if (!listMonth || !listShift) return [] as Incident[];
    return incidents.filter(i => {
      if (!isIncidentWithinRange(i, dateRange) || !isN3(i)) return false;
      const key = format(parseISO(i.Opened), 'yyyy-MM');
      if (key !== listMonth) return false;
      return getShiftFromTime(i.Opened) === listShift;
    });
  }, [listMonth, listShift, incidents, dateRange, manual]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">N3 - Análise Mensal por Prioridade e Turno</h2>
            <p className="text-gray-400 text-sm mt-1">Período: {format(dateRange.start, 'dd/MM/yyyy')} — {format(dateRange.end, 'dd/MM/yyyy')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 overflow-auto max-h-[calc(90vh-120px)]">
          {/* Pequenos múltiplos: um gráfico por turno (mais legível) */}
          <div className="bg-[#1C2333] p-4 rounded-lg">
            <h3 className="text-white font-medium mb-3">N3 por Mês (por Turno e Prioridade)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {([
                { key: 'MORNING', label: 'Manhã' },
                { key: 'AFTERNOON', label: 'Tarde' },
                { key: 'NIGHT', label: 'Noite' }
              ] as const).map(s => (
                <div key={s.key} className="h-64 bg-[#0F172A] rounded-md p-2">
                  <div className="text-gray-300 text-sm mb-1 text-center">{s.label}</div>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={toMonthLabel} />
                      <YAxis allowDecimals={false} domain={[0, Math.max(1, yMax)]} tickCount={Math.min(6, Math.max(2, yMax + 1))} />
                      {/* Tooltip removido para visual mais limpo */}
                      <Bar dataKey={`${s.key}_P1`} stackId="prio" fill={CHART_COLORS.P1} />
                      <Bar dataKey={`${s.key}_P2`} stackId="prio" fill={CHART_COLORS.P2} />
                      <Bar dataKey={`${s.key}_P3`} stackId="prio" fill={CHART_COLORS.P3} />
                      <Bar dataKey={`${s.key}_P4`} stackId="prio" fill={CHART_COLORS.P4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
            <PriorityLegend />
          </div>

          {/* Tabela por turno para cada mês */}
          <div className="bg-[#1C2333] p-4 rounded-lg">
            <h3 className="text-white font-medium mb-3">N3 por Turno (por Mês)</h3>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#0F172A] text-gray-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Mês</th>
                    <th className="px-3 py-2 text-left">Manhã</th>
                    <th className="px-3 py-2 text-left">Tarde</th>
                    <th className="px-3 py-2 text-left">Noite</th>
                    <th className="px-3 py-2 text-left">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(row => (
                    <tr key={row.month} className="border-t border-gray-700">
                      <td className="px-3 py-2 text-white">{toMonthLabel(row.month)}</td>
                      <td className={`px-3 py-2 ${row.MORNING>0 ? 'text-blue-300 cursor-pointer hover:underline' : 'text-gray-300'}`}
                        onClick={() => { if (row.MORNING>0){ setListMonth(row.month); setListShift('MORNING'); setListOpen(true);} }}
                      >{row.MORNING}</td>
                      <td className={`px-3 py-2 ${row.AFTERNOON>0 ? 'text-blue-300 cursor-pointer hover:underline' : 'text-gray-300'}`}
                        onClick={() => { if (row.AFTERNOON>0){ setListMonth(row.month); setListShift('AFTERNOON'); setListOpen(true);} }}
                      >{row.AFTERNOON}</td>
                      <td className={`px-3 py-2 ${row.NIGHT>0 ? 'text-blue-300 cursor-pointer hover:underline' : 'text-gray-300'}`}
                        onClick={() => { if (row.NIGHT>0){ setListMonth(row.month); setListShift('NIGHT'); setListOpen(true);} }}
                      >{row.NIGHT}</td>
                      <td className="px-3 py-2 text-gray-300">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal de lista por mês/turno */}
          {listOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
              <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                  <div className="text-white font-semibold">
                    Chamados N3 • {toMonthLabel(listMonth!)} • {listShift === 'MORNING' ? 'Manhã' : listShift === 'AFTERNOON' ? 'Tarde' : 'Noite'} ({listIncidents.length})
                  </div>
                  <button onClick={() => setListOpen(false)} className="p-2 hover:bg-[#1C2333] rounded">
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
                <div className="overflow-auto max-h-[calc(90vh-100px)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[#1C2333] sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-300">Número</th>
                        <th className="px-4 py-3 text-left text-gray-300">Data</th>
                        <th className="px-4 py-3 text-left text-gray-300">Descrição</th>
                        <th className="px-4 py-3 text-left text-gray-300">Prioridade</th>
                        <th className="px-4 py-3 text-left text-gray-300">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {listIncidents.map((it) => (
                        <tr key={it.Number} className="hover:bg-[#1C2333] cursor-pointer" onClick={() => { setListOpen(false); setSelectedIncident(it); }}>
                          <td className="px-4 py-3 text-white">{it.Number}</td>
                          <td className="px-4 py-3 text-gray-300">{(() => { try { return format(parseISO(it.Opened), 'dd/MM/yyyy HH:mm'); } catch { return it.Opened; } })()}</td>
                          <td className="px-4 py-3 text-gray-300">{it.ShortDescription}</td>
                          <td className="px-4 py-3 text-gray-300">{it.Priority}</td>
                          <td className="px-4 py-3 text-gray-300">{it.State}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {selectedIncident && (
            <IncidentDetails incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
          )}
        </div>
      </div>
    </div>
  );
}


