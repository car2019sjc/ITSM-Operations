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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Calendar,
  BarChart2
} from 'lucide-react';
import { Request, normalizeRequestPriority, normalizeRequestStatus, REQUEST_PRIORITIES, REQUEST_STATUSES } from '../types/request';
import { parseISO, format, differenceInDays, isAfter, isBefore, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RequestDashboardMetricsProps {
  requests: Request[];
  startDate?: string;
  endDate?: string;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface CategoryData {
  name: string;
  value: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

interface RequesterData {
  name: string;
  value: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

interface GroupData {
  name: string;
  value: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  NEW: number;
  IN_PROGRESS: number;
  COMPLETED: number;
  CANCELLED: number;
}

const CHART_COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
  NEW: '#3b82f6',
  IN_PROGRESS: '#8b5cf6',
  COMPLETED: '#10b981',
  CANCELLED: '#6b7280'
} as const;

// SLA thresholds for requests (in days)
const REQUEST_SLA_THRESHOLDS: Record<string, number> = {
  HIGH: 3,    // 3 days
  MEDIUM: 5,  // 5 days
  LOW: 7      // 7 days
};

export function RequestDashboardMetrics({ requests, startDate, endDate }: RequestDashboardMetricsProps) {
  // Filter requests by date range
  const filteredRequests = useMemo(() => {
    if (!startDate || !endDate) return requests;
    
    return requests.filter(request => {
      try {
        const requestDate = parseISO(request.Opened);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        return isWithinInterval(requestDate, { start, end });
      } catch (error) {
        return false;
      }
    });
  }, [requests, startDate, endDate]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const total = filteredRequests.length;
    
    // Status counts
    const completed = filteredRequests.filter(r => 
      normalizeRequestStatus(r.State) === 'COMPLETED'
    ).length;
    
    const inProgress = filteredRequests.filter(r => 
      normalizeRequestStatus(r.State) === 'IN_PROGRESS'
    ).length;
    
    const cancelled = filteredRequests.filter(r => 
      normalizeRequestStatus(r.State) === 'CANCELLED'
    ).length;
    
    const new_ = filteredRequests.filter(r => 
      normalizeRequestStatus(r.State) === 'NEW'
    ).length;
    
    // Priority counts
    const highPriority = filteredRequests.filter(r => 
      normalizeRequestPriority(r.Priority) === 'HIGH'
    ).length;
    
    const mediumPriority = filteredRequests.filter(r => 
      normalizeRequestPriority(r.Priority) === 'MEDIUM'
    ).length;
    
    const lowPriority = filteredRequests.filter(r => 
      normalizeRequestPriority(r.Priority) === 'LOW'
    ).length;
    
    // SLA compliance
    let withinSla = 0;
    let outsideSla = 0;
    
    filteredRequests.forEach(request => {
      const priority = normalizeRequestPriority(request.Priority);
      const status = normalizeRequestStatus(request.State);
      const threshold = REQUEST_SLA_THRESHOLDS[priority] || 5;
      
      try {
        const opened = parseISO(request.Opened);
        const closed = request.Updated && status === 'COMPLETED' ? parseISO(request.Updated) : new Date();
        const daysToResolve = differenceInDays(closed, opened);
        
        if (daysToResolve <= threshold) {
          withinSla++;
        } else {
          outsideSla++;
        }
      } catch (error) {
        outsideSla++;
      }
    });
    
    const slaComplianceRate = total > 0 ? (withinSla / total) * 100 : 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    return {
      total,
      completed,
      inProgress,
      cancelled,
      new_,
      highPriority,
      mediumPriority,
      lowPriority,
      withinSla,
      outsideSla,
      slaComplianceRate,
      completionRate
    };
  }, [filteredRequests]);

  // Status distribution data
  const statusData = useMemo<ChartData[]>(() => [
    { name: REQUEST_STATUSES.NEW, value: metrics.new_, color: CHART_COLORS.NEW },
    { name: REQUEST_STATUSES.IN_PROGRESS, value: metrics.inProgress, color: CHART_COLORS.IN_PROGRESS },
    { name: REQUEST_STATUSES.COMPLETED, value: metrics.completed, color: CHART_COLORS.COMPLETED },
    { name: REQUEST_STATUSES.CANCELLED, value: metrics.cancelled, color: CHART_COLORS.CANCELLED }
  ], [metrics]);

  // Priority distribution data
  const priorityData = useMemo<ChartData[]>(() => [
    { name: REQUEST_PRIORITIES.HIGH, value: metrics.highPriority, color: CHART_COLORS.HIGH },
    { name: REQUEST_PRIORITIES.MEDIUM, value: metrics.mediumPriority, color: CHART_COLORS.MEDIUM },
    { name: REQUEST_PRIORITIES.LOW, value: metrics.lowPriority, color: CHART_COLORS.LOW }
  ], [metrics]);

  // Category distribution
  const categoryData = useMemo(() => {
    const categories = filteredRequests.reduce((acc, request) => {
      const category = request.RequestItem || 'Não categorizado';
      
      if (!acc[category]) {
        acc[category] = {
          name: category,
          value: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0
        };
      }
      
      acc[category].value++;
      const priority = normalizeRequestPriority(request.Priority);
      acc[category][priority]++;
      
      return acc;
    }, {} as Record<string, CategoryData>);
    
    return Object.values(categories)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredRequests]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-[#1C2333] p-2 rounded shadow-lg border border-gray-700">
        <p className="text-white font-medium">{label}</p>
        {payload.map((item: any, index: number) => (
          <p key={index} style={{ color: item.color }}>
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Status Overview */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Visão Geral por Status</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Overview */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Visão Geral por Prioridade</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={priorityData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-[#1C2333] p-4 rounded-lg col-span-2">
        <h3 className="text-lg font-medium text-white mb-4">Métricas Principais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#151B2B] p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-blue-400" />
              <h4 className="text-white font-medium">Total de Solicitações</h4>
            </div>
            <p className="text-2xl font-bold text-white">{metrics.total}</p>
          </div>

          <div className="bg-[#151B2B] p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-purple-400" />
              <h4 className="text-white font-medium">Em Andamento</h4>
            </div>
            <p className="text-2xl font-bold text-white">{metrics.inProgress}</p>
          </div>

          <div className="bg-[#151B2B] p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <h4 className="text-white font-medium">Taxa de Conclusão</h4>
            </div>
            <p className="text-2xl font-bold text-white">{metrics.completionRate.toFixed(1)}%</p>
          </div>

          <div className="bg-[#151B2B] p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <h4 className="text-white font-medium">Alta Prioridade</h4>
            </div>
            <p className="text-2xl font-bold text-white">{metrics.highPriority}</p>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-[#1C2333] p-4 rounded-lg col-span-2">
        <h3 className="text-lg font-medium text-white mb-4">Top 5 Categorias</h3>
        <div className="space-y-4">
          {categoryData.map(category => (
            <div
              key={category.name}
              className="bg-[#151B2B] p-4 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-blue-400" />
                  <h4 className="text-white font-medium">{category.name}</h4>
                </div>
                <span className="text-gray-400">{category.value} solicitações</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map(priority => {
                  const width = (category[priority] / category.value) * 100;
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
          ))}
        </div>
      </div>
    </div>
  );
}