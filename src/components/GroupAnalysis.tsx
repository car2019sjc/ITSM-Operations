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
import { X, AlertTriangle, ExternalLink } from 'lucide-react';
import { Incident } from '../types/incident';
import { parseISO, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IncidentDetails } from './IncidentDetails';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';
import { normalizeLocationName } from '../utils/locationUtils';

interface GroupAnalysisProps {
  incidents: Incident[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

interface IncidentModalProps {
  incidents: Incident[];
  group: string;
  onClose: () => void;
}

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

function IncidentModal({ incidents, group, onClose }: IncidentModalProps) {
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
              Chamados em Aberto - {group}
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Solicitante</th>
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
                  <td className="px-4 py-3 text-sm text-gray-300">{incident.Caller}</td>
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

export function GroupAnalysis({ incidents, onClose, startDate, endDate }: GroupAnalysisProps) {
  const [selectedIncidents, setSelectedIncidents] = useState<Incident[] | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string>('');

  const groupData = useMemo(() => {
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

    const data = filteredIncidents.reduce((acc, incident) => {
      const group = normalizeLocationName(incident.AssignmentGroup) || 'Não atribuído';
      
      if (!acc[group]) {
        acc[group] = {
          name: group,
          total: 0,
          P1: 0,
          P2: 0,
          P3: 0,
          P4: 0,
          undefined: 0,
          openCritical: 0,
          assignedTo: new Set<string>()
        };
      }

      acc[group].total++;

      if (incident.AssignedTo) {
        acc[group].assignedTo.add(incident.AssignedTo);
      }

      const priority = normalizePriority(incident.Priority);
      acc[group][priority]++;

      if ((priority === 'P1' || priority === 'P2') && getIncidentState(incident.State) !== 'Fechado') {
        acc[group].openCritical++;
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
      assignedTo: Set<string>;
    }>);

    return Object.values(data)
      .map(group => ({
        ...group,
        assignedCount: group.assignedTo.size
      }))
      .sort((a, b) => b.total - a.total);
  }, [incidents, startDate, endDate]);

  const showIncidentsForGroup = (groupName: string) => {
    const group = groupData.find(g => g.name === groupName);
    
    if (!group || !group.openCritical) return;

    const openIncidents = incidents.filter(incident => {
      const matchesGroup = normalizeLocationName(incident.AssignmentGroup) === groupName;
      const priority = normalizePriority(incident.Priority);
      const isOpen = getIncidentState(incident.State) !== 'Fechado';
      
      return matchesGroup && (priority === 'P1' || priority === 'P2') && isOpen;
    });

    if (openIncidents.length > 0) {
      setSelectedIncidents(openIncidents);
      setSelectedGroupName(groupName);
    }
  };

  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value, height } = props;
    if (!value) return null;

    return (
      <text
        x={x + width + 5}
        y={y + height / 2}
        fill="#9CA3AF"
        textAnchor="start"
        dominantBaseline="central"
        fontSize={12}
      >
        {value}
      </text>
    );
  };

  if (groupData.length === 0) {
    return (
      <div className="bg-[#151B2B] p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Análise por Grupo</h2>
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
          <p className="text-gray-400">Nenhum incidente encontrado no período selecionado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Análise por Grupo</h2>
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

      <div className="bg-[#1C2333] p-4 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Distribuição por Grupo</h3>
        <div className="h-[600px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={groupData}
              layout="vertical"
              margin={{ top: 5, right: 50, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tick={{ fill: '#9CA3AF' }} />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={({ x, y, payload }) => {
                  const group = groupData.find(g => g.name === payload.value);
                  const hasOpenCritical = group?.openCritical > 0;
                  return (
                    <text 
                      x={x} 
                      y={y} 
                      dy={4} 
                      textAnchor="end" 
                      fill={hasOpenCritical ? '#FDE047' : '#9CA3AF'}
                      fontWeight={hasOpenCritical ? 'bold' : 'normal'}
                    >
                      {payload.value}
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
                formatter={(value: number, name: string, props: any) => {
                  const data = props.payload;
                  const total = data.total;
                  const percentage = ((value / total) * 100).toFixed(1);
                  return [`${value} (${percentage}%)`, name];
                }}
                label={({ payload }) => `Total: ${payload?.total || 0}`}
              />
              <Legend />
              <Bar 
                dataKey="P1" 
                name="Crítico" 
                fill={CHART_COLORS.P1} 
                stackId="stack"
              >
                <LabelList 
                  dataKey="total"
                  content={renderCustomBarLabel}
                  position="right"
                />
              </Bar>
              <Bar dataKey="P2" name="Alto" fill={CHART_COLORS.P2} stackId="stack" />
              <Bar dataKey="P3" name="Médio" fill={CHART_COLORS.P3} stackId="stack" />
              <Bar dataKey="P4" name="Baixo" fill={CHART_COLORS.P4} stackId="stack" />
              <Bar dataKey="undefined" name="Não definido" fill={CHART_COLORS.undefined} stackId="stack" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {groupData.some(group => group.openCritical > 0) && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-red-500 font-medium">Grupos que Requerem Atenção</h4>
              <div className="mt-2 space-y-1">
                {groupData
                  .filter(group => group.openCritical > 0)
                  .map(group => (
                    <p key={group.name} className="text-sm">
                      <button 
                        className="font-medium text-yellow-300 font-bold hover:underline"
                        onClick={() => showIncidentsForGroup(group.name)}
                      >
                        {group.name}
                      </button>
                      <span className="text-red-400 mx-1">•</span>
                      <span>{group.P1 + group.P2} incidentes críticos</span>
                      <span className="text-yellow-300 ml-2">
                        ({group.openCritical} em aberto)
                      </span>
                      <span className="text-gray-400 ml-1">
                        ({((group.P1 + group.P2) / group.total * 100).toFixed(1)}% do total)
                      </span>
                      <span className="text-gray-400 ml-2">
                        • {group.assignedCount} técnicos
                      </span>
                    </p>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedIncidents && (
        <IncidentModal
          incidents={selectedIncidents}
          group={selectedGroupName}
          onClose={() => {
            setSelectedIncidents(null);
            setSelectedGroupName('');
          }}
        />
      )}
    </div>
  );
}