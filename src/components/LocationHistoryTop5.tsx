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
  MapPin,
  ChevronDown,
  ChevronRight
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
import { normalizeLocationName } from '../utils/locationUtils';

interface LocationHistoryTop5Props {
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

export function LocationHistoryTop5({ incidents, onClose, startDate, endDate }: LocationHistoryTop5Props) {
  const [expandedLocations, setExpandedLocations] = useState<string[]>([]);

  const toggleLocation = (location: string) => {
    setExpandedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  // Get top 5 locations based on incident count using AssignmentGroup field
  const topLocations = useMemo(() => {
    const locationCount: Record<string, number> = {};
    
    incidents.forEach(incident => {
      if (!startDate || !endDate) return;
      
      try {
        const incidentDate = parseISO(incident.Opened);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        
        if (isWithinInterval(incidentDate, { start, end })) {
          // Use normalized AssignmentGroup
          const location = normalizeLocationName(incident.AssignmentGroup) || 'Não especificado';
          locationCount[location] = (locationCount[location] || 0) + 1;
        }
      } catch (error) {
        // Skip invalid dates
      }
    });
    
    return Object.entries(locationCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location]) => location);
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

      // Count incidents for top 5 locations
      topLocations.forEach(location => {
        // Use normalized AssignmentGroup
        const locationIncidents = monthIncidents.filter(incident => 
          normalizeLocationName(incident.AssignmentGroup) === location
        );
        
        data[location] = locationIncidents.length;
        
        // Count by priority for each location
        PRIORITIES.forEach(priority => {
          data[`${location}_${priority}`] = locationIncidents.filter(i => 
            normalizePriority(i.Priority) === priority
          ).length;
        });
      });

      return data;
    });
  }, [incidents, startDate, endDate, topLocations]);

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Top 5 Localidades (por Grupo de Atribuição)</h2>
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
        {topLocations.map(location => {
          const isExpanded = expandedLocations.includes(location);
          
          return (
            <div 
              key={location}
              className="bg-[#1C2333] p-4 rounded-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      {location}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {monthlyData.reduce((sum, month) => sum + (month[location] || 0), 0)} chamados no período selecionado
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleLocation(location)}
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
                        key={`${location}_${priority}`}
                        dataKey={`${location}_${priority}`}
                        name={priority}
                        fill={CHART_COLORS[priority]}
                        stackId="stack"
                        label={{
                          position: 'top',
                          content: ({ x, y, width, value, index }) => {
                            const isLastBar = priority === PRIORITIES[PRIORITIES.length - 1];
                            if (!isLastBar) return null;
                            
                            const total = monthlyData[index][location];
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
  );
}