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
  Area,
  LabelList
} from 'recharts';
import { 
  X, 
  MapPin, 
  Calendar,
  ChevronDown,
  ChevronRight,
  Filter,
  Users
} from 'lucide-react';
import { Request } from '../types/request';
import { normalizeRequestPriority, normalizeRequestStatus } from '../types/request';
import { normalizeLocationName } from '../utils/locationUtils';
import { parseISO, isWithinInterval, format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RequestLocationAnalysisProps {
  requests: Request[];
  startDate?: string;
  endDate?: string;
}

const LOCATION_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#EF4444'  // red
];

export function RequestLocationAnalysis({ requests, startDate, endDate }: RequestLocationAnalysisProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showMonthlyChart, setShowMonthlyChart] = useState(true);

  // Get top 6 locations based on request count
  const topLocations = useMemo(() => {
    const locationCount: Record<string, number> = {};
    
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
    
    filteredRequests.forEach(request => {
      const location = normalizeLocationName(request.AssignmentGroup) || 'Não especificado';
      locationCount[location] = (locationCount[location] || 0) + 1;
    });
    
    return Object.entries(locationCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([location]) => location);
  }, [requests, startDate, endDate]);

  // Generate monthly data for the top locations
  const monthlyData = useMemo(() => {
    if (!startDate || !endDate || topLocations.length === 0) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const months = eachMonthOfInterval({ start, end });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthLabel = format(month, 'MMM/yy', { locale: ptBR });

      const data: Record<string, any> = {
        month: monthLabel
      };

      // Count requests for each top location in this month
      topLocations.forEach(location => {
        const count = requests.filter(request => {
          try {
            const requestDate = parseISO(request.Opened);
            const normalizedLocation = normalizeLocationName(request.AssignmentGroup);
            return normalizedLocation === location && 
                   isWithinInterval(requestDate, { start: monthStart, end: monthEnd });
          } catch (error) {
            return false;
          }
        }).length;

        data[location] = count;
      });

      return data;
    });
  }, [requests, startDate, endDate, topLocations]);

  const locationStats = useMemo(() => {
    // Filter by date range if provided
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

    // Group by location (using AssignmentGroup as proxy for location)
    const locationMap = filteredRequests.reduce((acc, request) => {
      const location = normalizeLocationName(request.AssignmentGroup) || 'Não especificado';
      
      if (!acc[location]) {
        acc[location] = {
          name: location,
          total: 0,
          completed: 0,
          inProgress: 0,
          onHold: 0,
          highPriority: 0,
          users: new Set<string>()
        };
      }
      
      acc[location].total++;
      
      // Count by status
      const state = request.State?.toLowerCase() || '';
      if (state.includes('complete') || state.includes('closed complete')) {
        acc[location].completed++;
      } else if (state.includes('hold') || state.includes('pending') || state.includes('aguardando')) {
        acc[location].onHold++;
      } else if (state.includes('progress') || state.includes('assigned')) {
        acc[location].inProgress++;
      }
      
      // Count high priority
      if (request.Priority?.toLowerCase().includes('high') || 
          request.Priority?.toLowerCase().includes('p1') || 
          request.Priority?.toLowerCase().includes('1')) {
        acc[location].highPriority++;
      }
      
      // Track unique users
      if (request.RequestedForName) {
        acc[location].users.add(request.RequestedForName);
      }
      
      return acc;
    }, {} as Record<string, {
      name: string;
      total: number;
      completed: number;
      inProgress: number;
      onHold: number;
      highPriority: number;
      users: Set<string>;
    }>);
    
    return Object.values(locationMap)
      .sort((a, b) => b.total - a.total);
  }, [requests, startDate, endDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-[#1F2937] p-4 rounded-lg border border-gray-700 shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span style={{ color: LOCATION_COLORS[index % LOCATION_COLORS.length] }}>{entry.name}</span>
              <span className="text-white">{entry.value} solicitações</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total</span>
              <span className="text-white font-bold">
                {payload.reduce((sum: number, entry: any) => sum + entry.value, 0)} solicitações
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (!value) return null;

    return (
      <text
        x={x + width / 2}
        y={y - 6}
        fill="#9CA3AF"
        textAnchor="middle"
        fontSize={10}
      >
        {value}
      </text>
    );
  };

  if (locationStats.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Nenhum dado de localidade encontrado no período selecionado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Chart Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-emerald-400" />
          <h3 className="text-lg font-medium text-white">Sumarização Mensal por Localidade</h3>
        </div>
        <button
          onClick={() => setShowMonthlyChart(!showMonthlyChart)}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          {showMonthlyChart ? (
            <>
              <ChevronDown className="h-4 w-4" />
              <span>Ocultar Gráfico</span>
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" />
              <span>Mostrar Gráfico</span>
            </>
          )}
        </button>
      </div>

      {/* Monthly Chart */}
      {showMonthlyChart && (
        <div className="bg-[#1C2333] p-4 rounded-lg">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 30, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
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
                <Legend 
                  wrapperStyle={{ paddingTop: 20 }}
                  formatter={(value) => <span style={{ color: '#9CA3AF' }}>{value}</span>}
                />
                {topLocations.map((location, index) => (
                  <Bar
                    key={location}
                    dataKey={location}
                    name={location}
                    fill={LOCATION_COLORS[index % LOCATION_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                    onClick={() => setSelectedLocation(location === selectedLocation ? null : location)}
                  >
                    <LabelList
                      dataKey={location}
                      content={renderCustomBarLabel}
                      position="top"
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
            {topLocations.map((location, index) => {
              const totalRequests = monthlyData.reduce((sum, month) => sum + (month[location] || 0), 0);
              
              return (
                <div 
                  key={location}
                  className={`bg-[#151B2B] p-4 rounded-lg cursor-pointer transition-all ${
                    selectedLocation === location ? 'ring-2 ring-emerald-500' : ''
                  }`}
                  style={{ borderLeft: `4px solid ${LOCATION_COLORS[index % LOCATION_COLORS.length]}` }}
                  onClick={() => setSelectedLocation(location === selectedLocation ? null : location)}
                >
                  <h4 className="text-sm text-gray-400 mb-1 truncate" title={location}>{location}</h4>
                  <p className="text-2xl font-bold" style={{ color: LOCATION_COLORS[index % LOCATION_COLORS.length] }}>
                    {totalRequests}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    solicitações no período
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Location Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locationStats
          .filter(location => !selectedLocation || location.name === selectedLocation)
          .slice(0, selectedLocation ? 1 : 6)
          .map(location => (
            <div 
              key={location.name}
              className="bg-[#1C2333] p-4 rounded-lg hover:bg-[#1F2937] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-emerald-400" />
                    <h4 className="text-lg font-medium text-white truncate">{location.name}</h4>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {location.users.size} {location.users.size === 1 ? 'usuário' : 'usuários'} ativos
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-white">{location.total}</span>
                  <p className="text-sm text-gray-400">solicitações</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="text-center">
                    <span className="text-blue-400">{location.inProgress}</span>
                    <p className="text-gray-400 text-xs">Em Andamento</p>
                  </div>
                  <div className="text-center">
                    <span className="text-orange-400">{location.onHold}</span>
                    <p className="text-gray-400 text-xs">Em Espera</p>
                  </div>
                  <div className="text-center">
                    <span className="text-green-400">{location.completed}</span>
                    <p className="text-gray-400 text-xs">Concluídos</p>
                  </div>
                  <div className="text-center">
                    <span className="text-red-400">{location.highPriority}</span>
                    <p className="text-gray-400 text-xs">Alta Prioridade</p>
                  </div>
                </div>

                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 float-left"
                    style={{ width: `${(location.inProgress / location.total) * 100}%` }}
                  />
                  <div
                    className="h-full bg-orange-500 float-left"
                    style={{ width: `${(location.onHold / location.total) * 100}%` }}
                  />
                  <div
                    className="h-full bg-green-500 float-left"
                    style={{ width: `${(location.completed / location.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Location Table */}
      <div className="bg-[#1C2333] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#151B2B]">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-400">Localidade</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Total</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Em Andamento</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Em Espera</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Concluídos</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Alta Prioridade</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Usuários</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {locationStats
              .filter(location => !selectedLocation || location.name === selectedLocation)
              .map((location) => (
                <tr 
                  key={location.name}
                  className={`hover:bg-[#151B2B] transition-colors ${
                    selectedLocation === location.name ? 'bg-[#151B2B]' : ''
                  }`}
                  onClick={() => setSelectedLocation(location.name === selectedLocation ? null : location.name)}
                >
                  <td className="px-6 py-4 text-sm text-white">{location.name}</td>
                  <td className="px-6 py-4 text-sm text-center text-white">{location.total}</td>
                  <td className="px-6 py-4 text-sm text-center text-blue-400">{location.inProgress}</td>
                  <td className="px-6 py-4 text-sm text-center text-orange-400">{location.onHold}</td>
                  <td className="px-6 py-4 text-sm text-center text-green-400">{location.completed}</td>
                  <td className="px-6 py-4 text-sm text-center text-red-400">{location.highPriority}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-400">{location.users.size}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}