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
  isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizePriority } from '../utils/incidentUtils';

interface CategoryHistoryTop5Props {
  incidents: Incident[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
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

export function CategoryHistoryTop5({ incidents, onClose, startDate, endDate }: CategoryHistoryTop5Props) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Get top 5 categories based on incident count
  const topCategories = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    
    incidents.forEach(incident => {
      if (!startDate || !endDate) return;
      
      try {
        const incidentDate = parseISO(incident.Opened);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        
        if (isWithinInterval(incidentDate, { start, end })) {
          const category = incident.Category || 'Não categorizado';
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        }
      } catch (error) {
        // Skip invalid dates
      }
    });
    
    return Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
  }, [incidents, startDate, endDate]);

  const monthlyData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const months = eachMonthOfInterval({ start, end });

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

      const data: Record<string, any> = {
        month: month.getTime(),
        monthLabel: format(month, 'MMM/yy', { locale: ptBR }),
        total: monthIncidents.length
      };

      // Count incidents for top 5 categories
      topCategories.forEach(category => {
        const categoryIncidents = monthIncidents.filter(incident => 
          (incident.Category || 'Não categorizado') === category
        );
        
        data[category] = categoryIncidents.length;
        
        // Count by priority for each category
        PRIORITIES.forEach(priority => {
          data[`${category}_${priority}`] = categoryIncidents.filter(i => 
            normalizePriority(i.Priority) === priority
          ).length;
        });
      });

      return data;
    });
  }, [incidents, startDate, endDate, topCategories]);

  return (
    <>
      <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Histórico por Categoria (Top 5)</h2>
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
          {topCategories.map(category => {
            const isExpanded = expandedCategories.includes(category);
            
            return (
              <div 
                key={category}
                className="bg-[#1C2333] p-4 rounded-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      {category}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {monthlyData.reduce((sum, month) => sum + (month[category] || 0), 0)} chamados no período selecionado
                    </p>
                  </div>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="p-2 hover:bg-[#151B2B] rounded-lg transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>

                <div className={`
                  overflow-hidden transition-all duration-300
                  ${isExpanded ? 'h-[400px]' : 'h-0'}
                `}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={monthlyData}
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
                          key={`${category}_${priority}`}
                          dataKey={`${category}_${priority}`}
                          name={priority}
                          fill={CHART_COLORS[priority]}
                          stackId="stack"
                          label={{
                            position: 'top',
                            content: ({ x, y, width, value, index }) => {
                              const isLastBar = priority === PRIORITIES[PRIORITIES.length - 1];
                              if (!isLastBar) return null;
                              
                              const total = monthlyData[index][category];
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
      {/* Rodapé de referência do componente */}
      <div className="fixed bottom-2 left-2 text-xs text-gray-400 z-50 select-none pointer-events-none">
        CD02
      </div>
    </>
  );
}