import React, { useMemo } from 'react';
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { 
  X, 
  MapPin,
  Calendar
} from 'lucide-react';
import { Request } from '../types/request';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval,
  isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeLocationName } from '../utils/locationUtils';

interface RequestMonthlyLocationSummaryProps {
  requests: Request[];
  onClose?: () => void;
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

export function RequestMonthlyLocationSummary({ requests, onClose, startDate, endDate }: RequestMonthlyLocationSummaryProps) {
  // Get top 6 locations based on request count
  const topLocations = useMemo(() => {
    const locationCount: Record<string, number> = {};
    
    requests.forEach(request => {
      if (!startDate || !endDate) return;
      
      try {
        const requestDate = parseISO(request.Opened);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        
        if (isWithinInterval(requestDate, { start, end })) {
          const location = normalizeLocationName(request.AssignmentGroup) || 'Não especificado';
          locationCount[location] = (locationCount[location] || 0) + 1;
        }
      } catch (error) {
        // Skip invalid dates
      }
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

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-emerald-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">Sumarização Mensal por Localidade</h2>
            <p className="text-gray-400 mt-1">Top 6 localidades mais ativas</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      <div className="h-[500px]">
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {topLocations.map((location, index) => {
          const totalRequests = monthlyData.reduce((sum, month) => sum + (month[location] || 0), 0);
          
          return (
            <div 
              key={location}
              className="bg-[#1C2333] p-4 rounded-lg"
              style={{ borderLeft: `4px solid ${LOCATION_COLORS[index % LOCATION_COLORS.length]}` }}
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
  );
}