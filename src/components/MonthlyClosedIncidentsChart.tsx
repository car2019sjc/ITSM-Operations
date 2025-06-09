import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Incident } from '../types/incident';
import { parseISO, format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getIncidentState } from '../utils/incidentUtils';

interface MonthlyClosedIncidentsChartProps {
  incidents: Incident[];
  startDate?: string;
  endDate?: string;
}

export function MonthlyClosedIncidentsChart({ incidents, startDate, endDate }: MonthlyClosedIncidentsChartProps) {
  const monthlyData = useMemo(() => {
    const dateRange = {
      start: startDate ? parseISO(startDate) : new Date(0),
      end: endDate ? parseISO(endDate) : new Date()
    };

    const months = eachMonthOfInterval(dateRange);

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthIncidents = incidents.filter(incident => {
        const opened = parseISO(incident.Opened);
        return opened >= monthStart && opened <= monthEnd;
      });

      const closedIncidents = monthIncidents.filter(incident => 
        getIncidentState(incident.State) === 'Fechado'
      );

      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        total: monthIncidents.length,
        closed: closedIncidents.length,
        percentage: monthIncidents.length > 0
          ? (closedIncidents.length / monthIncidents.length) * 100
          : 0
      };
    });
  }, [incidents, startDate, endDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1F2937] p-4 rounded-lg shadow-lg border border-gray-700">
          <p className="text-white font-medium mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-gray-300">
              <span className="text-green-400">Fechados:</span> {payload[0].value}
            </p>
            <p className="text-gray-300">
              <span className="text-gray-400">Total:</span> {payload[0].payload.total}
            </p>
            <p className="text-gray-300">
              <span className="text-blue-400">Taxa de Conclusão:</span> {payload[0].payload.percentage.toFixed(1)}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#1C2333] p-4 rounded-lg">
      <h3 className="text-lg font-medium text-white mb-4">Evolução Mensal - Chamados Fechados</h3>
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
              domain={[0, 'dataMax + 5']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="closed"
              name="Fechados"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 