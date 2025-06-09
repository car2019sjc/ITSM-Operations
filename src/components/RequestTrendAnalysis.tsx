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
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  X, 
  TrendingUp, 
  Calendar
} from 'lucide-react';
import { Request, normalizeRequestPriority, normalizeRequestStatus } from '../types/request';
import { parseISO, isWithinInterval, format, startOfMonth, endOfMonth, eachMonthOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RequestTrendAnalysisProps {
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

export function RequestTrendAnalysis({ requests, onClose, startDate, endDate }: RequestTrendAnalysisProps) {
  // Monthly trend data
  const monthlyData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const months = eachMonthOfInterval({ start, end });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthRequests = requests.filter(request => {
        try {
          const requestDate = parseISO(request.Opened);
          return isWithinInterval(requestDate, { start: monthStart, end: monthEnd });
        } catch (error) {
          return false;
        }
      });

      const data: Record<string, any> = {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        total: monthRequests.length
      };

      // Count by priority
      ['HIGH', 'MEDIUM', 'LOW'].forEach(priority => {
        data[priority] = monthRequests.filter(r => 
          normalizeRequestPriority(r.Priority) === priority
        ).length;
      });

      // Count by status
      ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].forEach(status => {
        data[`${status}_count`] = monthRequests.filter(r => 
          normalizeRequestStatus(r.State) === status
        ).length;
      });

      // Calculate completion rate
      data.completionRate = monthRequests.length > 0 
        ? (data.COMPLETED_count / monthRequests.length) * 100 
        : 0;

      return data;
    });
  }, [requests, startDate, endDate]);

  // Weekly trend data
  const weeklyData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }); // Start on Monday

    return weeks.map(week => {
      const weekStart = startOfWeek(week, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(week, { weekStartsOn: 1 });

      const weekRequests = requests.filter(request => {
        try {
          const requestDate = parseISO(request.Opened);
          return isWithinInterval(requestDate, { start: weekStart, end: weekEnd });
        } catch (error) {
          return false;
        }
      });

      return {
        week: `${format(weekStart, 'dd/MM', { locale: ptBR })} - ${format(weekEnd, 'dd/MM', { locale: ptBR })}`,
        total: weekRequests.length,
        HIGH: weekRequests.filter(r => normalizeRequestPriority(r.Priority) === 'HIGH').length,
        MEDIUM: weekRequests.filter(r => normalizeRequestPriority(r.Priority) === 'MEDIUM').length,
        LOW: weekRequests.filter(r => normalizeRequestPriority(r.Priority) === 'LOW').length,
        NEW: weekRequests.filter(r => normalizeRequestStatus(r.State) === 'NEW').length,
        IN_PROGRESS: weekRequests.filter(r => normalizeRequestStatus(r.State) === 'IN_PROGRESS').length,
        COMPLETED: weekRequests.filter(r => normalizeRequestStatus(r.State) === 'COMPLETED').length,
        CANCELLED: weekRequests.filter(r => normalizeRequestStatus(r.State) === 'CANCELLED').length
      };
    });
  }, [requests, startDate, endDate]);

  // Category trend data
  const categoryTrends = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const months = eachMonthOfInterval({ start, end });

    // Get top 5 categories
    const categoryCount = requests.reduce((acc, request) => {
      const category = request.RequestItem || 'Não categorizado';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    // Calculate monthly data for each category
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthLabel = format(month, 'MMM/yy', { locale: ptBR });

      const data: Record<string, any> = {
        month: monthLabel
      };

      topCategories.forEach(category => {
        const count = requests.filter(request => {
          try {
            const requestDate = parseISO(request.Opened);
            return (request.RequestItem === category) && 
                   isWithinInterval(requestDate, { start: monthStart, end: monthEnd });
          } catch (error) {
            return false;
          }
        }).length;

        data[category] = count;
      });

      return data;
    });
  }, [requests, startDate, endDate]);

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
              <span className="text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Análise de Tendências</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-medium text-white">Tendência Mensal por Prioridade</h3>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyData}
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
              <YAxis tick={{ fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="HIGH"
                name="Alta"
                stackId="1"
                stroke={CHART_COLORS.HIGH}
                fill={CHART_COLORS.HIGH}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="MEDIUM"
                name="Média"
                stackId="1"
                stroke={CHART_COLORS.MEDIUM}
                fill={CHART_COLORS.MEDIUM}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="LOW"
                name="Baixa"
                stackId="1"
                stroke={CHART_COLORS.LOW}
                fill={CHART_COLORS.LOW}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Trend */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-medium text-white">Tendência Mensal por Status</h3>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyData}
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
              <YAxis tick={{ fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="NEW_count"
                name="Novos"
                stroke={CHART_COLORS.NEW}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="IN_PROGRESS_count"
                name="Em Andamento"
                stroke={CHART_COLORS.IN_PROGRESS}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="COMPLETED_count"
                name="Concluídos"
                stroke={CHART_COLORS.COMPLETED}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="CANCELLED_count"
                name="Cancelados"
                stroke={CHART_COLORS.CANCELLED}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Completion Rate Trend */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-400" />
          <h3 className="text-lg font-medium text-white">Taxa de Conclusão Mensal</h3>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
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
                tick={{ fill: '#9CA3AF' }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value: any) => [`${value.toFixed(1)}%`, 'Taxa de Conclusão']}
              />
              <Legend />
              <Bar
                dataKey="completionRate"
                name="Taxa de Conclusão"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Trends */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-medium text-white">Tendência por Categoria</h3>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={categoryTrends}
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
              <YAxis tick={{ fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {categoryTrends.length > 0 && Object.keys(categoryTrends[0])
                .filter(key => key !== 'month')
                .map((category, index) => (
                  <Line
                    key={category}
                    type="monotone"
                    dataKey={category}
                    name={category}
                    stroke={`hsl(${index * 60}, 70%, 60%)`}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-medium text-white">Tendência Semanal</h3>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weeklyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="week"
                tick={{ fill: '#9CA3AF' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="HIGH"
                name="Alta"
                stackId="priority"
                fill={CHART_COLORS.HIGH}
              />
              <Bar
                dataKey="MEDIUM"
                name="Média"
                stackId="priority"
                fill={CHART_COLORS.MEDIUM}
              />
              <Bar
                dataKey="LOW"
                name="Baixa"
                stackId="priority"
                fill={CHART_COLORS.LOW}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}