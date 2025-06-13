import React, { useState, useMemo } from 'react';
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
import { BarChart2, LineChart as LineChartIcon } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Incident } from '../types/incident';
import { normalizePriority } from '../utils/incidentUtils';

interface HistoricalIndicatorProps {
  incidents: Incident[];
  categories: string[];
}

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

function HistoricalIndicator({ incidents, categories }: HistoricalIndicatorProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'line'>('line');

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const monthlyData = useMemo(() => {
    // Get the last 12 months
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 11);
    
    const months = eachMonthOfInterval({ start, end });

    const categoriesToAnalyze = selectedCategories.length > 0
      ? selectedCategories
      : categories.slice(0, 5);

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

      const data: Record<string, number> = {
        month: month.getTime(),
        total: monthIncidents.length
      };

      // Add category counts
      categoriesToAnalyze.forEach(category => {
        data[category] = monthIncidents.filter(i => i.Category === category).length;
      });

      // Add priority counts
      ['P1', 'P2', 'P3', 'P4'].forEach(priority => {
        data[`${priority}_count`] = monthIncidents.filter(
          i => normalizePriority(i.Priority) === priority
        ).length;
      });

      return data;
    });
  }, [incidents, selectedCategories, categories]);

  const renderChart = () => {
    const categoriesToShow = selectedCategories.length > 0
      ? selectedCategories
      : categories.slice(0, 5);

    if (chartType === 'line') {
      return (
        <LineChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="month" 
            tickFormatter={(timestamp) => format(timestamp, 'MMM/yy', { locale: ptBR })}
            tick={{ fill: '#9CA3AF' }}
          />
          <YAxis tick={{ fill: '#9CA3AF' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#fff'
            }}
            labelFormatter={(timestamp) => format(timestamp, "MMMM 'de' yyyy", { locale: ptBR })}
          />
          <Legend />
          {categoriesToShow.map((category, index) => (
            <Line
              key={category}
              type="monotone"
              dataKey={category}
              name={category}
              stroke={`hsl(${index * (360 / categoriesToShow.length)}, 70%, 60%)`}
              strokeWidth={2}
              dot={false}
            />
          ))}
          <Line
            type="monotone"
            dataKey="P1_count"
            name="P1"
            stroke={CHART_COLORS.P1}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="P2_count"
            name="P2"
            stroke={CHART_COLORS.P2}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      );
    }

    return (
      <BarChart data={monthlyData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="month" 
          tickFormatter={(timestamp) => format(timestamp, 'MMM/yy', { locale: ptBR })}
          tick={{ fill: '#9CA3AF' }}
        />
        <YAxis tick={{ fill: '#9CA3AF' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: 'none',
            borderRadius: '8px',
            color: '#fff'
          }}
          labelFormatter={(timestamp) => format(timestamp, "MMMM 'de' yyyy", { locale: ptBR })}
        />
        <Legend />
        {categoriesToShow.map((category, index) => (
          <Bar
            key={category}
            dataKey={category}
            name={category}
            fill={`hsl(${index * (360 / categoriesToShow.length)}, 70%, 60%)`}
            stackId="categories"
          />
        ))}
      </BarChart>
    );
  };

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Histórico de Chamados</h2>
        <div className="flex bg-[#1C2333] rounded-lg p-1">
          <button
            onClick={() => setChartType('bar')}
            className={`p-2 rounded-lg transition-colors ${
              chartType === 'bar' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
            title="Gráfico de Barras"
          >
            <BarChart2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`p-2 rounded-lg transition-colors ${
              chartType === 'line' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
            title="Gráfico de Linha"
          >
            <LineChartIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => toggleCategory(category)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategories.includes(category)
                ? 'bg-indigo-600 text-white'
                : 'bg-[#0B1120] text-gray-400 hover:bg-indigo-600/20'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['P1', 'P2', 'P3', 'P4'].map(priority => {
          const totalIncidents = monthlyData.reduce((sum, month) => sum + month[`${priority}_count`], 0);
          const monthlyAverage = totalIncidents / monthlyData.length;
          
          return (
            <div 
              key={priority}
              className="bg-[#1C2333] p-4 rounded-lg"
              style={{ borderLeft: `4px solid ${CHART_COLORS[priority as keyof typeof CHART_COLORS]}` }}
            >
              <h4 className="text-sm text-gray-400">Média Mensal {priority}</h4>
              <p className="text-2xl font-bold mt-1" style={{ color: CHART_COLORS[priority as keyof typeof CHART_COLORS] }}>
                {monthlyAverage.toFixed(1)}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Total: {totalIncidents}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HistoricalIndicator;

export { HistoricalIndicator }