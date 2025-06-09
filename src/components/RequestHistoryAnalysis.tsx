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
  FileText,
  ChevronDown,
  ChevronRight,
  MousePointerClick
} from 'lucide-react';
import { Request, REQUEST_PRIORITIES, normalizeRequestPriority } from '../types/request';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval,
  isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RequestHistoryAnalysisProps {
  requests: Request[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

const CHART_COLORS = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#10B981'
};

export function RequestHistoryAnalysis({ 
  requests, 
  onClose, 
  startDate, 
  endDate
}: RequestHistoryAnalysisProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

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
        monthStart,
        monthEnd,
        total: monthRequests.length
      };

      // Count by priority
      Object.keys(REQUEST_PRIORITIES).forEach(priority => {
        data[priority] = monthRequests.filter(r => 
          normalizeRequestPriority(r.Priority) === priority
        ).length;
      });

      return data;
    });
  }, [requests, startDate, endDate]);

  const categoryData = useMemo(() => {
    if (!selectedMonth) return [];

    const selectedMonthData = monthlyData.find(m => m.month === selectedMonth);
    if (!selectedMonthData) return [];

    const monthRequests = requests.filter(request => {
      try {
        const requestDate = parseISO(request.Opened);
        return isWithinInterval(requestDate, {
          start: selectedMonthData.monthStart,
          end: selectedMonthData.monthEnd
        });
      } catch (error) {
        return false;
      }
    });

    const categories = monthRequests.reduce((acc, request) => {
      const category = request.RequestItem || 'Não categorizado';
      
      if (!acc[category]) {
        acc[category] = {
          name: category,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
          total: 0
        };
      }

      const priority = normalizeRequestPriority(request.Priority);
      acc[category][priority]++;
      acc[category].total++;

      return acc;
    }, {} as Record<string, {
      name: string;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
      total: number;
    }>);

    return Object.values(categories)
      .sort((a, b) => b.total - a.total);
  }, [requests, selectedMonth, monthlyData]);

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
        <h2 className="text-xl font-semibold text-white">Histórico de Requests</h2>
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
        <div className="bg-[#1C2333] p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Distribuição Mensal</h3>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg">
              <MousePointerClick className="h-4 w-4" />
              <span className="text-sm">Clique para ver detalhes do mês</span>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                onClick={(data) => data && setSelectedMonth(data.activeLabel)}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis 
                  dataKey="month"
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
                <Bar 
                  dataKey="HIGH" 
                  name="Alta" 
                  fill={CHART_COLORS.HIGH} 
                  stackId="stack"
                />
                <Bar 
                  dataKey="MEDIUM" 
                  name="Média" 
                  fill={CHART_COLORS.MEDIUM} 
                  stackId="stack"
                />
                <Bar 
                  dataKey="LOW" 
                  name="Baixa" 
                  fill={CHART_COLORS.LOW} 
                  stackId="stack"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {selectedMonth && (
          <div className="bg-[#1C2333] p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setSelectedMonth(null)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
                <span>Voltar para visão mensal</span>
              </button>
              <h3 className="text-lg font-medium text-white">
                Análise por Categoria - {selectedMonth}
              </h3>
            </div>
            <div className="space-y-4">
              {categoryData.map(category => (
                <div 
                  key={category.name}
                  className="bg-[#151B2B] p-4 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">{category.name}</h4>
                    <span className="text-gray-400">{category.total} requests</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    {(['HIGH', 'MEDIUM', 'LOW'] as const).map(priority => {
                      const width = (category[priority] / category.total) * 100;
                      return (
                        <div
                          key={priority}
                          className="h-full float-left"
                          style={{
                            width: `${width}%`,
                            backgroundColor: CHART_COLORS[priority]
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(['HIGH', 'MEDIUM', 'LOW'] as const).map(priority => (
                      <div key={priority} className="text-center">
                        <span className="text-sm" style={{ color: CHART_COLORS[priority] }}>
                          {REQUEST_PRIORITIES[priority]}
                        </span>
                        <p className="text-white font-medium">{category[priority]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}