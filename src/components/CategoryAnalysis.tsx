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
  Cell,
  LineChart,
  Line,
  Sector
} from 'recharts';
import { X, BarChart2, PieChart as PieChartIcon, LineChart as LineChartIcon, AlertTriangle, Users, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Incident } from '../types/incident';
import { parseISO, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IncidentDetails } from './IncidentDetails';

type ChartType = 'bar' | 'pie' | 'line';

interface CategoryAnalysisProps {
  incidents: Incident[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

interface IncidentModalProps {
  incidents: Incident[];
  category: string;
  priority: string;
  onClose: () => void;
}

interface CallerGroup {
  caller: string;
  incidents: Incident[];
  count: number;
}

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#1D4ED8',
  P3: '#EAB308',
  P4: '#22C55E',
  'Não definido': '#6B7280'
};

function IncidentModal({ incidents, category, priority, onClose }: IncidentModalProps) {
  const [expandedCaller, setExpandedCaller] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const callerGroups = useMemo(() => {
    if (!['P3', 'P4'].includes(priority)) return null;

    const groups = incidents.reduce((acc, incident) => {
      const caller = incident.Caller || 'Não especificado';
      if (!acc[caller]) {
        acc[caller] = {
          caller,
          incidents: [],
          count: 0
        };
      }
      acc[caller].incidents.push(incident);
      acc[caller].count++;
      return acc;
    }, {} as Record<string, CallerGroup>);

    return Object.values(groups)
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }, [incidents, priority]);

  const showCallerGroups = ['P3', 'P4'].includes(priority);

  const getStatusColor = (state: string) => {
    const s = state?.toLowerCase() || '';
    if (s.includes('closed') || s.includes('resolved')) return 'bg-green-500/20 text-green-400';
    if (s.includes('progress') || s.includes('assigned')) return 'bg-blue-500/20 text-blue-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Chamados {priority} - {category}
            </h2>
            <p className="text-gray-400 mt-1">
              {showCallerGroups ? 
                `Top 30 usuários com mais chamados (${incidents.length} total)` :
                `${incidents.length} chamados encontrados`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        </div>
        
        <div className="overflow-auto max-h-[calc(90vh-120px)]">
          {showCallerGroups ? (
            <div className="divide-y divide-gray-700">
              {callerGroups?.map((group) => (
                <div key={group.caller} className="p-4">
                  <button
                    onClick={() => setExpandedCaller(
                      expandedCaller === group.caller ? null : group.caller
                    )}
                    className="w-full flex items-center justify-between hover:bg-[#1C2333] p-3 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-indigo-400" />
                      <span className="text-lg font-medium text-white">{group.caller}</span>
                      <span className="text-gray-400">({group.count} chamados)</span>
                    </div>
                    {expandedCaller === group.caller ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedCaller === group.caller && (
                    <div className="mt-4 bg-[#1C2333] rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-[#151B2B]">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Número</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Data</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Descrição</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Estado</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-400"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {group.incidents.map((incident) => (
                            <tr 
                              key={incident.Number} 
                              className="hover:bg-[#151B2B] transition-colors"
                            >
                              <td className="px-4 py-2 text-sm text-white">{incident.Number}</td>
                              <td className="px-4 py-2 text-sm text-gray-300">{formatDate(incident.Opened)}</td>
                              <td className="px-4 py-2 text-sm text-gray-300">{incident.ShortDescription}</td>
                              <td className="px-4 py-2 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.State)}`}>
                                  {incident.State}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <button
                                  onClick={() => handleIncidentClick(incident)}
                                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#1C2333] sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Número</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Data</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Descrição</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Solicitante</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {incidents.map((incident) => (
                  <tr 
                    key={incident.Number} 
                    className="hover:bg-[#1C2333] transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-white">{incident.Number}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{formatDate(incident.Opened)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{incident.ShortDescription}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{incident.Caller}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.State)}`}>
                        {incident.State}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleIncidentClick(incident)}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedIncident && (
        <IncidentDetails
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
    name
  } = props;

  return (
    <g>
      <text x={cx} y={cy - 20} dy={8} textAnchor="middle" fill="#fff" className="text-lg">
        {name}
      </text>
      <text x={cx} y={cy + 10} dy={8} textAnchor="middle" fill="#fff">
        {value} chamados
      </text>
      <text x={cx} y={cy + 30} dy={8} textAnchor="middle" fill="#fff" className="text-sm">
        {`(${(percent * 100).toFixed(1)}%)`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
    </g>
  );
};

export function CategoryAnalysis({ incidents, onClose, startDate, endDate }: CategoryAnalysisProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIncidents, setSelectedIncidents] = useState<Incident[] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const normalizePriority = (priority: string): string => {
    if (!priority) return 'Não definido';
    
    const normalized = priority.toLowerCase().trim();
    
    if (['p1', '1', 'priority 1', 'critical', 'crítico'].includes(normalized) ||
        normalized.startsWith('p1') ||
        normalized.startsWith('1 -')) {
      return 'P1';
    }
    
    if (['p2', '2', 'priority 2', 'high', 'alta'].includes(normalized) ||
        normalized.startsWith('p2') ||
        normalized.startsWith('2 -')) {
      return 'P2';
    }
    
    if (['p3', '3', 'priority 3', 'medium', 'média'].includes(normalized) ||
        normalized.startsWith('p3') ||
        normalized.startsWith('3 -')) {
      return 'P3';
    }
    
    if (['p4', '4', 'priority 4', 'low', 'baixa'].includes(normalized) ||
        normalized.startsWith('p4') ||
        normalized.startsWith('4 -')) {
      return 'P4';
    }
    
    return 'Não definido';
  };

  const handlePriorityClick = (category: string, priority: string) => {
    const filteredIncidents = incidents.filter(incident => {
      const matchesCategory = incident.Category === category;
      const matchesPriority = normalizePriority(incident.Priority) === priority;
      
      if (!startDate || !endDate) return matchesCategory && matchesPriority;
      
      try {
        const incidentDate = parseISO(incident.Opened);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        return matchesCategory && matchesPriority && isWithinInterval(incidentDate, { start, end });
      } catch (error) {
        return false;
      }
    });

    setSelectedIncidents(filteredIncidents);
    setSelectedCategory(category);
    setSelectedPriority(priority);
  };

  const priorityByCategory = useMemo(() => {
    const filteredIncidents = incidents.filter(incident => {
      if (!startDate || !endDate) return true;
      
      try {
        const incidentDate = parseISO(incident.Opened);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        
        return isWithinInterval(incidentDate, { start, end });
      } catch (error) {
        console.warn('Invalid date:', error);
        return false;
      }
    });

    const data = filteredIncidents.reduce((acc, incident) => {
      const category = incident.Category || 'Não categorizado';
      const priority = normalizePriority(incident.Priority);
      
      if (!acc[category]) {
        acc[category] = { P1: 0, P2: 0, P3: 0, P4: 0, 'Não definido': 0 };
      }
      acc[category][priority]++;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    return Object.entries(data)
      .map(([category, priorities]) => ({
        category,
        ...priorities,
        total: Object.values(priorities).reduce((sum, count) => sum + count, 0)
      }))
      .sort((a, b) => b.total - a.total);
  }, [incidents, startDate, endDate]);

  const priorityTotals = useMemo(() => {
    return priorityByCategory.reduce((acc, category) => {
      Object.entries(category).forEach(([key, value]) => {
        if (key !== 'category' && key !== 'total') {
          acc[key] = (acc[key] || 0) + value;
        }
      });
      return acc;
    }, {} as Record<string, number>);
  }, [priorityByCategory]);

  const pieChartData = useMemo(() => {
    return Object.entries(priorityTotals)
      .filter(([key]) => key !== 'category' && key !== 'total')
      .map(([name, value]) => ({
        name,
        value
      }))
      .sort((a, b) => {
        const order = { P1: 1, P2: 2, P3: 3, P4: 4, 'Não definido': 5 };
        return (order[a.name as keyof typeof order] || 999) - (order[b.name as keyof typeof order] || 999);
      });
  }, [priorityTotals]);

  const totalIncidents = useMemo(() => {
    return Object.values(priorityTotals).reduce((sum, count) => sum + count, 0);
  }, [priorityTotals]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={pieChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                onMouseEnter={onPieEnter}
              >
                {pieChartData.map((entry) => (
                  <Cell 
                    key={entry.name}
                    fill={CHART_COLORS[entry.name as keyof typeof CHART_COLORS]} 
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0];
                  const color = CHART_COLORS[data.name as keyof typeof CHART_COLORS];
                  
                  return (
                    <div className="bg-[#1F2937] p-3 rounded-lg border-2" style={{ borderColor: color }}>
                      <p className="font-medium" style={{ color }}>
                        {data.name}
                      </p>
                      <p className="text-white">
                        {data.value} chamados
                      </p>
                      <p className="text-gray-400 text-sm">
                        {`(${(data.payload.percent * 100).toFixed(1)}% do total)`}
                      </p>
                    </div>
                  );
                }}
              />
              <Legend 
                formatter={(value) => (
                  <span style={{ color: CHART_COLORS[value as keyof typeof CHART_COLORS] }}>
                    {value}
                  </span>
                )}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={priorityByCategory}
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="category" tick={{ fill: '#9CA3AF' }} />
              <YAxis tick={{ fill: '#9CA3AF' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number) => [`${value} chamados`]}
              />
              <Legend />
              <Line type="monotone" dataKey="P1" stroke={CHART_COLORS.P1} />
              <Line type="monotone" dataKey="P2" stroke={CHART_COLORS.P2} />
              <Line type="monotone" dataKey="P3" stroke={CHART_COLORS.P3} />
              <Line type="monotone" dataKey="P4" stroke={CHART_COLORS.P4} />
              <Line type="monotone" dataKey="Não definido" stroke={CHART_COLORS['Não definido']} />
            </LineChart>
          </ResponsiveContainer>
        );

      default: // 'bar'
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={priorityByCategory}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tick={{ fill: '#9CA3AF' }} />
              <YAxis 
                dataKey="category" 
                type="category" 
                tick={{ fill: '#9CA3AF' }} 
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number, name: string) => [
                  `${value} chamados`,
                  name
                ]}
              />
              <Legend />
              <Bar dataKey="P1" fill={CHART_COLORS.P1} stackId="stack" radius={[0, 0, 0, 0]} />
              <Bar dataKey="P2" fill={CHART_COLORS.P2} stackId="stack" radius={[0, 0, 0, 0]} />
              <Bar dataKey="P3" fill={CHART_COLORS.P3} stackId="stack" radius={[0, 0, 0, 0]} />
              <Bar dataKey="P4" fill={CHART_COLORS.P4} stackId="stack" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Não definido" fill={CHART_COLORS['Não definido']} stackId="stack" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Análise por Categoria e Prioridade</h2>
          <p className="text-gray-400 mt-1">Total de {totalIncidents} chamados no período</p>
        </div>
        <div className="flex items-center gap-2">
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
              onClick={() => setChartType('pie')}
              className={`p-2 rounded-lg transition-colors ${
                chartType === 'pie' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Gráfico de Pizza"
            >
              <PieChartIcon className="h-5 w-5" />
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
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
              aria-label="Fechar análise"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(priorityTotals).map(([priority, count]) => (
          <div 
            key={priority}
            className="bg-[#1C2333] p-4 rounded-lg"
          >
            <h4 className="text-sm text-gray-400 mb-1">Prioridade {priority}</h4>
            <p className="text-2xl font-bold" style={{ color: CHART_COLORS[priority as keyof typeof CHART_COLORS] }}>
              {count}
            </p>
            <p className="text-sm text-gray-400">
              {((count / totalIncidents) * 100).toFixed(1)}% do total
            </p>
          </div>
        ))}
      </div>

      <div className="h-[500px]">
        {renderChart()}
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium text-white mb-4">Detalhamento por Categoria</h3>
        <div className="space-y-4">
          {priorityByCategory.map((category) => (
            <div key={category.category} className="bg-[#1C2333] p-4 rounded-lg">
              <button
                onClick={() => toggleCategory(category.category)}
                className="w-full flex items-center justify-between"
              >
                <h4 className="text-white font-medium">{category.category}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{category.total} chamados</span>
                  {expandedCategories.includes(category.category) ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedCategories.includes(category.category) && (
                <div className="grid grid-cols-5 gap-4 mt-4">
                  {Object.entries(category).map(([key, value]) => {
                    if (key !== 'category' && key !== 'total') {
                      const isClickable = value > 0;
                      const icon = ['P3', 'P4'].includes(key) ? Users : AlertTriangle;
                      const Icon = icon;
                      
                      return (
                        <div 
                          key={key} 
                          className={`text-center p-3 rounded-lg transition-colors ${
                            isClickable ? 'cursor-pointer hover:bg-[#151B2B]' : ''
                          }`}
                          onClick={() => isClickable && handlePriorityClick(category.category, key)}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <p className="text-sm text-gray-400">{key}</p>
                            {isClickable && (
                              <Icon className="h-3 w-3" style={{ color: CHART_COLORS[key as keyof typeof CHART_COLORS] }} />
                            )}
                          </div>
                          <p className="text-lg font-bold" style={{ color: CHART_COLORS[key as keyof typeof CHART_COLORS] }}>
                            {value}
                          </p>
                          <p className="text-xs text-gray-400">
                            {((value / category.total) * 100).toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedIncidents && (
        <IncidentModal
          incidents={selectedIncidents}
          category={selectedCategory}
          priority={selectedPriority}
          onClose={() => setSelectedIncidents(null)}
        />
      )}
    </div>
  );
}