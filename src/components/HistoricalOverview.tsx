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
import { X, BarChart2, ChevronDown, ChevronRight } from 'lucide-react';
import { Incident } from '../types/incident';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizePriority } from '../utils/incidentUtils';

interface HistoricalOverviewProps {
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

const GROUPS = [
  'Brazil-Santo Andre-Local Support',
  'Brazil-Bandag-Local Support',
  'Brazil-Mafra-Local Support',
  'Brazil-Bahia-Local Support',
  'Brazil-Local Support',
  'Brazil-Bahia-Manufacturing-Local Support',
  'Brazil-Santo Andre-Manufacturing-Local Support',
  'Brazil-Bandag-Manufacturing-Local Support',
  'Brazil-Bahia-Network/Telecom',
  'Brazil-Santo Andre-Network/Telecom',
  'Brazil-Bandag-Network/Telecom',
  'Brazil-Ticket Manager',
  'Brazil-Telephony'
];

export function HistoricalOverview({ incidents, onClose }: HistoricalOverviewProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const monthlyData = useMemo(() => {
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
          return incidentDate >= monthStart && incidentDate <= monthEnd;
        } catch (error) {
          return false;
        }
      });

      const data: Record<string, any> = {
        month: month.getTime(),
        monthLabel: format(month, 'MMM/yy', { locale: ptBR }),
        total: monthIncidents.length
      };

      // Add priority counts
      PRIORITIES.forEach(priority => {
        data[priority] = monthIncidents.filter(i => 
          normalizePriority(i.Priority) === priority
        ).length;
      });

      return data;
    });
  }, [incidents]);

  const groupData = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 11);
    const months = eachMonthOfInterval({ start, end });

    return GROUPS.map(group => {
      const monthlyStats = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthIncidents = incidents.filter(incident => {
          try {
            const incidentDate = parseISO(incident.Opened);
            return incident.AssignmentGroup?.includes(group) &&
                   incidentDate >= monthStart && 
                   incidentDate <= monthEnd;
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
  }, [incidents]);

  const totalIncidents = incidents.length;
  const averageMonthly = Math.round(totalIncidents / monthlyData.length);
  const peakMonthly = Math.max(...monthlyData.map(month => month.total));

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
    <div className="space-y-6">
      {/* Global Overview */}
      <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Brazil - Global Tickets</h2>
            <p className="text-gray-400 mt-1">Últimos 12 meses</p>
          </div>
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-indigo-400" />
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

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={monthlyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#374151" 
                opacity={0.5}
              />
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
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1C2333] p-4 rounded-lg">
            <p className="text-sm text-gray-400">Total de Chamados</p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalIncidents}
            </p>
          </div>
          <div className="bg-[#1C2333] p-4 rounded-lg">
            <p className="text-sm text-gray-400">Média Mensal</p>
            <p className="text-2xl font-bold text-white mt-1">
              {averageMonthly}
            </p>
          </div>
          <div className="bg-[#1C2333] p-4 rounded-lg">
            <p className="text-sm text-gray-400">Pico Mensal</p>
            <p className="text-2xl font-bold text-white mt-1">
              {peakMonthly}
            </p>
          </div>
        </div>
      </div>

      {/* Group Overviews */}
      {groupData.map(group => (
        <div key={group.name} className="bg-[#151B2B] p-6 rounded-lg">
          <button
            onClick={() => toggleGroup(group.name)}
            className="w-full flex items-center justify-between"
          >
            <div>
              <h2 className="text-xl font-semibold text-white">{group.name}</h2>
              <p className="text-gray-400 mt-1">{group.total} chamados nos últimos 12 meses</p>
            </div>
            {expandedGroups.includes(group.name) ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {expandedGroups.includes(group.name) && (
            <>
              <div className="h-[400px] mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={group.data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="#374151" 
                      opacity={0.5}
                    />
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
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-5 gap-4 mt-6">
                {PRIORITIES.map(priority => (
                  <div key={priority} className="bg-[#1C2333] p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Prioridade {priority}</p>
                    <p 
                      className="text-2xl font-bold mt-1"
                      style={{ color: CHART_COLORS[priority] }}
                    >
                      {group[priority]}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}