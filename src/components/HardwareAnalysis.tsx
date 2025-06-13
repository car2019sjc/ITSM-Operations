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
  Cell,
  Sector
} from 'recharts';
import { X, AlertTriangle, ExternalLink } from 'lucide-react';
import { Incident } from '../types/incident';
import { parseISO, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IncidentDetails } from './IncidentDetails';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';

interface HardwareAnalysisProps {
  incidents: Incident[];
  onClose?: () => void;
  startDate?: string;
  endDate?: string;
}

interface IncidentModalProps {
  incidents: Incident[];
  name: string;
  onClose: () => void;
}

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

const HARDWARE_KEYWORDS = [
  'hardware',
  'equipamento',
  'computador',
  'desktop',
  'notebook',
  'laptop',
  'impressora',
  'printer',
  'monitor',
  'teclado',
  'keyboard',
  'mouse',
  'scanner',
  'servidor',
  'server',
  'workstation',
  'estação',
  'hd',
  'ssd',
  'memória',
  'memory',
  'ram',
  'processador',
  'cpu',
  'placa',
  'board',
  'bateria',
  'battery',
  'carregador',
  'charger',
  'cabo',
  'cable',
  'rede',
  'network',
  'wifi',
  'wireless',
  'ethernet'
];

function IncidentModal({ incidents, name, onClose }: IncidentModalProps) {
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
              Chamados em Aberto - {name}
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

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value
  } = props;

  return (
    <g>
      <text x={cx} y={cy - 20} dy={8} textAnchor="middle" fill="#fff" className="text-base font-medium">
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} dy={8} textAnchor="middle" fill="#fff" className="text-sm">
        {value} incidentes críticos
      </text>
      <text x={cx} y={cy + 30} dy={8} textAnchor="middle" fill="#fff" className="text-xs">
        {`${(percent * 100).toFixed(1)}% do total`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        fill={fill}
      />
    </g>
  );
};

export function HardwareAnalysis({ incidents, onClose, startDate, endDate }: HardwareAnalysisProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIncidents, setSelectedIncidents] = useState<Incident[] | null>(null);
  const [selectedSystemName, setSelectedSystemName] = useState<string>('');

  const hardwareData = useMemo(() => {
    const filteredIncidents = incidents.filter(incident => {
      const isHardware = HARDWARE_KEYWORDS.some(keyword => {
        const category = (incident.Category || '').toLowerCase();
        const subcategory = (incident.Subcategory || '').toLowerCase();
        const description = (incident.ShortDescription || '').toLowerCase();
        
        return category.includes(keyword) || 
               subcategory.includes(keyword) || 
               description.includes(keyword);
      });

      if (!isHardware) return false;

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

    const groupedData = filteredIncidents.reduce((acc, incident) => {
      const key = incident.Subcategory || incident.Category || 'Não especificado';
      
      if (!acc[key]) {
        acc[key] = {
          total: 0,
          P1: 0,
          P2: 0,
          P3: 0,
          P4: 0,
          'Não definido': 0,
          openCritical: 0
        };
      }

      acc[key].total++;

      const priority = normalizePriority(incident.Priority);
      acc[key][priority]++;

      if ((priority === 'P1' || priority === 'P2') && getIncidentState(incident.State) !== 'Fechado') {
        acc[key].openCritical++;
      }
      
      return acc;
    }, {} as Record<string, { 
      total: number; 
      P1: number; 
      P2: number; 
      P3: number; 
      P4: number; 
      'Não definido': number;
      openCritical: number;
    }>);

    return Object.entries(groupedData)
      .map(([name, data]) => ({
        name,
        ...data
      }))
      .sort((a, b) => b.total - a.total);
  }, [incidents, startDate, endDate]);

  const impactAnalysis = useMemo(() => {
    return hardwareData
      .map(item => ({
        name: item.name,
        value: item.P1 + item.P2,
        total: item.total,
        openCritical: item.openCritical
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [hardwareData]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const showIncidentsForSystem = (systemName: string) => {
    const openIncidents = incidents.filter(incident => {
      const matchesSystem = (
        incident.Category === systemName || 
        incident.Subcategory === systemName ||
        (incident.ShortDescription?.toLowerCase().includes(systemName.toLowerCase()) &&
         HARDWARE_KEYWORDS.some(keyword => 
           incident.ShortDescription?.toLowerCase().includes(keyword)
         ))
      );
      
      const priority = normalizePriority(incident.Priority);
      const isOpen = getIncidentState(incident.State) !== 'Fechado';
      
      return matchesSystem && (priority === 'P1' || priority === 'P2') && isOpen;
    });

    if (openIncidents.length > 0) {
      setSelectedIncidents(openIncidents);
      setSelectedSystemName(systemName);
    }
  };

  if (hardwareData.length === 0) {
    return (
      <div className="bg-[#151B2B] p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Análise de Hardware</h2>
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
          <p className="text-gray-400">Nenhum incidente de hardware encontrado no período selecionado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Análise de Hardware</h2>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1C2333] p-4 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Distribuição por Hardware</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hardwareData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fill: '#9CA3AF' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={({ x, y, payload }) => {
                    const system = hardwareData.find(s => s.name === payload.value);
                    const hasOpenCritical = system?.openCritical > 0;
                    return (
                      <text 
                        x={x} 
                        y={y} 
                        dy={4} 
                        textAnchor="end" 
                        fill={hasOpenCritical ? '#FDE047' : '#9CA3AF'}
                        fontWeight={hasOpenCritical ? 'bold' : 'normal'}
                        style={{ cursor: hasOpenCritical ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (hasOpenCritical) {
                            showIncidentsForSystem(payload.value);
                          }
                        }}
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
                  cursor={{ fill: '#374151', opacity: 0.2 }}
                  formatter={(value: number, name: string, props: any) => {
                    const data = props.payload;
                    const total = data.total;
                    const percentage = ((value / total) * 100).toFixed(1);
                    return [`${value} (${percentage}%)`, name];
                  }}
                  label={({ payload }) => `Total: ${payload?.total || 0}`}
                />
                <Legend />
                <Bar dataKey="P1" name="Crítico" fill={CHART_COLORS.P1} stackId="stack" />
                <Bar dataKey="P2" name="Alto" fill={CHART_COLORS.P2} stackId="stack" />
                <Bar dataKey="P3" name="Médio" fill={CHART_COLORS.P3} stackId="stack" />
                <Bar dataKey="P4" name="Baixo" fill={CHART_COLORS.P4} stackId="stack" />
                <Bar dataKey="Não definido" name="Não definido" fill={CHART_COLORS['Não definido']} stackId="stack" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1C2333] p-4 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">
            Sistemas Mais Críticos
            <span className="text-sm text-gray-400 ml-2">(Baseado em P1 + P2)</span>
          </h3>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={impactAnalysis}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={180}
                  onMouseEnter={onPieEnter}
                  onClick={(entry) => {
                    if (entry && entry.openCritical > 0) {
                      showIncidentsForSystem(entry.name);
                    }
                  }}
                  cursor="pointer"
                >
                  {impactAnalysis.map((entry, index) => {
                    const system = hardwareData.find(s => s.name === entry.name);
                    const hasOpenCritical = system?.openCritical > 0;
                    const color = Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length];
                    
                    return (
                      <Cell 
                        key={entry.name}
                        fill={color}
                        stroke={hasOpenCritical ? '#FDE047' : color}
                        strokeWidth={hasOpenCritical ? 3 : 1}
                      />
                    );
                  })}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    const color = Object.values(CHART_COLORS)[impactAnalysis.findIndex(item => item.name === data.name) % Object.values(CHART_COLORS).length];
                    
                    return (
                      <div 
                        className="bg-[#1F2937] p-6 rounded-lg border-2 shadow-xl"
                        style={{ borderColor: color }}
                      >
                        <p className="font-medium text-lg mb-3" style={{ color }}>
                          {data.name}
                        </p>
                        <div className="space-y-2 text-base">
                          <p className="text-white">
                            {data.value} incidentes críticos
                          </p>
                          <p className="text-gray-400">
                            {((data.value / data.total) * 100).toFixed(1)}% do total
                          </p>
                          {data.openCritical > 0 && (
                            <p className="text-yellow-300 font-medium">
                              {data.openCritical} incidentes em aberto
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {impactAnalysis.length > 0 && (
          <div className="lg:col-span-2 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-red-500 font-medium">Hardware que Requer Atenção</h4>
                <div className="mt-2 space-y-1">
                  {impactAnalysis.map(system => (
                    <p key={system.name} className="text-sm">
                      <button 
                        className={`font-medium hover:underline ${
                          system.openCritical > 0 ? 'text-yellow-300 font-bold' : 'text-gray-300'
                        }`}
                        onClick={() => {
                          if (system.openCritical > 0) {
                            showIncidentsForSystem(system.name);
                          }
                        }}
                        disabled={!system.openCritical}
                      >
                        {system.name}
                      </button>
                      <span className="text-red-400 mx-1">•</span>
                      <span>{system.value} incidentes críticos</span>
                      {system.openCritical > 0 && (
                        <span className="text-yellow-300 ml-2">
                          ({system.openCritical} em aberto)
                        </span>
                      )}
                      <span className="text-gray-400 ml-1">
                        ({((system.value / system.total) * 100).toFixed(1)}% do total)
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedIncidents && (
        <IncidentModal
          incidents={selectedIncidents}
          name={selectedSystemName}
          onClose={() => {
            setSelectedIncidents(null);
            setSelectedSystemName('');
          }}
        />
      )}
    </div>
  );
}