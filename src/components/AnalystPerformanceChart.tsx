import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Incident } from '../types/incident';
import { parseISO, format, differenceInHours, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnalystPerformanceChartProps {
  incidents: Incident[];
  analyst: string;
  startDate?: string;
  endDate?: string;
}

interface MonthlyPerformance {
  month: string;
  avgResolutionTime: number;
  completionRate: number;
  totalIncidents: number;
  completedIncidents: number;
}

export function AnalystPerformanceChart({ incidents, analyst, startDate, endDate }: AnalystPerformanceChartProps) {
  const monthlyData = useMemo(() => {
    const analystIncidents = incidents.filter(incident => 
      incident.AssignedTo === analyst
    );

    const dateRange = {
      start: startDate ? parseISO(startDate) : new Date(0),
      end: endDate ? parseISO(endDate) : new Date()
    };

    const months = eachMonthOfInterval(dateRange);

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthIncidents = analystIncidents.filter(incident => {
        const opened = parseISO(incident.Opened);
        return opened >= monthStart && opened <= monthEnd;
      });

      const completedIncidents = monthIncidents.filter(incident => 
        incident.State === 'Fechado' && incident.Updated
      );

      const totalResolutionTime = completedIncidents.reduce((sum, incident) => {
        const opened = parseISO(incident.Opened);
        const closed = parseISO(incident.Updated);
        return sum + differenceInHours(closed, opened);
      }, 0);

      const avgResolutionTime = completedIncidents.length > 0
        ? totalResolutionTime / completedIncidents.length
        : 0;

      const completionRate = monthIncidents.length > 0
        ? (completedIncidents.length / monthIncidents.length) * 100
        : 0;

      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        avgResolutionTime: Number(avgResolutionTime.toFixed(1)),
        completionRate: Number(completionRate.toFixed(1)),
        totalIncidents: monthIncidents.length,
        completedIncidents: completedIncidents.length
      };
    });
  }, [incidents, analyst, startDate, endDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1F2937] p-4 rounded-lg shadow-lg border border-gray-700">
          <p className="text-white font-medium mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-gray-300">
              <span className="text-blue-400">Tempo Médio:</span> {payload[0].value} horas
            </p>
            <p className="text-gray-300">
              <span className="text-green-400">Taxa de Conclusão:</span> {payload[1].value}%
            </p>
            <p className="text-gray-300">
              <span className="text-gray-400">Total de Chamados:</span> {payload[2].payload.totalIncidents}
            </p>
            <p className="text-gray-300">
              <span className="text-green-400">Concluídos:</span> {payload[2].payload.completedIncidents}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#1C2333] p-4 rounded-lg">
      <h3 className="text-lg font-medium text-white mb-4">Performance Mensal - {analyst}</h3>
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
              dataKey="avgResolutionTime"
              name="Tempo Médio (horas)"
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
  );
} 