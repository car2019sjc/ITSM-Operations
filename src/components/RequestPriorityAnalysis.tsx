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
  CheckCircle2,
  AlertCircle,
  Users
} from 'lucide-react';
import { Request, REQUEST_PRIORITIES, REQUEST_STATUSES, normalizeRequestPriority, normalizeRequestStatus } from '../types/request';
import { parseISO, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RequestPriorityAnalysisProps {
  requests: Request[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

const CHART_COLORS = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B', 
  LOW: '#10B981'
};

export function RequestPriorityAnalysis({ requests, onClose, startDate, endDate }: RequestPriorityAnalysisProps) {
  const [selectedPriority, setSelectedPriority] = useState<keyof typeof REQUEST_PRIORITIES | null>(null);

  const priorityData = useMemo(() => {
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
      const status = normalizeRequestStatus(request.State);
      
      if (!acc[priority]) {
        acc[priority] = {
          priority,
          total: 0,
          NEW: 0,
          IN_PROGRESS: 0,
          COMPLETED: 0,
          CANCELLED: 0,
          groups: new Set<string>()
        };
      }

      acc[priority].total++;
      acc[priority][status]++;

      if (request.AssignmentGroup) {
        acc[priority].groups.add(request.AssignmentGroup);
      }

      return acc;
    }, {} as Record<string, {
      priority: string;
      total: number;
      NEW: number;
      IN_PROGRESS: number;
      COMPLETED: number;
      CANCELLED: number;
      groups: Set<string>;
    }>);

    return Object.values(data);
  }, [requests, startDate, endDate]);

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
        <h2 className="text-xl font-semibold text-white">Análise por Prioridade</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {priorityData.map(data => (
          <div 
            key={data.priority}
            className="bg-[#1C2333] p-4 rounded-lg"
            style={{ borderLeft: `4px solid ${CHART_COLORS[data.priority as keyof typeof CHART_COLORS]}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium" style={{ color: CHART_COLORS[data.priority as keyof typeof CHART_COLORS] }}>
                {REQUEST_PRIORITIES[data.priority as keyof typeof REQUEST_PRIORITIES]}
              </h3>
              <span className="text-2xl font-bold text-white">{data.total}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400">Novos</span>
                </div>
                <span className="text-white">{data.NEW}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  <span className="text-indigo-400">Em Andamento</span>
                </div>
                <span className="text-white">{data.IN_PROGRESS}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-green-400">Concluídos</span>
                </div>
                <span className="text-white">{data.COMPLETED}</span>
              </div>

              <div className="pt-2 mt-2 border-t border-gray-700">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400">
                    {data.groups.size} grupos atribuídos
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1C2333] p-4 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Distribuição por Status</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={priorityData}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="priority"
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
                dataKey="NEW" 
                name="Novos" 
                fill="#3B82F6" 
                stackId="stack"
              />
              <Bar 
                dataKey="IN_PROGRESS" 
                name="Em Andamento" 
                fill="#6366F1" 
                stackId="stack"
              />
              <Bar 
                dataKey="COMPLETED" 
                name="Concluídos" 
                fill="#10B981" 
                stackId="stack"
              />
              <Bar 
                dataKey="CANCELLED" 
                name="Cancelados" 
                fill="#6B7280" 
                stackId="stack"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}