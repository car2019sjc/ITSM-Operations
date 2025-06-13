import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  BarChart2,
  ChevronDown,
  ChevronRight,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { Incident } from '../types/incident';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval,
  isWithinInterval,
  addMonths,
  subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizePriority } from '../utils/incidentUtils';
import { normalizeLocationName } from '../utils/locationUtils';

interface GroupHistoryAnalysisProps {
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

const PRIORITIES = ['P1', 'P2', 'P3', 'P4', 'Não definido'];

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

export function GroupHistoryAnalysis({ incidents, onClose }: GroupHistoryAnalysisProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 11);
    return format(startOfMonth(date), 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const toggleGroup = (group: string) => {
    setSelectedGroup(selectedGroup === group ? null : group);
  };

  const monthlyData = useMemo(() => {
    const end = parseISO(endDate);
    const start = parseISO(startDate);
    const months = eachMonthOfInterval({ start, end });

    // Get unique groups from incidents
    const uniqueGroups = Array.from(new Set(incidents
      .map(incident => normalizeLocationName(incident.AssignmentGroup))
      .filter(group => group) // Filter out undefined/null
    )).sort();

    const globalData = months.map(month => {
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

      const data: Record<string, any> = {
        month: month.getTime(),
        monthLabel: format(month, 'MMM/yy', { locale: ptBR }),
        total: monthIncidents.length
      };

      PRIORITIES.forEach(priority => {
        data[priority] = monthIncidents.filter(i => 
          normalizePriority(i.Priority) === priority
        ).length;
      });

      return data;
    });

    const groupsData = uniqueGroups.map(group => {
      const monthlyStats = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthIncidents = incidents.filter(incident => {
          try {
            const incidentDate = parseISO(incident.Opened);
            return normalizeLocationName(incident.AssignmentGroup) === group &&
                   isWithinInterval(incidentDate, { start: monthStart, end: monthEnd });
          } catch (error) {
            return false;
          }
        });

        const data: Record<string, any> = {
          month: month.getTime(),
          monthLabel: format(month, 'MMM/yy', { locale: ptBR }),
          total: monthIncidents.length
        };

        PRIORITIES.forEach(priority => {
          data[priority] = monthIncidents.filter(i => 
            normalizePriority(i.Priority) === priority
          ).length;
        });

        return data;
      });

      const totalIncidents = monthlyStats.reduce((sum, month) => sum + month.total, 0);
      const priorityStats = PRIORITIES.reduce((acc, priority) => ({
        ...acc,
        [priority]: monthlyStats.reduce((sum, month) => sum + month[priority], 0)
      }), {});

      return {
        name: group,
        data: monthlyStats,
        total: totalIncidents,
        ...priorityStats
      };
    });

    return [
      {
        name: 'Brazil - Global Tickets',
        data: globalData,
        total: globalData.reduce((sum, month) => sum + month.total, 0)
      },
      ...groupsData
    ];
  }, [incidents, startDate, endDate]);

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Histórico por Grupo</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        {monthlyData.map(({ name, data, total }) => {
          const isGlobal = name === 'Brazil - Global Tickets';
          const isExpanded = isGlobal || name === selectedGroup;
          
          return (
            <div 
              key={name}
              className={`bg-[#1C2333] p-4 rounded-lg ${
                isGlobal ? 'border-2 border-indigo-500/50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white">
                    {name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {total} chamados no período selecionado
                  </p>
                </div>
                {!isGlobal && (
                  <button
                    onClick={() => toggleGroup(name)}
                    className="p-2 hover:bg-[#151B2B] rounded-lg transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                )}
              </div>

              <div className={`
                overflow-hidden transition-all duration-300
                ${isExpanded ? 'h-[400px]' : 'h-0'}
              `}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data}
                    margin={{ 
                      top: 20, 
                      right: 30, 
                      left: 20, 
                      bottom: 40
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                    <XAxis 
                      dataKey="monthLabel"
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      axisLine={{ stroke: '#374151' }}
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
                    {PRIORITIES.map(priority => (
                      <Bar
                        key={priority}
                        dataKey={priority}
                        name={priority}
                        fill={CHART_COLORS[priority]}
                        stackId="stack"
                        label={{
                          position: 'top',
                          content: ({ x, y, width, value, index }) => {
                            const isLastBar = priority === PRIORITIES[PRIORITIES.length - 1];
                            if (!isLastBar) return null;
                            
                            const total = data[index].total;
                            if (total === 0) return null;

                            return (
                              <text
                                x={x + width / 2}
                                y={y - 10}
                                fill="#9CA3AF"
                                textAnchor="middle"
                                fontSize={12}
                              >
                                {total}
                              </text>
                            );
                          }
                        }}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}