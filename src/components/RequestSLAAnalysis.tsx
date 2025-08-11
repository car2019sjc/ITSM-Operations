/*
  =====================================================================
  RequestSLAAnalysis
  ---------------------------------------------------------------------
  Este componente é responsável pela análise e apresentação dos SLAs 
  (Service Level Agreements) exclusivamente para o dashboard de 'Request'.
  
  Os parâmetros de SLA definidos neste arquivo (REQUEST_SLA_THRESHOLDS) 
  são utilizados apenas para as solicitações (requests) e não afetam 
  incidentes ou outros módulos do sistema.
  
  Parâmetros atuais de SLA (em dias):
    - Alta prioridade (HIGH): 7 dias
    - Média prioridade (MEDIUM): 10 dias
    - Baixa prioridade (LOW): 15 dias
  
  Para alterar os limites de SLA de requests, edite o objeto 
  REQUEST_SLA_THRESHOLDS abaixo.
  =====================================================================
*/
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
  AlertTriangle, 
  Clock, 
  Calendar,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { Request, normalizeRequestPriority, normalizeRequestStatus } from '../types/request';
import { REQUEST_SLA_THRESHOLDS } from '../constants';
import { parseISO, isWithinInterval, format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RequestSLAAnalysisProps {
  requests: Request[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

const CHART_COLORS = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#10B981',
  withinSLA: '#10B981',
  outsideSLA: '#EF4444'
};



export function RequestSLAAnalysis({ requests, onClose, startDate, endDate }: RequestSLAAnalysisProps) {
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);

  const slaData = useMemo(() => {
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

    // Initialize data structure with all priority levels
    const data = {
      HIGH: {
        priority: 'Alta',
        total: 0,
        withinSLA: 0,
        outsideSLA: 0,
        completionRate: 0,
        avgResolutionDays: 0,
        totalResolutionDays: 0,
        completedCount: 0
      },
      MEDIUM: {
        priority: 'Média',
        total: 0,
        withinSLA: 0,
        outsideSLA: 0,
        completionRate: 0,
        avgResolutionDays: 0,
        totalResolutionDays: 0,
        completedCount: 0
      },
      LOW: {
        priority: 'Baixa',
        total: 0,
        withinSLA: 0,
        outsideSLA: 0,
        completionRate: 0,
        avgResolutionDays: 0,
        totalResolutionDays: 0,
        completedCount: 0
      }
    };

    // Process each request
    filteredRequests.forEach(request => {
      const priority = normalizeRequestPriority(request.Priority);
      const status = normalizeRequestStatus(request.State);
      const isCompleted = status === 'COMPLETED';
      
      // Update total count
      data[priority].total++;
      
      // Calculate SLA compliance
      const threshold = REQUEST_SLA_THRESHOLDS[priority];
      
      try {
        const opened = parseISO(request.Opened);
        
        if (isCompleted && request.Updated) {
          // Para requests concluídos, usar a data de fechamento real
          const closed = parseISO(request.Updated);
          const daysToResolve = differenceInDays(closed, opened);
          
          data[priority].completedCount++;
          data[priority].totalResolutionDays += daysToResolve;
          
          if (daysToResolve <= threshold) {
            data[priority].withinSLA++;
          } else {
            data[priority].outsideSLA++;
          }
        } else {
          // Para requests em andamento, calcular tempo decorrido até hoje
          const daysElapsed = differenceInDays(new Date(), opened);
          
          if (daysElapsed <= threshold) {
            data[priority].withinSLA++;
          } else {
            data[priority].outsideSLA++;
          }
        }
      } catch (error) {
        data[priority].outsideSLA++;
      }
    });

    // Calculate derived metrics
    Object.values(data).forEach(item => {
      item.completionRate = item.total > 0 ? (item.completedCount / item.total) * 100 : 0;
      item.avgResolutionDays = item.completedCount > 0 ? item.totalResolutionDays / item.completedCount : 0;
    });

    return data;
  }, [requests, startDate, endDate]);

  const overallStats = useMemo(() => {
    const total = Object.values(slaData).reduce((sum, item) => sum + item.total, 0);
    const withinSLA = Object.values(slaData).reduce((sum, item) => sum + item.withinSLA, 0);
    const outsideSLA = Object.values(slaData).reduce((sum, item) => sum + item.outsideSLA, 0);
    const completedCount = Object.values(slaData).reduce((sum, item) => sum + item.completedCount, 0);
    
    return {
      total,
      withinSLA,
      outsideSLA,
      slaComplianceRate: total > 0 ? (withinSLA / total) * 100 : 0,
      completionRate: total > 0 ? (completedCount / total) * 100 : 0
    };
  }, [slaData]);

  const pieChartData = useMemo(() => {
    return [
      { name: 'Dentro do SLA', value: overallStats.withinSLA, color: CHART_COLORS.withinSLA },
      { name: 'Fora do SLA', value: overallStats.outsideSLA, color: CHART_COLORS.outsideSLA }
    ];
  }, [overallStats]);

  const barChartData = useMemo(() => {
    return Object.entries(slaData).map(([key, value]) => ({
      name: value.priority,
      withinSLA: value.withinSLA,
      outsideSLA: value.outsideSLA,
      total: value.total,
      slaComplianceRate: value.total > 0 ? (value.withinSLA / value.total) * 100 : 0
    }));
  }, [slaData]);

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
          {payload[0]?.payload?.total && (
            <div className="pt-2 mt-2 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total</span>
                <span className="text-white font-bold">{payload[0].payload.total}</span>
              </div>
              {payload[0]?.payload?.slaComplianceRate !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Taxa de SLA</span>
                  <span className={`font-bold ${
                    payload[0].payload.slaComplianceRate >= 90 ? 'text-green-400' :
                    payload[0].payload.slaComplianceRate >= 75 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {payload[0].payload.slaComplianceRate.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Análise de SLA - Requests</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      {/* SLA Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1C2333] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm text-gray-400">SLA Global</h3>
          </div>
          <p className={`text-2xl font-bold ${
            overallStats.slaComplianceRate >= 90 ? 'text-green-400' :
            overallStats.slaComplianceRate >= 75 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {overallStats.slaComplianceRate.toFixed(1)}%
          </p>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <h3 className="text-sm text-gray-400">Dentro do SLA</h3>
          </div>
          <p className="text-2xl font-bold text-green-400">{overallStats.withinSLA}</p>
          <p className="text-sm text-gray-400 mt-1">
            {((overallStats.withinSLA / overallStats.total) * 100).toFixed(1)}% do total
          </p>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-sm text-gray-400">Fora do SLA</h3>
          </div>
          <p className="text-2xl font-bold text-red-400">{overallStats.outsideSLA}</p>
          <p className="text-sm text-gray-400 mt-1">
            {((overallStats.outsideSLA / overallStats.total) * 100).toFixed(1)}% do total
          </p>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm text-gray-400">Taxa de Conclusão</h3>
          </div>
          <p className={`text-2xl font-bold ${
            overallStats.completionRate >= 80 ? 'text-green-400' :
            overallStats.completionRate >= 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {overallStats.completionRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* SLA Compliance Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1C2333] p-4 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Distribuição de SLA</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">SLA por Prioridade</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
                <YAxis tick={{ fill: '#9CA3AF' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="withinSLA"
                  name="Dentro do SLA"
                  fill={CHART_COLORS.withinSLA}
                  stackId="a"
                />
                <Bar
                  dataKey="outsideSLA"
                  name="Fora do SLA"
                  fill={CHART_COLORS.outsideSLA}
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SLA Details by Priority */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Detalhes por Prioridade</h3>
        <div className="space-y-4">
          {Object.entries(slaData).map(([key, data]) => (
            <div
              key={key}
              className="bg-[#151B2B] p-4 rounded-lg"
              style={{ borderLeft: `4px solid ${CHART_COLORS[key as keyof typeof CHART_COLORS]}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-medium text-white">{data.priority}</h4>
                  <p className="text-sm text-gray-400">
                    SLA: {REQUEST_SLA_THRESHOLDS[key as keyof typeof REQUEST_SLA_THRESHOLDS]} dias
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{data.total}</p>
                  <p className="text-sm text-gray-400">solicitações</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-[#1C2333] p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <p className="text-sm text-gray-400">Dentro do SLA</p>
                  </div>
                  <p className="text-xl font-bold text-green-400">{data.withinSLA}</p>
                  <p className="text-xs text-gray-400">
                    {data.total > 0 ? ((data.withinSLA / data.total) * 100).toFixed(1) : '0'}%
                  </p>
                </div>

                <div className="bg-[#1C2333] p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <p className="text-sm text-gray-400">Fora do SLA</p>
                  </div>
                  <p className="text-xl font-bold text-red-400">{data.outsideSLA}</p>
                  <p className="text-xs text-gray-400">
                    {data.total > 0 ? ((data.outsideSLA / data.total) * 100).toFixed(1) : '0'}%
                  </p>
                </div>

                <div className="bg-[#1C2333] p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <p className="text-sm text-gray-400">Tempo Médio</p>
                  </div>
                  <p className="text-xl font-bold text-blue-400">
                    {data.avgResolutionDays.toFixed(1)} dias
                  </p>
                  <p className="text-xs text-gray-400">
                    {data.completedCount} concluídos
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Taxa de Conclusão</span>
                  <span className={`font-medium ${
                    data.completionRate >= 80 ? 'text-green-400' :
                    data.completionRate >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {data.completionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      data.completionRate >= 80 ? 'bg-green-500' :
                      data.completionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${data.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}