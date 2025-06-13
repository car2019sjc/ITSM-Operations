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
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  X, 
  AlertTriangle, 
  MapPin, 
  ExternalLink, 
  Filter, 
  Users,
  BarChart2,
  LineChart as LineChartIcon,
  TrendingUp
} from 'lucide-react';
import { Incident } from '../types/incident';
import { parseISO, isWithinInterval, format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IncidentDetails } from './IncidentDetails';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';
import { normalizeLocationName } from '../utils/locationUtils';

type ChartType = 'bar' | 'line' | 'area';

interface LocationAnalysisProps {
  incidents: Incident[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

interface IncidentModalProps {
  incidents: Incident[];
  location: string;
  onClose: () => void;
}

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

function IncidentModal({ incidents, location, onClose }: IncidentModalProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const getStatusColor = (state: string) => {
    const normalizedState = getIncidentState(state);
    if (normalizedState === 'Fechado') return 'bg-green-500/20 text-green-400';
    if (normalizedState === 'Em Andamento') return 'bg-blue-500/20 text-blue-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Chamados em {location}
            </h2>
            <p className="text-gray-400 mt-1">
              {incidents.length} chamados encontrados
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
          <table className="w-full">
            <thead className="bg-[#1C2333] sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Número</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Data</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Descrição</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Categoria</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Subcategoria</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Grupo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Prioridade</th>
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
                  <td className="px-4 py-3 text-sm text-gray-300">{incident.Category}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{incident.Subcategory}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{normalizeLocationName(incident.AssignmentGroup)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="text-sm" style={{ color: CHART_COLORS[normalizePriority(incident.Priority) as keyof typeof CHART_COLORS] }}>
                      {incident.Priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.State)}`}>
                      {incident.State}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => setSelectedIncident(incident)}
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

export function LocationAnalysis({ incidents, onClose, startDate, endDate }: LocationAnalysisProps) {
  const [selectedIncidents, setSelectedIncidents] = useState<Incident[] | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [chartType, setChartType] = useState<ChartType>('bar');

  const subcategories = useMemo(() => {
    const uniqueSubcategories = new Set<string>();
    incidents.forEach(incident => {
      if (incident.Subcategory) {
        uniqueSubcategories.add(incident.Subcategory);
      }
    });
    return Array.from(uniqueSubcategories).sort();
  }, [incidents]);

  const groups = useMemo(() => {
    const uniqueGroups = new Set<string>();
    incidents.forEach(incident => {
      if (incident.AssignmentGroup) {
        uniqueGroups.add(normalizeLocationName(incident.AssignmentGroup));
      }
    });
    return Array.from(uniqueGroups).sort();
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      let isValid = true;

      if (startDate && endDate) {
        try {
          const incidentDate = parseISO(incident.Opened);
          const start = parseISO(startDate);
          const end = parseISO(endDate);
          isValid = isWithinInterval(incidentDate, { start, end });
        } catch (error) {
          isValid = false;
        }
      }

      if (selectedSubcategory && incident.Subcategory !== selectedSubcategory) {
        isValid = false;
      }

      if (selectedGroup && normalizeLocationName(incident.AssignmentGroup) !== selectedGroup) {
        isValid = false;
      }

      return isValid;
    });
  }, [incidents, startDate, endDate, selectedSubcategory, selectedGroup]);

  const monthlyData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const months = eachMonthOfInterval({ start, end });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthIncidents = filteredIncidents.filter(incident => {
        try {
          const incidentDate = parseISO(incident.Opened);
          return isWithinInterval(incidentDate, { start: monthStart, end: monthEnd });
        } catch (error) {
          return false;
        }
      });

      const locationCounts: Record<string, Record<string, number>> = {};

      monthIncidents.forEach(incident => {
        const location = normalizeLocationName(incident.AssignmentGroup) || 'Não especificado';
        const priority = normalizePriority(incident.Priority);

        if (!locationCounts[location]) {
          locationCounts[location] = {
            P1: 0,
            P2: 0,
            P3: 0,
            P4: 0,
            'Não definido': 0,
            total: 0
          };
        }

        locationCounts[location][priority]++;
        locationCounts[location].total++;
      });

      return {
        month: month.getTime(),
        monthLabel: format(month, 'MMM/yy', { locale: ptBR }),
        ...Object.entries(locationCounts).reduce((acc, [location, counts]) => ({
          ...acc,
          [`${location}_P1`]: counts.P1,
          [`${location}_P2`]: counts.P2,
          [`${location}_P3`]: counts.P3,
          [`${location}_P4`]: counts.P4,
          [`${location}_total`]: counts.total
        }), {})
      };
    });
  }, [filteredIncidents, startDate, endDate]);

  const locationData = useMemo(() => {
    const data = filteredIncidents.reduce((acc, incident) => {
      const location = normalizeLocationName(incident.AssignmentGroup) || 'Não especificado';
      
      if (!acc[location]) {
        acc[location] = {
          name: location,
          total: 0,
          P1: 0,
          P2: 0,
          P3: 0,
          P4: 0,
          undefined: 0,
          openCritical: 0,
          users: new Set<string>()
        };
      }

      acc[location].total++;

      if (incident.Caller) {
        acc[location].users.add(incident.Caller);
      }

      const priority = normalizePriority(incident.Priority);
      acc[location][priority]++;

      if ((priority === 'P1' || priority === 'P2') && getIncidentState(incident.State) !== 'Fechado') {
        acc[location].openCritical++;
      }

      return acc;
    }, {} as Record<string, {
      name: string;
      total: number;
      P1: number;
      P2: number;
      P3: number;
      P4: number;
      undefined: number;
      openCritical: number;
      users: Set<string>;
    }>);

    return Object.values(data)
      .map(location => ({
        ...location,
        userCount: location.users.size
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredIncidents]);

  const showLocationIncidents = (location: string) => {
    const locationIncidents = filteredIncidents.filter(incident => 
      normalizeLocationName(incident.AssignmentGroup) === location
    );

    if (locationIncidents.length > 0) {
      setSelectedIncidents(locationIncidents);
      setSelectedLocation(location);
    }
  };

  const getFilterSummary = () => {
    const parts = [];
    if (selectedSubcategory) {
      parts.push(`Subcategoria: ${selectedSubcategory}`);
    }
    if (selectedGroup) {
      parts.push(`Grupo: ${selectedGroup}`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'Todos os chamados';
  };

  const renderChart = () => {
    const locations = locationData.slice(0, 5).map(loc => loc.name);

    switch (chartType) {
      case 'line':
        return (
          <LineChart
            data={monthlyData}
            margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="monthLabel"
              tick={{ fill: '#9CA3AF' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
              formatter={(value: number, name: string) => {
                const [location, priority] = name.split('_');
                return [`${value} chamados`, `${location} - ${priority}`];
              }}
            />
            <Legend 
              formatter={(value: string) => {
                const [location, priority] = value.split('_');
                return `${location} - ${priority}`;
              }}
            />
            {locations.map((location) => (
              ['P1', 'P2', 'P3', 'P4'].map((priority) => (
                <Line
                  key={`${location}_${priority}`}
                  type="monotone"
                  dataKey={`${location}_${priority}`}
                  name={`${location}_${priority}`}
                  stroke={CHART_COLORS[priority as keyof typeof CHART_COLORS]}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[priority as keyof typeof CHART_COLORS], r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart
            data={monthlyData}
            margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="monthLabel"
              tick={{ fill: '#9CA3AF' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />
            {locations.map((location) => (
              ['P1', 'P2', 'P3', 'P4'].map((priority) => (
                <Area
                  key={`${location}_${priority}`}
                  type="monotone"
                  dataKey={`${location}_${priority}`}
                  name={`${location} - ${priority}`}
                  fill={CHART_COLORS[priority as keyof typeof CHART_COLORS]}
                  stroke={CHART_COLORS[priority as keyof typeof CHART_COLORS]}
                  stackId={location}
                  fillOpacity={0.6}
                />
              ))
            ))}
          </AreaChart>
        );

      default: // 'bar'
        return (
          <BarChart
            data={locationData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" tick={{ fill: '#9CA3AF' }} />
            <YAxis 
              dataKey="name" 
              type="category" 
              tick={({ x, y, payload }) => {
                const location = locationData.find(l => l.name === payload.value);
                const hasOpenCritical = location?.openCritical > 0;
                return (
                  <text 
                    x={x} 
                    y={y} 
                    dy={4} 
                    textAnchor="end"
                    fill={hasOpenCritical ? '#FDE047' : '#9CA3AF'}
                    fontWeight={hasOpenCritical ? 'bold' : 'normal'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => showLocationIncidents(payload.value)}
                  >
                    {`${payload.value} (${location?.total || 0})`}
                  </text>
                );
              }}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />
            <Bar dataKey="P1" name="Crítico" fill={CHART_COLORS.P1} stackId="stack" />
            <Bar dataKey="P2" name="Alto" fill={CHART_COLORS.P2} stackId="stack" />
            <Bar dataKey="P3" name="Médio" fill={CHART_COLORS.P3} stackId="stack" />
            <Bar dataKey="P4" name="Baixo" fill={CHART_COLORS.P4} stackId="stack" />
            <Bar dataKey="undefined" name="Não definido" fill={CHART_COLORS['Não definido']} stackId="stack" />
          </BarChart>
        );
    }
  };

  if (locationData.length === 0) {
    return (
      <div className="bg-[#151B2B] p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Análise por Localidade</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          )}
        </div>
        <div className="text-center py-8">
          <p className="text-gray-400">Nenhum incidente encontrado para os filtros selecionados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Análise por Localidade</h2>
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
              onClick={() => setChartType('line')}
              className={`p-2 rounded-lg transition-colors ${
                chartType === 'line' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Gráfico de Linha"
            >
              <LineChartIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`p-2 rounded-lg transition-colors ${
                chartType === 'area' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Gráfico de Área"
            >
              <TrendingUp className="h-5 w-5" />
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

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 bg-[#1C2333] p-4 rounded-lg">
            <Filter className="h-5 w-5 text-indigo-400" />
            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              className="w-full bg-[#151B2B] text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas as Subcategorias</option>
              {subcategories.map(subcategory => (
                <option key={subcategory} value={subcategory}>
                  {subcategory}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-[#1C2333] p-4 rounded-lg">
            <Users className="h-5 w-5 text-indigo-400" />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-[#151B2B] text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os Grupos</option>
              {groups.map(group => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-400">
          {getFilterSummary()}
        </div>
      </div>

      <div className="bg-[#1C2333] p-4 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Distribuição por Localidade</h3>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locationData.slice(0, 6).map(location => (
          <div 
            key={location.name}
            className="bg-[#1C2333] p-4 rounded-lg cursor-pointer hover:bg-[#1F2937] transition-colors"
            onClick={() => showLocationIncidents(location.name)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-indigo-400" />
                  <h4 className="text-lg font-medium text-white">{location.name}</h4>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {location.userCount} usuários ativos
                </p>
              </div>
              <span className="text-2xl font-bold text-white">{location.total}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-400">Críticos (P1/P2)</span>
                <span className="text-white">{location.P1 + location.P2}</span>
              </div>
              {location.openCritical > 0 && (
                <div className="flex items-center gap-2 text-sm text-yellow-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{location.openCritical} em aberto</span>
                </div>
              )}
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-yellow-500"
                  style={{ 
                    width: `${((location.P1 + location.P2) / location.total) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedIncidents && (
        <IncidentModal
          incidents={selectedIncidents}
          location={selectedLocation}
          onClose={() => {
            setSelectedIncidents(null);
            setSelectedLocation('');
          }}
        />
      )}
    </div>
  );
}