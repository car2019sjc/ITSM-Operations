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
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Filter,
  PauseCircle
} from 'lucide-react';
import { Request, REQUEST_PRIORITIES, REQUEST_STATUSES, normalizeRequestPriority, normalizeRequestStatus } from '../types/request';
import { parseISO, format, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RequestAnalysisProps {
  requests: Request[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

const CHART_COLORS = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#10B981',
  NEW: '#3B82F6',
  IN_PROGRESS: '#6366F1',
  ON_HOLD: '#FB923C',
  COMPLETED: '#10B981',
  CANCELLED: '#6B7280'
};

const STATUS_OPTIONS = [
  { 
    value: '', 
    label: 'Todos os Estados',
    icon: Filter,
    color: 'text-gray-400'
  },
  { 
    value: 'NEW', 
    label: 'Novos',
    icon: AlertCircle,
    color: 'text-blue-400'
  },
  { 
    value: 'IN_PROGRESS', 
    label: 'Em Andamento',
    icon: Clock,
    color: 'text-indigo-400'
  },
  { 
    value: 'ON_HOLD', 
    label: 'Em Espera',
    icon: PauseCircle,
    color: 'text-orange-400'
  },
  { 
    value: 'COMPLETED', 
    label: 'Concluídos',
    icon: CheckCircle2,
    color: 'text-green-400'
  }
];

export function RequestAnalysis({ requests, onClose, startDate, endDate }: RequestAnalysisProps) {
  const [selectedStatus, setSelectedStatus] = useState('');

  const requestData = useMemo(() => {
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
      const priority = normalizeRequestPriority(request.Priority);
      let status = normalizeRequestStatus(request.State);
      
      // Check if the request is on hold
      const state = request.State?.toLowerCase() || '';
      if (state.includes('hold') || state.includes('pending') || state.includes('aguardando')) {
        status = 'ON_HOLD';
      }
      
      if (!acc[status]) {
        acc[status] = {
          status,
          total: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
          groups: new Set<string>()
        };
      }

      acc[status].total++;
      acc[status][priority]++;

      if (request.AssignmentGroup) {
        acc[status].groups.add(request.AssignmentGroup);
      }

      return acc;
    }, {} as Record<string, {
      status: string;
      total: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
      groups: Set<string>;
    }>);

    return Object.values(data);
  }, [requests, startDate, endDate]);

  const categoryData = useMemo(() => {
    return requests.reduce((acc, request) => {
      const category = request.RequestItem || 'Não categorizado';
      const priority = normalizeRequestPriority(request.Priority);
      
      if (!acc[category]) {
        acc[category] = {
          name: category,
          total: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0
        };
      }

      acc[category].total++;
      acc[category][priority]++;

      return acc;
    }, {} as Record<string, {
      name: string;
      total: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    }>);
  }, [requests]);

  const topRequesters = useMemo(() => {
    const requesters = requests.reduce((acc, request) => {
      // Use the correct field for user identification
      const requester = request["Request item [Catalog Task] Requested for Name"] || request.RequestedForName || 'Não identificado';
      
      if (!acc[requester]) {
        acc[requester] = {
          name: requester,
          total: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0
        };
      }

      acc[requester].total++;
      acc[requester][normalizeRequestPriority(request.Priority)]++;

      return acc;
    }, {} as Record<string, {
      name: string;
      total: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    }>);

    return Object.values(requesters)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [requests]);

  const stats = useMemo(() => {
    // Count requests by status
    const inProgress = requests.filter(r => {
      const status = normalizeRequestStatus(r.State);
      const state = r.State?.toLowerCase() || '';
      return (status === 'IN_PROGRESS' || status === 'NEW') && 
             !state.includes('hold') && !state.includes('pending') && !state.includes('aguardando');
    }).length;
    
    const onHold = requests.filter(r => {
      const state = r.State?.toLowerCase() || '';
      return state.includes('hold') || state.includes('pending') || state.includes('aguardando');
    }).length;
    
    const completed = requests.filter(r => 
      normalizeRequestStatus(r.State) === 'COMPLETED'
    ).length;
    
    const highPriority = requests.filter(r => 
      normalizeRequestPriority(r.Priority) === 'HIGH'
    ).length;

    // Calculate total as the sum of in progress, on hold, and completed
    const total = inProgress + onHold + completed;

    return {
      total,
      completed,
      inProgress,
      onHold,
      highPriority,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }, [requests]);

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
        <div>
          <h2 className="text-xl font-semibold text-white">Análise de Requests</h2>
          <p className="text-gray-400 mt-1">
            {stats.total} requests no período
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-[#1C2333] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm text-gray-400">Taxa de Conclusão</h3>
          </div>
          <p className={`text-2xl font-bold ${
            stats.completionRate >= 80 ? 'text-green-400' :
            stats.completionRate >= 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {stats.completionRate.toFixed(1)}%
          </p>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <h3 className="text-sm text-gray-400 mb-2">Em Andamento</h3>
          <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <h3 className="text-sm text-gray-400 mb-2">Em Espera</h3>
          <p className="text-2xl font-bold text-orange-400">{stats.onHold}</p>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <h3 className="text-sm text-gray-400 mb-2">Concluídos</h3>
          <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-sm text-gray-400">Alta Prioridade</h3>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.highPriority}</p>
        </div>
      </div>

      <div className="bg-[#1C2333] p-4 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Distribuição por Status</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={requestData}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="status"
                tick={{ fill: '#9CA3AF' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: '#9CA3AF' }} />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1C2333] p-4 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Top 10 Solicitantes</h3>
          <div className="space-y-4">
            {topRequesters.map(requester => (
              <div 
                key={requester.name}
                className="bg-[#151B2B] p-4 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">{requester.name}</h4>
                  <span className="text-gray-400">{requester.total} requests</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  {['HIGH', 'MEDIUM', 'LOW'].map(priority => {
                    const width = (requester[priority as keyof typeof requester] as number / requester.total) * 100;
                    return (
                      <div
                        key={priority}
                        className="h-full float-left"
                        style={{
                          width: `${width}%`,
                          backgroundColor: CHART_COLORS[priority as keyof typeof CHART_COLORS]
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Distribuição por Categoria</h3>
          <div className="space-y-4">
            {Object.values(categoryData)
              .sort((a, b) => b.total - a.total)
              .slice(0, 10)
              .map(category => (
                <div 
                  key={category.name}
                  className="bg-[#151B2B] p-4 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">{category.name}</h4>
                    <span className="text-gray-400">{category.total} requests</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    {['HIGH', 'MEDIUM', 'LOW'].map(priority => {
                      const width = (category[priority as keyof typeof category] as number / category.total) * 100;
                      return (
                        <div
                          key={priority}
                          className="h-full float-left"
                          style={{
                            width: `${width}%`,
                            backgroundColor: CHART_COLORS[priority as keyof typeof CHART_COLORS]
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}