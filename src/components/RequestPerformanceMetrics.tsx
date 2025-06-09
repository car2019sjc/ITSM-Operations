import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  X, 
  TrendingUp, 
  Users, 
  Clock
} from 'lucide-react';
import { Request, normalizeRequestPriority, normalizeRequestStatus } from '../types/request';
import { parseISO, isWithinInterval, format, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RequestPerformanceMetricsProps {
  requests: Request[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

const CHART_COLORS = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#10B981',
  NEW: '#3B82F6',
  IN_PROGRESS: '#6366F1',
  COMPLETED: '#10B981',
  CANCELLED: '#6B7280'
};

export function RequestPerformanceMetrics({ requests, onClose, startDate, endDate }: RequestPerformanceMetricsProps) {
  // Filter requests by date range
  const filteredRequests = useMemo(() => {
    if (!startDate || !endDate) return requests;
    
    return requests.filter(request => {
      try {
        const requestDate = parseISO(request.Opened);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        return isWithinInterval(requestDate, { start, end });
      } catch (error) {
        return false;
      }
    });
  }, [requests, startDate, endDate]);

  // Calculate resolution time by group
  const resolutionByGroup = useMemo(() => {
    const groups = filteredRequests.reduce((acc, request) => {
      const group = request.AssignmentGroup || 'Não atribuído';
      const status = normalizeRequestStatus(request.State);
      
      if (!acc[group]) {
        acc[group] = {
          name: group,
          totalRequests: 0,
          completedRequests: 0,
          totalResolutionDays: 0,
          avgResolutionDays: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0
        };
      }
      
      acc[group].totalRequests++;
      
      const priority = normalizeRequestPriority(request.Priority);
      acc[group][priority]++;
      
      if (status === 'COMPLETED' && request.Updated) {
        try {
          const opened = parseISO(request.Opened);
          const closed = parseISO(request.Updated);
          const days = differenceInDays(closed, opened);
          
          acc[group].completedRequests++;
          acc[group].totalResolutionDays += days;
        } catch (error) {
          // Skip invalid dates
        }
      }
      
      return acc;
    }, {} as Record<string, {
      name: string;
      totalRequests: number;
      completedRequests: number;
      totalResolutionDays: number;
      avgResolutionDays: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    }>);
    
    // Calculate average resolution time
    Object.values(groups).forEach(group => {
      group.avgResolutionDays = group.completedRequests > 0 
        ? group.totalResolutionDays / group.completedRequests 
        : 0;
    });
    
    return Object.values(groups)
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 10);
  }, [filteredRequests]);

  // Calculate monthly performance
  const monthlyPerformance = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const months = eachMonthOfInterval({ start, end });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthRequests = filteredRequests.filter(request => {
        try {
          const requestDate = parseISO(request.Opened);
          return isWithinInterval(requestDate, { start: monthStart, end: monthEnd });
        } catch (error) {
          return false;
        }
      });

      const completedRequests = monthRequests.filter(r => 
        normalizeRequestStatus(r.State) === 'COMPLETED'
      );

      let totalResolutionDays = 0;
      let validCompletions = 0;

      completedRequests.forEach(request => {
        if (request.Updated) {
          try {
            const opened = parseISO(request.Opened);
            const closed = parseISO(request.Updated);
            const days = differenceInDays(closed, opened);
            
            totalResolutionDays += days;
            validCompletions++;
          } catch (error) {
            // Skip invalid dates
          }
        }
      });

      const avgResolutionDays = validCompletions > 0 
        ? totalResolutionDays / validCompletions 
        : 0;

      const completionRate = monthRequests.length > 0 
        ? (completedRequests.length / monthRequests.length) * 100 
        : 0;

      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        totalRequests: monthRequests.length,
        completedRequests: completedRequests.length,
        avgResolutionDays,
        completionRate
      };
    });
  }, [filteredRequests, startDate, endDate]);

  // Calculate analyst performance
  const analystPerformance = useMemo(() => {
    const analysts = filteredRequests.reduce((acc, request) => {
      const analyst = request.AssignedTo || 'Não atribuído';
      const status = normalizeRequestStatus(request.State);
      
      if (!acc[analyst]) {
        acc[analyst] = {
          name: analyst,
          totalRequests: 0,
          completedRequests: 0,
          totalResolutionDays: 0,
          avgResolutionDays: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0
        };
      }
      
      acc[analyst].totalRequests++;
      
      const priority = normalizeRequestPriority(request.Priority);
      acc[analyst][priority]++;
      
      if (status === 'COMPLETED' && request.Updated) {
        try {
          const opened = parseISO(request.Opened);
          const closed = parseISO(request.Updated);
          const days = differenceInDays(closed, opened);
          
          acc[analyst].completedRequests++;
          acc[analyst].totalResolutionDays += days;
        } catch (error) {
          // Skip invalid dates
        }
      }
      
      return acc;
    }, {} as Record<string, {
      name: string;
      totalRequests: number;
      completedRequests: number;
      totalResolutionDays: number;
      avgResolutionDays: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    }>);
    
    // Calculate average resolution time
    Object.values(analysts).forEach(analyst => {
      analyst.avgResolutionDays = analyst.completedRequests > 0 
        ? analyst.totalResolutionDays / analyst.completedRequests 
        : 0;
    });
    
    return Object.values(analysts)
      .filter(a => a.totalRequests >= 5) // Only include analysts with at least 5 requests
      .sort((a, b) => a.avgResolutionDays - b.avgResolutionDays) // Sort by fastest resolution time
      .slice(0, 10);
  }, [filteredRequests]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-[#1F2937] p-4 rounded-lg border border-gray-700 shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="text-white">
                {entry.name.includes('dias') ? `${entry.value.toFixed(1)} dias` : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Métricas de Performance</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      {/* Monthly Performance Trends */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-medium text-white">Tendência de Performance Mensal</h3>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyPerformance}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#9CA3AF' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#9CA3AF' }}
                domain={[0, 'dataMax + 5']}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#9CA3AF' }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgResolutionDays"
                name="Tempo Médio (dias)"
                stroke="#3B82F6"
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="completionRate"
                name="Taxa de Conclusão (%)"
                stroke="#10B981"
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resolution Time by Group */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-medium text-white">Tempo de Resolução por Grupo</h3>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={resolutionByGroup}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tick={{ fill: '#9CA3AF' }} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fill: '#9CA3AF' }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="avgResolutionDays"
                name="Tempo Médio (dias)"
                fill="#3B82F6"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performing Analysts */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-medium text-white">Top 10 Analistas por Tempo de Resolução</h3>
        </div>
        <div className="space-y-4">
          {analystPerformance.map(analyst => (
            <div
              key={analyst.name}
              className="bg-[#151B2B] p-4 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-400" />
                  <h4 className="text-white font-medium">{analyst.name}</h4>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{analyst.avgResolutionDays.toFixed(1)} dias</p>
                  <p className="text-sm text-gray-400">tempo médio</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Solicitações</p>
                  <div className="flex items-center justify-between">
                    <p className="text-white">{analyst.totalRequests} total</p>
                    <p className="text-green-400">{analyst.completedRequests} concluídas</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Por Prioridade</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                      {analyst.HIGH} alta
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                      {analyst.MEDIUM} média
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                      {analyst.LOW} baixa
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}