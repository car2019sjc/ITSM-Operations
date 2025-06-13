import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { X, AlertTriangle, ExternalLink, Filter, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import type { Incident } from '../types/incident';
import { parseISO, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IncidentDetails } from './IncidentDetails';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';
import { MonthlyIncidentsChart } from './MonthlyIncidentsChart';
import { IncidentModal } from './IncidentModal';

/**
 * Componente UserAnalysis
 *
 * Exibe a análise dos chamados agrupados por usuário (antigo 'Associado'), incluindo:
 * - Distribuição por prioridade (P1, P2, P3, P4, Não definido)
 * - Top 5 usuários com mais chamados
 * - Tabela detalhada com totais, percentuais e alertas de críticos
 *
 * Localização: Dashboard > Indicadores Operacionais > Análise por Usuários
 *
 * Para alterar textos, lógica de agrupamento ou visualização, edite este componente.
 */

interface UserAnalysisProps {
  incidents: Incident[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

interface UserData {
  name: string;
  P1: number;
  P2: number;
  P3: number;
  P4: number;
  'Não definido': number;
  total: number;
  openIncidents: number;
  criticalPending: number;
  states: {
    Aberto: number;
    'Em Andamento': number;
    Fechado: number;
  };
  percentage: string;
}

const STATUS_OPTIONS = [
  { 
    value: '', 
    label: 'Todos os Estados',
    icon: Filter,
    color: 'text-gray-400'
  },
  { 
    value: 'Aberto', 
    label: 'Em Aberto',
    icon: AlertCircle,
    color: 'text-yellow-400'
  },
  { 
    value: 'Em Andamento', 
    label: 'Em Andamento',
    icon: Clock,
    color: 'text-blue-400'
  },
  { 
    value: 'Fechado', 
    label: 'Fechados',
    icon: CheckCircle2,
    color: 'text-green-400'
  }
];

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#F97316',
  P3: '#EAB308',
  P4: '#22C55E',
  'Não definido': '#6B7280'
} as const;

type PriorityKey = keyof typeof CHART_COLORS;
type StateKey = 'Aberto' | 'Em Andamento' | 'Fechado';

export function UserAnalysis({ incidents, onClose, startDate, endDate }: UserAnalysisProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const userData = useMemo(() => {
    const filteredIncidents = incidents.filter(incident => {
      if (!startDate || !endDate) return true;
      
      try {
        const incidentDate = parseISO(incident.Opened);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        return isWithinInterval(incidentDate, { start, end });
      } catch (error) {
        return false;
      }
    });

    const data: Record<string, UserData> = {};

    filteredIncidents.forEach(incident => {
      const caller = incident.Caller?.trim() || 'Não identificado';
      const priority = normalizePriority(incident.Priority) as PriorityKey;
      const state = getIncidentState(incident.State) as StateKey;
      
      if (!data[caller]) {
        data[caller] = {
          name: caller,
          total: 0,
          P1: 0,
          P2: 0,
          P3: 0,
          P4: 0,
          'Não definido': 0,
          openIncidents: 0,
          criticalPending: 0,
          states: {
            Aberto: 0,
            'Em Andamento': 0,
            Fechado: 0
          },
          percentage: '0'
        };
      }

      data[caller].total++;
      data[caller][priority]++;
      data[caller].states[state]++;

      if (state !== 'Fechado') {
        data[caller].openIncidents++;
        if (priority === 'P1' || priority === 'P2') {
          data[caller].criticalPending++;
        }
      }
    });

    const totalIncidents = Object.values(data).reduce((sum, user) => sum + user.total, 0);

    return Object.values(data)
      .map(user => ({
        ...user,
        percentage: ((user.total / totalIncidents) * 100).toFixed(1)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  }, [incidents, startDate, endDate]);

  const handleUserClick = (user: string) => {
    setSelectedUser(user);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
  };

  const selectedUserIncidents = selectedUser
    ? incidents.filter(incident => incident.Caller === selectedUser)
    : [];

  const chartData = useMemo(() => {
    return userData.slice(0, 5).map(user => ({
      name: user.name,
      P1: user.P1,
      P2: user.P2,
      P3: user.P3,
      P4: user.P4,
      'Não definido': user['Não definido'],
      total: user.total
    }));
  }, [userData]);

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Análise por Usuários</h2>
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

      {/* Priority Distribution Chart */}
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Distribuição por Prioridade - Top 5 Usuários</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1C2333',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff'
                }}
              />
              <Legend />
              <Bar dataKey="P1" name="P1" stackId="a" fill={CHART_COLORS.P1} />
              <Bar dataKey="P2" name="P2" stackId="a" fill={CHART_COLORS.P2} />
              <Bar dataKey="P3" name="P3" stackId="a" fill={CHART_COLORS.P3} />
              <Bar dataKey="P4" name="P4" stackId="a" fill={CHART_COLORS.P4} />
              <Bar dataKey="Não definido" name="Não definido" stackId="a" fill={CHART_COLORS['Não definido']} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-[#1C2333] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#151B2B]">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-400">Usuário</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">P1</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">P2</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">P3</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">P4</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-400">Total</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-400">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {userData.map((user) => (
              <tr 
                key={user.name}
                className="hover:bg-[#151B2B] transition-colors cursor-pointer"
                onClick={() => handleUserClick(user.name)}
              >
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={user.criticalPending > 0 ? 'text-yellow-300' : 'text-white'}>
                      {user.name}
                    </span>
                    {user.criticalPending > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 rounded-full">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        <span className="text-xs font-medium text-red-500">
                          {user.criticalPending} críticos
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  <span style={{ color: CHART_COLORS.P1 }}>{user.P1}</span>
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  <span style={{ color: CHART_COLORS.P2 }}>{user.P2}</span>
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  <span style={{ color: CHART_COLORS.P3 }}>{user.P3}</span>
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  <span style={{ color: CHART_COLORS.P4 }}>{user.P4}</span>
                </td>
                <td className="px-6 py-4 text-sm text-right text-white">{user.total}</td>
                <td className="px-6 py-4 text-sm text-right text-white">{user.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <IncidentModal
          incidents={selectedUserIncidents}
          user={selectedUser}
          onClose={handleCloseModal}
          startDate={startDate || ''}
          endDate={endDate || ''}
        />
      )}
    </div>
  );
}