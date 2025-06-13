import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  TrendingDown,
  MapPin
} from 'lucide-react';
import { Incident } from '../types/incident';
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

interface MonthlyLocationVariationProps {
  incidents: Incident[];
  requests: Request[];
  startDate: string;
  endDate: string;
  onClose: () => void;
}

interface LocationMonthlyData {
  location: string;
  months: {
    current: {
      month: string;
      incidents: number;
      requests: number;
    };
    previous: {
      month: string;
      incidents: number;
      requests: number;
    };
    incidentsChange: number;
    incidentsChangeAbsolute: number;
    requestsChange: number;
    requestsChangeAbsolute: number;
    totalChange: number;
  }[];
}

export function MonthlyLocationVariation({ incidents, requests, startDate, endDate, onClose }: MonthlyLocationVariationProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Obter todas as localidades únicas
  const uniqueLocations = React.useMemo(() => {
    const locs = new Set<string>();
      incidents.forEach(incident => {
        const location = normalizeLocationName(incident.AssignmentGroup || '');
      if (location) locs.add(location);
      });
      requests.forEach(request => {
        const location = normalizeLocationName(request.AssignmentGroup || '');
      if (location) locs.add(location);
      });
    return Array.from(locs).sort();
  }, [incidents, requests]);

  // Ao clicar na localidade, mostrar loading antes de processar
  const handleSelectLocation = (location: string) => {
    setLoading(true);
    setTimeout(() => {
      setSelectedLocation(location);
      setLoading(false);
    }, 300); // Simula processamento, ajuste se necessário
  };

  // Processar dados apenas da localidade selecionada
  const locationMonthlyData = React.useMemo(() => {
    if (!selectedLocation || !startDate || !endDate) return null;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const months = eachMonthOfInterval({ start, end });
    if (months.length < 2) return null;
        const monthlyComparisons = [];
        for (let i = 1; i < months.length; i++) {
          const currentMonth = months[i];
          const previousMonth = months[i-1];
          const currentMonthStart = startOfMonth(currentMonth);
          const currentMonthEnd = endOfMonth(currentMonth);
          const previousMonthStart = startOfMonth(previousMonth);
          const previousMonthEnd = endOfMonth(previousMonth);
      // Incidentes
          const currentMonthIncidents = incidents.filter(incident => {
            try {
              const incidentDate = parseISO(incident.Opened);
              const assignmentGroup = normalizeLocationName(incident.AssignmentGroup || '');
          return isWithinInterval(incidentDate, { start: currentMonthStart, end: currentMonthEnd }) && assignmentGroup === selectedLocation;
        } catch {
              return false;
            }
          }).length;
          const previousMonthIncidents = incidents.filter(incident => {
            try {
              const incidentDate = parseISO(incident.Opened);
              const assignmentGroup = normalizeLocationName(incident.AssignmentGroup || '');
          return isWithinInterval(incidentDate, { start: previousMonthStart, end: previousMonthEnd }) && assignmentGroup === selectedLocation;
        } catch {
              return false;
            }
          }).length;
      // Requisições
          const currentMonthRequests = requests.filter(request => {
            try {
              const requestDate = parseISO(request.Opened);
              const assignmentGroup = normalizeLocationName(request.AssignmentGroup || '');
          return isWithinInterval(requestDate, { start: currentMonthStart, end: currentMonthEnd }) && assignmentGroup === selectedLocation;
        } catch {
              return false;
            }
          }).length;
          const previousMonthRequests = requests.filter(request => {
            try {
              const requestDate = parseISO(request.Opened);
              const assignmentGroup = normalizeLocationName(request.AssignmentGroup || '');
          return isWithinInterval(requestDate, { start: previousMonthStart, end: previousMonthEnd }) && assignmentGroup === selectedLocation;
        } catch {
              return false;
            }
          }).length;
      // Cálculo das variações
          const incidentsChange = previousMonthIncidents > 0 
            ? ((currentMonthIncidents - previousMonthIncidents) / previousMonthIncidents) * 100 
            : currentMonthIncidents > 0 ? 100 : 0;
          const requestsChange = previousMonthRequests > 0 
            ? ((currentMonthRequests - previousMonthRequests) / previousMonthRequests) * 100 
            : currentMonthRequests > 0 ? 100 : 0;
          const totalCurrent = currentMonthIncidents + currentMonthRequests;
          const totalPrevious = previousMonthIncidents + previousMonthRequests;
          const totalChange = totalPrevious > 0 
            ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 
            : totalCurrent > 0 ? 100 : 0;
          monthlyComparisons.push({
            current: {
              month: format(currentMonth, 'MMM/yy', { locale: ptBR }),
              incidents: currentMonthIncidents,
              requests: currentMonthRequests
            },
            previous: {
              month: format(previousMonth, 'MMM/yy', { locale: ptBR }),
              incidents: previousMonthIncidents,
              requests: previousMonthRequests
            },
            incidentsChange,
            incidentsChangeAbsolute: currentMonthIncidents - previousMonthIncidents,
            requestsChange,
            requestsChangeAbsolute: currentMonthRequests - previousMonthRequests,
            totalChange
          });
        }
    return monthlyComparisons;
  }, [selectedLocation, incidents, requests, startDate, endDate]);

  // Exibir apenas comparações com dados reais
  const locationMonthlyDataFiltered = locationMonthlyData ? locationMonthlyData.filter(cmp =>
    cmp.current.incidents !== 0 || cmp.current.requests !== 0 ||
    cmp.previous.incidents !== 0 || cmp.previous.requests !== 0
  ) : [];

  if (loading) {
    return (
      <div className="bg-[#151B2B] p-6 rounded-lg space-y-6 relative flex items-center justify-center min-h-[200px]">
        <span className="text-white text-lg font-medium">Processando dados, aguarde...</span>
      </div>
    );
    }

  if (!selectedLocation) {
    // Exibe lista de localidades
  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6 relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
        aria-label="Fechar"
      >
        ×
      </button>
        <h2 className="text-xl font-semibold text-white mb-4">Variação Mensal por Localidade</h2>
        <div className="space-y-4">
          {uniqueLocations.map(location => (
            <div
              key={location}
              className="bg-[#1C2333] p-4 rounded-lg flex items-center cursor-pointer hover:bg-[#232B3E]"
              onClick={() => handleSelectLocation(location)}
            >
              <MapPin className="h-5 w-5 text-blue-400 mr-2" />
              <span className="text-white font-medium">{location}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Exibe variação mensal da localidade selecionada
  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6 relative">
      <button
        onClick={() => setSelectedLocation(null)}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
        aria-label="Voltar"
      >
        ×
      </button>
      <h2 className="text-xl font-semibold text-white mb-4">{selectedLocation}</h2>
      {locationMonthlyDataFiltered.length > 0 ? (
        locationMonthlyDataFiltered.map((comparison, index) => (
          <div key={index} className="bg-[#0F172A] rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-white mb-4">
              {comparison.current.month} em relação a {comparison.previous.month}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Incidentes */}
              <div className="bg-[#151B2B] p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-300">Incidentes</span>
                          <div className="flex items-center gap-1">
                    {comparison.incidentsChange > 0 ? (
                              <TrendingUp className="h-4 w-4 text-red-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-green-400" />
                            )}
                    <span className={comparison.incidentsChange > 0 ? 'text-red-400' : 'text-green-400'}>
                      {comparison.incidentsChange > 0 ? '+' : ''}{comparison.incidentsChange.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400">
                  {comparison.incidentsChangeAbsolute > 0 
                    ? `Aumento de ${comparison.incidentsChangeAbsolute} chamados`
                    : `Redução de ${Math.abs(comparison.incidentsChangeAbsolute)} chamados`}
                        </p>
                      </div>
              {/* Requisições */}
              <div className="bg-[#151B2B] p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-300">Requisições</span>
                          <div className="flex items-center gap-1">
                    {comparison.requestsChange > 0 ? (
                              <TrendingUp className="h-4 w-4 text-red-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-green-400" />
                            )}
                    <span className={comparison.requestsChange > 0 ? 'text-red-400' : 'text-green-400'}>
                      {comparison.requestsChange > 0 ? '+' : ''}{comparison.requestsChange.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400">
                  {comparison.requestsChangeAbsolute > 0 
                    ? `Aumento de ${comparison.requestsChangeAbsolute} chamados`
                    : `Redução de ${Math.abs(comparison.requestsChangeAbsolute)} chamados`}
                        </p>
                      </div>
                      {/* Total */}
              <div className="bg-[#151B2B] p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-300">Total</span>
                          <div className="flex items-center gap-1">
                    {comparison.totalChange > 0 ? (
                              <TrendingUp className="h-4 w-4 text-red-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-green-400" />
                            )}
                    <span className={comparison.totalChange > 0 ? 'text-red-400' : 'text-green-400'}>
                      {comparison.totalChange > 0 ? '+' : ''}{comparison.totalChange.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                <p className="text-sm text-gray-400">
                  {comparison.totalChange > 0 
                    ? `Aumento de ${Math.round(comparison.totalChange)} chamados`
                    : `Redução de ${Math.abs(Math.round(comparison.totalChange))} chamados`}
                </p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-4 text-gray-400">
          Não há dados suficientes para comparação mensal nesta localidade.
        </div>
      )}
    </div>
  );
}