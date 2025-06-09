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

interface MonthlyIncidentsChartProps {
  incidents: Incident[];
  startDate?: string;
  endDate?: string;
  onBarClick?: (monthIncidents: Incident[]) => void;
}

export function MonthlyIncidentsChart({ 
  incidents, 
  startDate, 
  endDate,
  onBarClick 
}: MonthlyIncidentsChartProps) {
  const monthlyData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const dateRange = {
      start: startDate ? parseISO(startDate) : new Date(`${year}-01-01T00:00:00`),
      end: endDate ? parseISO(endDate) : new Date(`${year}-12-31T23:59:59`)
    };

    const months = eachMonthOfInterval(dateRange);

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthIncidents = incidents.filter(incident => {
        try {
          const opened = parseISO(incident.Opened);
          return opened >= monthStart && opened <= monthEnd;
        } catch {
          return false;
        }
      });

      return {
        month: format(month, 'MMM', { locale: ptBR }),
        total: monthIncidents.length,
        monthFull: format(month, 'MMMM/yy', { locale: ptBR }),
        incidents: monthIncidents
      };
    });
  }, [incidents, startDate, endDate]);

  const handleBarClick = (data: any) => {
    if (onBarClick && data.incidents) {
      onBarClick(data.incidents);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1F2937] p-2 rounded-lg shadow-lg border border-gray-700">
          <p className="text-white text-sm font-medium capitalize">{payload[0].payload.monthFull}</p>
          <p className="text-gray-300 text-sm">
            <span className="text-indigo-400">Total:</span> {payload[0].value} chamados
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[40px] w-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={monthlyData}
          margin={{ top: 0, right: 5, left: 5, bottom: 0 }}
          barSize={12}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
          />
          <Bar
            dataKey="total"
            fill="#4F46E5"
            radius={[2, 2, 0, 0]}
            onClick={handleBarClick}
            cursor="pointer"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 