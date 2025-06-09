import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  TrendingDown
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
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';

interface MonthlyVariationProps {
  incidents: Incident[];
  requests: Request[];
  startDate: string;
  endDate: string;
  onClose: () => void;
}

interface MonthlyData {
  month: string;
  incidentsTotal: number;
  requestsTotal: number;
  slaPercentage: number;
}

interface MonthComparison {
  currentMonth: string;
  previousMonth: string;
  incidentsChange: number;
  incidentsChangeAbsolute: number;
  requestsChange: number;
  requestsChangeAbsolute: number;
  slaChange: number;
}

export function MonthlyVariation({ incidents, requests, startDate, endDate, onClose }: MonthlyVariationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const months = eachMonthOfInterval({ start, end });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthLabel = format(month, 'MMM/yy', { locale: ptBR });

      // Count incidents for this month
      const monthIncidents = incidents.filter(incident => {
        try {
          const incidentDate = parseISO(incident.Opened);
          return isWithinInterval(incidentDate, { start: monthStart, end: monthEnd });
        } catch (error) {
          return false;
        }
      });

      // Count requests for this month
      const monthRequests = requests.filter(request => {
        try {
          const requestDate = parseISO(request.Opened);
          return isWithinInterval(requestDate, { start: monthStart, end: monthEnd });
        } catch (error) {
          return false;
        }
      });

      // Calculate SLA compliance for incidents
      let withinSLA = 0;
      let totalForSLA = 0;

      monthIncidents.forEach(incident => {
        const priority = normalizePriority(incident.Priority);
        const state = getIncidentState(incident.State);
        
        // Only count closed incidents for SLA
        if (state === 'Fechado') {
          totalForSLA++;
          
          // Check if within SLA based on priority
          const threshold = 
            priority === 'P1' ? 1 :  // 1 hour
            priority === 'P2' ? 4 :  // 4 hours
            priority === 'P3' ? 36 : // 36 hours
            priority === 'P4' ? 72 : // 72 hours
            36; // default
          
          try {
            const opened = parseISO(incident.Opened);
            const closed = incident.Updated ? parseISO(incident.Updated) : new Date();
            const responseHours = (closed.getTime() - opened.getTime()) / (1000 * 60 * 60);
            
            if (responseHours <= threshold) {
              withinSLA++;
            }
          } catch (error) {
            // Skip invalid dates
          }
        }
      });

      // Calculate SLA percentage
      const slaPercentage = totalForSLA > 0 ? (withinSLA / totalForSLA) * 100 : 0;

      return {
        month: monthLabel,
        incidentsTotal: monthIncidents.length,
        requestsTotal: monthRequests.length,
        slaPercentage
      };
    });
  }, [incidents, requests, startDate, endDate]);

  // Calculate month-to-month comparisons
  const monthComparisons = useMemo(() => {
    const comparisons: MonthComparison[] = [];
    
    for (let i = 1; i < monthlyData.length; i++) {
      const currentMonth = monthlyData[i];
      const previousMonth = monthlyData[i-1];
      
      // Calculate percentage changes
      const incidentsChange = previousMonth.incidentsTotal > 0 
        ? ((currentMonth.incidentsTotal - previousMonth.incidentsTotal) / previousMonth.incidentsTotal) * 100 
        : currentMonth.incidentsTotal > 0 ? 100 : 0;
      
      const requestsChange = previousMonth.requestsTotal > 0 
        ? ((currentMonth.requestsTotal - previousMonth.requestsTotal) / previousMonth.requestsTotal) * 100 
        : currentMonth.requestsTotal > 0 ? 100 : 0;
      
      const slaChange = currentMonth.slaPercentage - previousMonth.slaPercentage;
      
      comparisons.push({
        currentMonth: currentMonth.month,
        previousMonth: previousMonth.month,
        incidentsChange,
        incidentsChangeAbsolute: currentMonth.incidentsTotal - previousMonth.incidentsTotal,
        requestsChange,
        requestsChangeAbsolute: currentMonth.requestsTotal - previousMonth.requestsTotal,
        slaChange
      });
    }
    
    return comparisons;
  }, [monthlyData]);

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6 relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
        aria-label="Fechar"
      >
        ×
      </button>
      {monthComparisons.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          Não há dados suficientes para comparação mensal.
        </div>
      ) : (
        monthComparisons.map((comparison, index) => (
          <div key={index} className="bg-[#0F172A] rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4">
              {comparison.currentMonth} em relação a {comparison.previousMonth}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Incidents */}
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
              
              {/* Requests */}
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
                    ? `Aumento de ${comparison.requestsChangeAbsolute} solicitações`
                    : `Redução de ${Math.abs(comparison.requestsChangeAbsolute)} solicitações`}
                </p>
              </div>
              
              {/* SLA */}
              <div className="bg-[#151B2B] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">SLA</span>
                  <div className="flex items-center gap-1">
                    {comparison.slaChange > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    )}
                    <span className={comparison.slaChange > 0 ? 'text-green-400' : 'text-red-400'}>
                      {comparison.slaChange > 0 ? '+' : ''}{comparison.slaChange.toFixed(1)}pp
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  {comparison.slaChange > 0 
                    ? 'Melhoria no SLA'
                    : 'Piora no SLA'}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}