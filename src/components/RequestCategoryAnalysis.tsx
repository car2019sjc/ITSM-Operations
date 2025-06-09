import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  X, 
  FileText,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Request, REQUEST_PRIORITIES, normalizeRequestPriority } from '../types/request';
import { parseISO, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RequestCategoryAnalysisProps {
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

export function RequestCategoryAnalysis({ requests, onClose, startDate, endDate }: RequestCategoryAnalysisProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const categoryData = useMemo(() => {
    const filteredRequests = requests.filter(request => {
      if (!startDate || !endDate) return true;
      
      try {
        const requestDate = parseISO(request.Opened);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        return isWithinInterval(requestDate, { start, end });
      } catch (error) {
        return false;
      }
    });

    const data = filteredRequests.reduce((acc, request) => {
      const category = request.RequestItem || 'Não categorizado';
      const priority = normalizeRequestPriority(request.Priority);
      
      if (!acc[category]) {
        acc[category] = {
          name: category,
          total: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
          requesters: new Set<string>()
        };
      }

      acc[category].total++;
      acc[category][priority]++;

      if (request.RequestedForName) {
        acc[category].requesters.add(request.RequestedForName);
      }

      return acc;
    }, {} as Record<string, {
      name: string;
      total: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
      requesters: Set<string>;
    }>);

    return Object.values(data)
      .sort((a, b) => b.total - a.total);
  }, [requests, startDate, endDate]);

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
        <h2 className="text-xl font-semibold text-white">Análise por Categoria</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      <div className="bg-[#1C2333] p-4 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Distribuição por Categoria</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tick={{ fill: '#9CA3AF' }} />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fill: '#9CA3AF' }} 
                width={90}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
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

      <div className="space-y-4">
        {categoryData.map(category => (
          <div 
            key={category.name}
            className="bg-[#1C2333] p-4 rounded-lg"
          >
            <button
              onClick={() => toggleCategory(category.name)}
              className="w-full flex items-center justify-between"
            >
              <div>
                <h4 className="text-lg font-medium text-white">{category.name}</h4>
                <p className="text-sm text-gray-400">
                  {category.total} requests • {category.requesters.size} solicitantes
                </p>
              </div>
              {expandedCategories.includes(category.name) ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedCategories.includes(category.name) && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {(['HIGH', 'MEDIUM', 'LOW'] as const).map(priority => (
                    <div 
                      key={priority}
                      className="bg-[#151B2B] p-4 rounded-lg"
                    >
                      <p className="text-sm" style={{ color: CHART_COLORS[priority] }}>
                        {REQUEST_PRIORITIES[priority]}
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {category[priority]}
                      </p>
                      <p className="text-sm text-gray-400">
                        {((category[priority] / category.total) * 100).toFixed(1)}%
                      </p>
                    </div>
                  ))}
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
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}