import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Incident } from '../types/incident';
import { Request } from '../types/request';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { normalizeLocationName } from '../utils/locationUtils';
import { LocationDetailChart } from './LocationDetailChart';

interface LocationDistributionProps {
  incidents: Incident[];
  requests: Request[];
  startDate: string;
  endDate: string;
  onClose: () => void;
}

const CHART_COLORS = {
  incidents: '#F59E42',
  requests: '#3B82F6'
};

export function LocationDistribution({ incidents, requests, startDate, endDate, onClose }: LocationDistributionProps) {
  const [selectedLocation, setSelectedLocation] = React.useState<string | null>(null);

  // ===================== DOCUMENTAÇÃO DO COMPONENTE =====================
  // LocationDistribution
  //
  // - Cards-resumo: mostram totais gerais de incidentes, requisições, SLA global e proporção, sempre baseados em todos os dados do período selecionado.
  // - Gráfico de barras: exibe apenas as top 5 localidades (maior volume de incidentes + requisições) para visualização limpa.
  //   Para alterar a quantidade de localidades exibidas no gráfico, ajuste o slice(0, 5) no data do BarChart.
  // - Cards de localidades: exibem todas as localidades, ordenadas do maior para o menor volume.
  //   Ao clicar em um card, abre um modal com gráfico detalhado mensal daquela localidade.
  // - Títulos: personalizáveis acima do gráfico e dos cards.
  // - Para manutenção: mantenha a lógica de totais gerais separada da lógica de top localidades.
  // - Para adicionar filtros, busca ou paginação, implemente acima dos cards de localidades.
  // =====================================================================

  // Agrupa por localidade
  const data = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const locationMap: Record<string, { incidents: number; requests: number }> = {};
    incidents.forEach(incident => {
      try {
        const incidentDate = parseISO(incident.Opened);
        if (!isWithinInterval(incidentDate, { start, end })) return;
        const location = normalizeLocationName(incident.AssignmentGroup || 'Não especificado');
        if (!locationMap[location]) locationMap[location] = { incidents: 0, requests: 0 };
        locationMap[location].incidents++;
      } catch {}
    });
    requests.forEach(request => {
      try {
        const requestDate = parseISO(request.Opened);
        if (!isWithinInterval(requestDate, { start, end })) return;
        const location = normalizeLocationName(request.AssignmentGroup || 'Não especificado');
        if (!locationMap[location]) locationMap[location] = { incidents: 0, requests: 0 };
        locationMap[location].requests++;
      } catch {}
    });
    // Ordena por total decrescente e exibe todas as localidades
    return Object.entries(locationMap)
      .map(([location, { incidents, requests }]) => ({ location, incidents, requests }))
      .sort((a, b) => (b.incidents + b.requests) - (a.incidents + a.requests));
  }, [incidents, requests, startDate, endDate]);

  // Totais gerais (todas as localidades)
  const allIncidents = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return incidents.filter(incident => {
      try {
        const incidentDate = parseISO(incident.Opened);
        return isWithinInterval(incidentDate, { start, end });
      } catch { return false; }
    }).length;
  }, [incidents, startDate, endDate]);

  const allRequests = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return requests.filter(request => {
      try {
        const requestDate = parseISO(request.Opened);
        return isWithinInterval(requestDate, { start, end });
      } catch { return false; }
    }).length;
  }, [requests, startDate, endDate]);

  const allTotal = allIncidents + allRequests;
  const allIncidentsPercent = allTotal > 0 ? (allIncidents / allTotal) * 100 : 0;
  const allRequestsPercent = allTotal > 0 ? (allRequests / allTotal) * 100 : 0;

  // Período atual
  const totalIncidents = data.reduce((sum, l) => sum + l.incidents, 0);
  const totalRequests = data.reduce((sum, l) => sum + l.requests, 0);
  const totalAll = totalIncidents + totalRequests;
  const incidentsPercent = totalAll > 0 ? (totalIncidents / totalAll) * 100 : 0;
  const requestsPercent = totalAll > 0 ? (totalRequests / totalAll) * 100 : 0;

  // Período do ano anterior
  const prevStart = useMemo(() => {
    const s = parseISO(startDate);
    return new Date(s.getFullYear() - 1, s.getMonth(), s.getDate());
  }, [startDate]);
  const prevEnd = useMemo(() => {
    const e = parseISO(endDate);
    return new Date(e.getFullYear() - 1, e.getMonth(), e.getDate());
  }, [endDate]);

  const prevIncidents = useMemo(() => {
    return incidents.filter(incident => {
      try {
        const d = parseISO(incident.Opened);
        return isWithinInterval(d, { start: prevStart, end: prevEnd });
      } catch { return false; }
    }).length;
  }, [incidents, prevStart, prevEnd]);
  const prevRequests = useMemo(() => {
    return requests.filter(request => {
      try {
        const d = parseISO(request.Opened);
        return isWithinInterval(d, { start: prevStart, end: prevEnd });
      } catch { return false; }
    }).length;
  }, [requests, prevStart, prevEnd]);

  // Variação percentual
  const incidentsVar = prevIncidents > 0 ? ((totalIncidents - prevIncidents) / prevIncidents) * 100 : 0;
  const requestsVar = prevRequests > 0 ? ((totalRequests - prevRequests) / prevRequests) * 100 : 0;

  // SLA Global (simples: % incidentes fechados dentro do SLA)
  const sla = useMemo(() => {
    let withinSLA = 0, total = 0;
    incidents.forEach(incident => {
      try {
        const d = parseISO(incident.Opened);
        if (!isWithinInterval(d, { start: parseISO(startDate), end: parseISO(endDate) })) return;
        if (incident.State && incident.State.toLowerCase().includes('fechado')) {
          total++;
          // Simples: SLA 36h para todos
          const opened = parseISO(incident.Opened);
          const closed = incident.Updated ? parseISO(incident.Updated) : new Date();
          const hours = (closed.getTime() - opened.getTime()) / (1000 * 60 * 60);
          if (hours <= 36) withinSLA++;
        }
      } catch {}
    });
    return total > 0 ? (withinSLA / total) * 100 : 0;
  }, [incidents, startDate, endDate]);

  // SLA do ano anterior
  const slaPrev = useMemo(() => {
    let withinSLA = 0, total = 0;
    incidents.forEach(incident => {
      try {
        const d = parseISO(incident.Opened);
        if (!isWithinInterval(d, { start: prevStart, end: prevEnd })) return;
        if (incident.State && incident.State.toLowerCase().includes('fechado')) {
          total++;
          const opened = parseISO(incident.Opened);
          const closed = incident.Updated ? parseISO(incident.Updated) : new Date();
          const hours = (closed.getTime() - opened.getTime()) / (1000 * 60 * 60);
          if (hours <= 36) withinSLA++;
        }
      } catch {}
    });
    return total > 0 ? (withinSLA / total) * 100 : 0;
  }, [incidents, prevStart, prevEnd]);
  const slaVar = slaPrev > 0 ? sla - slaPrev : 0;

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6 relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
        aria-label="Fechar"
      >
        ×
      </button>
      {/* Cards-resumo corrigidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total de Incidentes */}
        <div className="bg-[#1E233B] rounded-lg p-6 flex flex-col">
          <span className="text-gray-400 mb-1">Total de Incidentes</span>
          <span className="text-3xl font-bold text-white">{allIncidents}</span>
          <span className="text-green-400 text-sm mt-2">{incidentsVar.toFixed(1)}% vs Ano Anterior</span>
        </div>
        {/* Total de Requests */}
        <div className="bg-[#1E233B] rounded-lg p-6 flex flex-col">
          <span className="text-gray-400 mb-1">Total de Requests</span>
          <span className="text-3xl font-bold text-white">{allRequests}</span>
          <span className="text-green-400 text-sm mt-2">{requestsVar.toFixed(1)}% vs Ano Anterior</span>
        </div>
        {/* SLA Global */}
        <div className="bg-[#1E233B] rounded-lg p-6 flex flex-col">
          <span className="text-gray-400 mb-1">SLA Global</span>
          <span className={`text-3xl font-bold ${sla < 80 ? 'text-red-400' : 'text-green-400'}`}>{sla.toFixed(1)}%</span>
          <div className="w-full h-2 bg-gray-700 rounded mt-2 mb-1">
            <div className={`h-2 rounded ${sla < 80 ? 'bg-red-400' : 'bg-green-400'}`} style={{ width: `${sla}%` }}></div>
          </div>
          <span className={`text-sm ${slaVar >= 0 ? 'text-green-400' : 'text-red-400'}`}>{slaVar >= 0 ? '↑' : '↓'} {slaVar.toFixed(1)}pp vs Ano Anterior</span>
        </div>
        {/* Proporção */}
        <div className="bg-[#1E233B] rounded-lg p-6 flex flex-col">
          <span className="text-gray-400 mb-1">Proporção</span>
          <span className="text-3xl font-bold text-white">{allTotal}</span>
          <span className="text-sm text-gray-400 mt-2">{allIncidentsPercent.toFixed(0)}% incidentes • {allRequestsPercent.toFixed(0)}% requests</span>
        </div>
      </div>
      <h2 className="text-xl font-semibold text-white mb-4">Distribuição por Localidade Top 5</h2>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 5).reverse()} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
            <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis dataKey="location" type="category" tick={{ fill: '#9CA3AF', fontSize: 12 }} width={150} />
            <Tooltip />
            <Legend />
            <Bar dataKey="incidents" name="Incidentes" fill={CHART_COLORS.incidents} barSize={24} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="incidents" position="right" fill="#9CA3AF" fontSize={12} />
            </Bar>
            <Bar dataKey="requests" name="Requisições" fill={CHART_COLORS.requests} barSize={24} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="requests" position="right" fill="#9CA3AF" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2 mt-8">Distribuição Geral dos Incidentes e Requisições por Localidades</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
        {data.map((l, idx) => (
          <div
            key={l.location}
            className={`rounded-lg p-4 bg-[#1E233B] border-2 ${idx === 0 ? 'border-indigo-500' : 'border-transparent'} cursor-pointer transition hover:border-indigo-400`}
            onClick={() => setSelectedLocation(l.location)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: idx === 0 ? '#6366F1' : '#64748B' }}></span>
              <span className="text-lg font-bold text-white">{l.location}</span>
              <span className="ml-auto text-2xl font-bold text-white">{l.incidents + l.requests}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Incidentes: <span className="text-amber-400 font-bold">{l.incidents}</span> ({totalIncidents > 0 ? ((l.incidents / totalIncidents) * 100).toFixed(1) : 0}%)</span>
              <span>Requests: <span className="text-blue-400 font-bold">{l.requests}</span> ({totalRequests > 0 ? ((l.requests / totalRequests) * 100).toFixed(1) : 0}%)</span>
            </div>
          </div>
        ))}
      </div>
      {selectedLocation && (
        <LocationDetailChart
          location={selectedLocation}
          incidents={incidents}
          requests={requests}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </div>
  );
} 