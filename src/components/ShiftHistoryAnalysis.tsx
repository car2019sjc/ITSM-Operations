import React, { useMemo, useState } from 'react';
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  X, 
  Clock, 
  AlertTriangle,
  Users,
  Calendar,
  ChevronDown,
  ChevronRight,
  Settings,
  CheckCircle2,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { Incident } from '../types/incident';
import { SHIFTS, SHIFT_LEVELS, SHIFT_SCHEDULES } from '../types/analyst';
import { getShiftFromTime, getShiftName } from '../utils/shiftUtils';
import { parseISO, format, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizePriority } from '../utils/incidentUtils';
import { ShiftConfiguration } from './ShiftConfiguration';

interface ShiftHistoryAnalysisProps {
  incidents: Incident[];
  onClose?: () => void;
}

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

const SHIFT_COLORS = {
  MORNING: '#F59E0B',   // Yellow/Orange for morning
  AFTERNOON: '#3B82F6', // Blue for afternoon
  NIGHT: '#6366F1'      // Indigo for night
};

const PRIORITIES = ['P1', 'P2', 'P3', 'P4', 'Não definido'];

const determineIncidentLevel = (incident: Incident): string => {
  const group = incident.AssignmentGroup?.toLowerCase() || '';
  
  if (group.includes('local support')) {
    return SHIFT_LEVELS.N1;
  }
  if (group.includes('network') || group.includes('server') || group.includes('infrastructure')) {
    return SHIFT_LEVELS.N2;
  }
  return SHIFT_LEVELS.N3;
};

export function ShiftHistoryAnalysis({ incidents, onClose }: ShiftHistoryAnalysisProps) {
  const [expandedShifts, setExpandedShifts] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showShiftConfig, setShowShiftConfig] = useState(false);
  const [currentShifts, setCurrentShifts] = useState(SHIFTS);

  const toggleShift = (shift: string) => {
    setExpandedShifts(prev => 
      prev.includes(shift) 
        ? prev.filter(s => s !== shift)
        : [...prev, shift]
    );
  };

  const handleSaveShifts = (newShifts: typeof SHIFTS) => {
    setCurrentShifts(newShifts);
  };

  const shiftData = useMemo(() => {
    // Initialize data structure for each shift
    const data = Object.keys(currentShifts).reduce((acc, shift) => {
      acc[shift] = {
        key: shift,
        name: currentShifts[shift as keyof typeof currentShifts].name,
        startTime: currentShifts[shift as keyof typeof currentShifts].startTime,
        endTime: currentShifts[shift as keyof typeof currentShifts].endTime,
        total: 0,
        P1: 0,
        P2: 0,
        P3: 0,
        P4: 0,
        'Não definido': 0,
        byLevel: Object.values(SHIFT_LEVELS).reduce((levels, level) => {
          levels[level] = {
            total: 0,
            P1: 0,
            P2: 0,
            P3: 0,
            P4: 0,
            'Não definido': 0
          };
          return levels;
        }, {} as Record<string, any>)
      };
      return acc;
    }, {} as Record<string, any>);

    // Process incidents
    incidents.forEach(incident => {
      try {
        const shift = getShiftFromTime(incident.Opened);
        const priority = normalizePriority(incident.Priority);
        const level = determineIncidentLevel(incident);

        // Update total counts
        data[shift].total++;
        data[shift][priority]++;

        // Update level-specific counts
        data[shift].byLevel[level].total++;
        data[shift].byLevel[level][priority]++;
      } catch (error) {
        // Skip incidents with invalid data
        console.error("Error processing incident:", error);
      }
    });

    return Object.values(data);
  }, [incidents, currentShifts]);

  const monthlyData = useMemo(() => {
    try {
      const end = new Date();
      const start = new Date(end);
      start.setMonth(start.getMonth() - 11);
      const months = eachMonthOfInterval({ start, end });

      return months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthIncidents = incidents.filter(incident => {
          try {
            const incidentDate = parseISO(incident.Opened);
            return isWithinInterval(incidentDate, { start: monthStart, end: monthEnd });
          } catch (error) {
            return false;
          }
        });

        const shiftCounts = Object.keys(currentShifts).reduce((acc, shift) => {
          acc[shift] = {
            total: 0,
            P1: 0,
            P2: 0,
            P3: 0,
            P4: 0,
            'Não definido': 0
          };
          return acc;
        }, {} as Record<string, any>);

        monthIncidents.forEach(incident => {
          try {
            const shift = getShiftFromTime(incident.Opened);
            const priority = normalizePriority(incident.Priority);
            shiftCounts[shift].total++;
            shiftCounts[shift][priority]++;
          } catch (error) {
            // Skip incidents with invalid data
          }
        });

        return {
          month: format(month, 'MMM/yy', { locale: ptBR }),
          ...Object.entries(shiftCounts).reduce((acc, [shift, counts]) => ({
            ...acc,
            [`${shift}_total`]: counts.total,
            ...PRIORITIES.reduce((p, priority) => ({
              ...p,
              [`${shift}_${priority}`]: counts[priority]
            }), {})
          }), {})
        };
      });
    } catch (error) {
      console.error("Error generating monthly data:", error);
      return [];
    }
  }, [incidents, currentShifts]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-[#1F2937] p-4 rounded-lg border border-gray-700 shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="text-white">{entry.value}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total</span>
              <span className="text-white font-bold">
                {payload.reduce((sum: number, entry: any) => sum + entry.value, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Análise por Turno</h2>
          <p className="text-gray-400 mt-1">
            Distribuição de chamados por período: Manhã (06:00h às 14:00h) • Tarde (14:00h às 22:00h) • Noite (22:00h às 06:00h)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShiftConfig(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Configurar Turnos</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shiftData.map(shift => (
          <div 
            key={shift.key}
            className="bg-[#1C2333] p-4 rounded-lg"
            style={{ borderLeft: `4px solid ${SHIFT_COLORS[shift.key as keyof typeof SHIFT_COLORS]}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" style={{ color: SHIFT_COLORS[shift.key as keyof typeof SHIFT_COLORS] }} />
                <div>
                  <h3 className="text-lg font-medium text-white">{shift.name}</h3>
                  <p className="text-sm text-gray-400">{shift.startTime}h às {shift.endTime}h</p>
                </div>
              </div>
              <button
                onClick={() => toggleShift(shift.key)}
                className="p-2 hover:bg-[#151B2B] rounded-lg transition-colors"
              >
                {expandedShifts.includes(shift.key) ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{shift.total}</span>
                <span className="text-sm text-gray-400">chamados</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {PRIORITIES.map(priority => (
                  <div 
                    key={priority}
                    className="text-center p-2 rounded-lg bg-[#151B2B]"
                  >
                    <p className="text-sm" style={{ color: CHART_COLORS[priority as keyof typeof CHART_COLORS] }}>
                      {priority}
                    </p>
                    <p className="text-white font-medium">{shift[priority]}</p>
                  </div>
                ))}
              </div>

              {expandedShifts.includes(shift.key) && (
                <div className="pt-4 space-y-4">
                  {/* Categorias Comuns Section */}
                  <div className="bg-[#151B2B] p-4 rounded-lg">
                    <h4 className="text-yellow-300 font-medium mb-3">Categorias Comuns</h4>
                    <div className="space-y-2">
                      {Object.entries(shift.byLevel).map(([level, counts]: [string, any]) => (
                        <div key={level} className="text-yellow-200">
                          • {level}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Padrões Identificados Section */}
                  <div className="bg-[#151B2B] p-4 rounded-lg">
                    <h4 className="text-yellow-300 font-medium mb-3">Padrões Identificados</h4>
                    <div className="space-y-2">
                      {Object.entries(shift.byLevel).map(([level, counts]: [string, any]) => (
                        <div key={level} className="bg-[#1C2333] p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-yellow-200">{level}</span>
                            <span className="text-sm text-gray-400">{counts.total} chamados</span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            {PRIORITIES.map(priority => {
                              const width = counts.total > 0 ? (counts[priority] / counts.total) * 100 : 0;
                              return (
                                <div
                                  key={priority}
                                  className="h-full float-left"
                                  style={{
                                    width: `${width}%`,
                                    backgroundColor: CHART_COLORS[priority as keyof typeof CHART_COLORS]
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recomendações Section */}
                  <div className="bg-[#151B2B] p-4 rounded-lg">
                    <h4 className="text-yellow-300 font-medium mb-3">Recomendações</h4>
                    <div className="space-y-2 text-yellow-200">
                      <div>• Otimização do processo de atendimento</div>
                      <div>• Treinamento específico para demandas do turno</div>
                      <div>• Revisão da distribuição de recursos</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1C2333] p-4 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Distribuição Mensal por Turno</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                axisLine={{ stroke: '#374151' }}
              />
              <Tooltip content={<CustomTooltip />} />
              {Object.keys(currentShifts).map(shift => (
                <Bar
                  key={shift}
                  dataKey={`${shift}_total`}
                  name={currentShifts[shift as keyof typeof currentShifts].name}
                  fill={SHIFT_COLORS[shift as keyof typeof SHIFT_COLORS]}
                  stackId="shift"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cross-Shift Patterns Section */}
      <div className="bg-[#1C2333] p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-medium text-white mb-4">Padrões Entre Turnos</h3>
        <div className="bg-[#151B2B] p-4 rounded-lg">
          <p className="text-yellow-200">
            • Solicitações de suporte local são um problema constante em todos os turnos
          </p>
        </div>

        <div className="bg-[#151B2B] p-4 rounded-lg">
          <h4 className="text-yellow-300 font-medium mb-3">Recomendações Gerais</h4>
          <div className="space-y-2 text-yellow-200">
            <p>• Capacitação contínua dos times de suporte técnico para melhor atendimento</p>
            <p>• Implementação de processos de documentação padronizados</p>
            <p>• Revisão periódica dos procedimentos de escalação</p>
          </div>
        </div>
      </div>

      {showShiftConfig && (
        <ShiftConfiguration
          onClose={() => setShowShiftConfig(false)}
          onSave={handleSaveShifts}
        />
      )}
    </div>
  );
}