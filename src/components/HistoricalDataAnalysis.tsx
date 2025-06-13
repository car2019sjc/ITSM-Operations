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
  LabelList
} from 'recharts';
import { 
  X, 
  BarChart2,
  ChevronDown,
  ChevronRight,
  Calendar,
  ChevronLeft,
  FileText,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { Incident } from '../types/incident';
import { Request } from '../types/request';
import { HistoricalData } from '../types/history';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval,
  isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';
import { normalizeRequestPriority, normalizeRequestStatus } from '../types/request';

interface HistoricalDataAnalysisProps {
  incidents: Incident[];
  requests: Request[];
  onClose?: () => void;
}

const CHART_COLORS = {
  incidents: '#3B82F6',
  requests: '#10B981',
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280',
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#10B981'
};

type ViewMode = 'all' | 'incidents' | 'requests';

export function HistoricalDataAnalysis({ incidents, requests, onClose }: HistoricalDataAnalysisProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const historicalData = useMemo(() => {
    // Get date range for last 12 months
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 11);
    const months = eachMonthOfInterval({ start, end });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthKey = format(month, 'yyyy-MM');

      // Filter incidents for this month
      const monthIncidents = incidents.filter(incident => {
        try {
          const incidentDate = parseISO(incident.Opened);
          return isWithinInterval(incidentDate, { start: monthStart, end: monthEnd });
        } catch (error) {
          return false;
        }
      });

      // Filter requests for this month
      const monthRequests = requests.filter(request => {
        try {
          const requestDate = parseISO(request.Opened);
          return isWithinInterval(requestDate, { start: monthStart, end: monthEnd });
        } catch (error) {
          return false;
        }
      });

      // Calculate incidents metrics
      const incidentsData = {
        total: monthIncidents.length,
        byPriority: {
          P1: monthIncidents.filter(i => normalizePriority(i.Priority) === 'P1').length,
          P2: monthIncidents.filter(i => normalizePriority(i.Priority) === 'P2').length,
          P3: monthIncidents.filter(i => normalizePriority(i.Priority) === 'P3').length,
          P4: monthIncidents.filter(i => normalizePriority(i.Priority) === 'P4').length,
          'Não definido': monthIncidents.filter(i => normalizePriority(i.Priority) === 'Não definido').length
        },
        byCategory: monthIncidents.reduce((acc, incident) => {
          const category = incident.Category || 'Não categorizado';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byState: {
          'Em Aberto': monthIncidents.filter(i => getIncidentState(i.State) === 'Em Aberto').length,
          'Em Andamento': monthIncidents.filter(i => getIncidentState(i.State) === 'Em Andamento').length,
          'Fechado': monthIncidents.filter(i => getIncidentState(i.State) === 'Fechado').length,
          'Em Espera': monthIncidents.filter(i => getIncidentState(i.State) === 'Em Espera').length,
          'Cancelado': monthIncidents.filter(i => getIncidentState(i.State) === 'Cancelado').length
        },
        slaCompliance: {
          withinSLA: 0, // Calculate based on your SLA rules
          outsideSLA: 0,
          percentage: 0
        }
      };

      // Calculate requests metrics
      const requestsData = {
        total: monthRequests.length,
        byPriority: {
          HIGH: monthRequests.filter(r => normalizeRequestPriority(r.Priority) === 'HIGH').length,
          MEDIUM: monthRequests.filter(r => normalizeRequestPriority(r.Priority) === 'MEDIUM').length,
          LOW: monthRequests.filter(r => normalizeRequestPriority(r.Priority) === 'LOW').length
        },
        byStatus: {
          NEW: monthRequests.filter(r => normalizeRequestStatus(r.State) === 'NEW').length,
          IN_PROGRESS: monthRequests.filter(r => normalizeRequestStatus(r.State) === 'IN_PROGRESS').length,
          COMPLETED: monthRequests.filter(r => normalizeRequestStatus(r.State) === 'COMPLETED').length,
          CANCELLED: monthRequests.filter(r => normalizeRequestStatus(r.State) === 'CANCELLED').length
        },
        byCategory: monthRequests.reduce((acc, request) => {
          const category = request.RequestItem || 'Não categorizado';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        completionRate: monthRequests.length > 0 
          ? (monthRequests.filter(r => normalizeRequestStatus(r.State) === 'COMPLETED').length / monthRequests.length) * 100 
          : 0
      };

      return {
        month: monthKey,
        monthLabel: format(month, 'MMM/yy', { locale: ptBR }),
        incidents: incidentsData,
        requests: requestsData,
        // Chart data
        incidentsTotal: incidentsData.total,
        requestsTotal: requestsData.total,
        total: incidentsData.total + requestsData.total,
        // Priority breakdown
        incidentsP1: incidentsData.byPriority.P1,
        incidentsP2: incidentsData.byPriority.P2,
        incidentsP3: incidentsData.byPriority.P3,
        incidentsP4: incidentsData.byPriority.P4,
        requestsHigh: requestsData.byPriority.HIGH,
        requestsMedium: requestsData.byPriority.MEDIUM,
        requestsLow: requestsData.byPriority.LOW
      };
    });
  }, [incidents, requests]);

  // Separate data for incidents and requests by priority
  const incidentsByPriorityData = useMemo(() => {
    return historicalData.map(month => ({
      month: month.monthLabel,
      P1: month.incidentsP1,
      P2: month.incidentsP2,
      P3: month.incidentsP3,
      P4: month.incidentsP4,
      total: month.incidentsTotal
    }));
  }, [historicalData]);

  const requestsByPriorityData = useMemo(() => {
    return historicalData.map(month => ({
      month: month.monthLabel,
      HIGH: month.requestsHigh,
      MEDIUM: month.requestsMedium,
      LOW: month.requestsLow,
      total: month.requestsTotal
    }));
  }, [historicalData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-[#1F2937] p-4 rounded-lg border border-gray-700 shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value, height } = props;
    if (!value) return null;

    return (
      <text
        x={x + width / 2}
        y={y - 6}
        fill="#9CA3AF"
        textAnchor="middle"
        fontSize={12}
      >
        {value}
      </text>
    );
  };

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Histórico de Chamados</h2>
          <p className="text-gray-400 mt-1">
            Análise comparativa entre Incidentes e Requests
          </p>
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

      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('all')}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors
            ${viewMode === 'all' 
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' 
              : 'text-gray-400 hover:text-white hover:bg-[#1C2333]'}
          `}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Geral</span>
        </button>
        <button
          onClick={() => setViewMode('incidents')}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors
            ${viewMode === 'incidents' 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
              : 'text-gray-400 hover:text-white hover:bg-[#1C2333]'}
          `}
        >
          <AlertCircle className="h-4 w-4" />
          <span>Incidentes</span>
        </button>
        <button
          onClick={() => setViewMode('requests')}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors
            ${viewMode === 'requests' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
              : 'text-gray-400 hover:text-white hover:bg-[#1C2333]'}
          `}
        >
          <FileText className="h-4 w-4" />
          <span>Requests</span>
        </button>
      </div>

      {/* Distribution Chart - Shows based on view mode */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">
          {viewMode === 'all' ? 'Distribuição Mensal' : 
           viewMode === 'incidents' ? 'Distribuição Mensal de Incidentes' : 
           'Distribuição Mensal de Requests'}
        </h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={historicalData}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
              <XAxis
                dataKey="monthLabel"
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
              <Legend />
              {(viewMode === 'all' || viewMode === 'incidents') && (
                <Bar
                  dataKey="incidentsTotal"
                  name="Incidentes"
                  fill={CHART_COLORS.incidents}
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    content={renderCustomBarLabel}
                    position="top"
                  />
                </Bar>
              )}
              {(viewMode === 'all' || viewMode === 'requests') && (
                <Bar
                  dataKey="requestsTotal"
                  name="Requests"
                  fill={CHART_COLORS.requests}
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    content={renderCustomBarLabel}
                    position="top"
                  />
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Analysis - Show based on view mode */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {viewMode !== 'requests' && (
          <div className="bg-[#1C2333] p-4 rounded-lg">
            <h3 className="text-lg font-medium text-white mb-4">Incidentes por Prioridade</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={incidentsByPriorityData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
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
                  <Legend />
                  <Bar dataKey="P1" name="P1" fill={CHART_COLORS.P1} stackId="incidents" />
                  <Bar dataKey="P2" name="P2" fill={CHART_COLORS.P2} stackId="incidents" />
                  <Bar dataKey="P3" name="P3" fill={CHART_COLORS.P3} stackId="incidents" />
                  <Bar dataKey="P4" name="P4" fill={CHART_COLORS.P4} stackId="incidents" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {viewMode !== 'incidents' && (
          <div className="bg-[#1C2333] p-4 rounded-lg">
            <h3 className="text-lg font-medium text-white mb-4">Requests por Prioridade</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={requestsByPriorityData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
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
                  <Legend />
                  <Bar dataKey="HIGH" name="Alta" fill={CHART_COLORS.HIGH} stackId="requests" />
                  <Bar dataKey="MEDIUM" name="Média" fill={CHART_COLORS.MEDIUM} stackId="requests" />
                  <Bar dataKey="LOW" name="Baixa" fill={CHART_COLORS.LOW} stackId="requests" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}