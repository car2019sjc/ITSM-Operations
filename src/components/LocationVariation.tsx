import React, { useState, useMemo } from 'react';
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
  isWithinInterval,
  subMonths,
  subDays,
  addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeLocationName } from '../utils/locationUtils';
import { LocationAIAgent } from './LocationAIAgent';

interface LocationVariationProps {
  incidents: Incident[];
  requests: Request[];
  startDate: string;
  endDate: string;
}

interface LocationData {
  name: string;
  currentIncidents: number;
  previousIncidents: number;
  currentRequests: number;
  previousRequests: number;
  currentSLA: number;
  previousSLA: number;
  incidentsChange: number;
  requestsChange: number;
  slaChange: number;
  totalChange: number;
}

export function LocationVariation({ incidents, requests, startDate, endDate }: LocationVariationProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Calculate SLA for a specific date range and location
  const calculateSLAForDateRange = (incidentsData: Incident[], start: Date, end: Date, locationName: string) => {
    let withinSLA = 0;
    let totalForSLA = 0;
    
    const rangeIncidents = incidentsData.filter(incident => {
      try {
        const incidentDate = parseISO(incident.Opened);
        const assignmentGroup = normalizeLocationName(incident.AssignmentGroup || '');
        return isWithinInterval(incidentDate, { start, end }) && 
               assignmentGroup === locationName;
      } catch (error) {
        return false;
      }
    });
    
    rangeIncidents.forEach(incident => {
      const state = incident.State?.toLowerCase() || '';
      
      // Only count closed incidents for SLA
      if (state.includes('closed') || state.includes('resolved')) {
        totalForSLA++;
        
        // Check if within SLA based on priority
        const priority = incident.Priority?.toLowerCase() || '';
        const threshold = 
          priority.includes('p1') || priority.includes('1') ? 1 :  // 1 hour
          priority.includes('p2') || priority.includes('2') ? 4 :  // 4 hours
          priority.includes('p3') || priority.includes('3') ? 36 : // 36 hours
          priority.includes('p4') || priority.includes('4') ? 72 : // 72 hours
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
    
    return totalForSLA > 0 ? (withinSLA / totalForSLA) * 100 : 0;
  };

  const locationsData = useMemo(() => {
    try {
      // Parse dates
      const currentEnd = parseISO(endDate);
      const currentStart = parseISO(startDate);
      
      // Calculate previous period with same duration
      const periodDuration = currentEnd.getTime() - currentStart.getTime();
      const previousEnd = subDays(currentStart, 1); // 1 day before current start
      const previousStart = subDays(previousEnd, Math.floor(periodDuration / (1000 * 60 * 60 * 24))); // Same number of days
      
      // Get unique locations from incidents and requests
      const uniqueLocations = new Set<string>();
      
      incidents.forEach(incident => {
        const location = normalizeLocationName(incident.AssignmentGroup || '');
        if (location) uniqueLocations.add(location);
      });
      
      requests.forEach(request => {
        const location = normalizeLocationName(request.AssignmentGroup || '');
        if (location) uniqueLocations.add(location);
      });
      
      // Calculate data for each location
      return Array.from(uniqueLocations).map(location => {
        // Current period incidents
        const currentIncidents = incidents.filter(incident => {
          try {
            const incidentDate = parseISO(incident.Opened);
            const assignmentGroup = normalizeLocationName(incident.AssignmentGroup || '');
            return isWithinInterval(incidentDate, { start: currentStart, end: currentEnd }) && 
                   assignmentGroup === location;
          } catch (error) {
            return false;
          }
        }).length;
        
        // Previous period incidents
        const previousIncidents = incidents.filter(incident => {
          try {
            const incidentDate = parseISO(incident.Opened);
            const assignmentGroup = normalizeLocationName(incident.AssignmentGroup || '');
            return isWithinInterval(incidentDate, { start: previousStart, end: previousEnd }) && 
                   assignmentGroup === location;
          } catch (error) {
            return false;
          }
        }).length;
        
        // Current period requests
        const currentRequests = requests.filter(request => {
          try {
            const requestDate = parseISO(request.Opened);
            const assignmentGroup = normalizeLocationName(request.AssignmentGroup || '');
            return isWithinInterval(requestDate, { start: currentStart, end: currentEnd }) && 
                   assignmentGroup === location;
          } catch (error) {
            return false;
          }
        }).length;
        
        // Previous period requests
        const previousRequests = requests.filter(request => {
          try {
            const requestDate = parseISO(request.Opened);
            const assignmentGroup = normalizeLocationName(request.AssignmentGroup || '');
            return isWithinInterval(requestDate, { start: previousStart, end: previousEnd }) && 
                   assignmentGroup === location;
          } catch (error) {
            return false;
          }
        }).length;
        
        // Calculate SLA for current period
        const currentSLA = calculateSLAForDateRange(incidents, currentStart, currentEnd, location);
        
        // Calculate SLA for previous period
        const previousSLA = calculateSLAForDateRange(incidents, previousStart, previousEnd, location);
        
        // Calculate changes
        const incidentsChange = previousIncidents > 0 
          ? ((currentIncidents - previousIncidents) / previousIncidents) * 100 
          : currentIncidents > 0 ? 100 : 0;
        
        const requestsChange = previousRequests > 0 
          ? ((currentRequests - previousRequests) / previousRequests) * 100 
          : currentRequests > 0 ? 100 : 0;
        
        const slaChange = currentSLA - previousSLA;
        
        const totalCurrent = currentIncidents + currentRequests;
        const totalPrevious = previousIncidents + previousRequests;
        
        const totalChange = totalPrevious > 0 
          ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 
          : totalCurrent > 0 ? 100 : 0;
        
        return {
          name: location,
          currentIncidents,
          previousIncidents,
          currentRequests,
          previousRequests,
          currentSLA,
          previousSLA,
          incidentsChange,
          requestsChange,
          slaChange,
          totalChange
        };
      }).sort((a, b) => {
        // Sort by total volume (incidents + requests) in current period
        const totalA = a.currentIncidents + a.currentRequests;
        const totalB = b.currentIncidents + b.currentRequests;
        return totalB - totalA;
      });
    } catch (error) {
      console.error("Error calculating location data:", error);
      return [];
    }
  }, [incidents, requests, startDate, endDate]);

  // Format dates for display
  const formatPeriod = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };

  const currentPeriodStart = formatPeriod(startDate);
  const currentPeriodEnd = formatPeriod(endDate);

  // Calculate previous period dates
  const previousPeriodDates = useMemo(() => {
    try {
      const currentEnd = parseISO(endDate);
      const currentStart = parseISO(startDate);
      
      // Calculate previous period with same duration
      const periodDuration = currentEnd.getTime() - currentStart.getTime();
      const previousEnd = subDays(currentStart, 1); // 1 day before current start
      const previousStart = subDays(previousEnd, Math.floor(periodDuration / (1000 * 60 * 60 * 24))); // Same number of days
      
      return {
        start: format(previousStart, 'dd/MM/yyyy', { locale: ptBR }),
        end: format(previousEnd, 'dd/MM/yyyy', { locale: ptBR })
      };
    } catch (error) {
      return { start: '', end: '' };
    }
  }, [startDate, endDate]);

  return (
    <div className="p-4 space-y-4">
      {/* Period Information */}
      <div className="bg-[#0F172A] p-3 rounded-lg">
        <div className="text-sm text-gray-400">
          <span className="font-medium text-white">Período atual:</span> {currentPeriodStart} - {currentPeriodEnd}
        </div>
      </div>

      {locationsData.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          Não há dados suficientes para comparação por localidade.
        </div>
      ) : (
        locationsData.map(location => (
          <div key={location.name} className="bg-[#0F172A] rounded-lg overflow-hidden">
            {/* Location Header */}
            <div className="p-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-medium text-white">{location.name}</h3>
            </div>

            {/* Comparison Rows */}
            <div className="border-t border-gray-800">
              {/* Current vs Previous Period */}
              <div className="p-4 border-b border-gray-800">
                <div className="text-sm text-gray-400 mb-2">
                  Comparação com período anterior
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Incidents */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Incidentes</span>
                    <div className="flex items-center gap-1">
                      {location.incidentsChange > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-400" />
                      )}
                      <span className={location.incidentsChange > 0 ? 'text-red-400' : 'text-green-400'}>
                        {location.incidentsChange > 0 ? '+' : ''}{location.incidentsChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Requests */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Requisições</span>
                    <div className="flex items-center gap-1">
                      {location.requestsChange > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-400" />
                      )}
                      <span className={location.requestsChange > 0 ? 'text-red-400' : 'text-green-400'}>
                        {location.requestsChange > 0 ? '+' : ''}{location.requestsChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* SLA */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">SLA</span>
                    <div className="flex items-center gap-1">
                      {location.slaChange > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <span className={location.slaChange > 0 ? 'text-green-400' : 'text-red-400'}>
                        {location.slaChange > 0 ? '+' : ''}{location.slaChange.toFixed(1)}pp
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Additional details */}
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="text-xs text-gray-400">
                    {location.incidentsChange > 0 
                      ? `Aumento de ${location.currentIncidents - location.previousIncidents} chamados`
                      : `Redução de ${location.previousIncidents - location.currentIncidents} chamados`}
                  </div>
                  <div className="text-xs text-gray-400">
                    {location.requestsChange > 0 
                      ? `Aumento de ${location.currentRequests - location.previousRequests} solicitações`
                      : `Redução de ${location.previousRequests - location.currentRequests} solicitações`}
                  </div>
                  <div className="text-xs text-gray-400">
                    {location.slaChange > 0 
                      ? 'Melhoria no SLA'
                      : 'Piora no SLA'}
                  </div>
                </div>
              </div>
              
              {/* Next Period Projection */}
              <div className="p-4">
                <div className="text-sm text-gray-400 mb-2">
                  Projeção para o próximo período
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Incidents */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Incidentes</span>
                    <div className="flex items-center gap-1">
                      {location.incidentsChange > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-400" />
                      )}
                      <span className={location.incidentsChange > 0 ? 'text-red-400' : 'text-green-400'}>
                        {location.incidentsChange > 0 ? '+' : ''}{location.incidentsChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Requests */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Requisições</span>
                    <div className="flex items-center gap-1">
                      {location.requestsChange > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-400" />
                      )}
                      <span className={location.requestsChange > 0 ? 'text-red-400' : 'text-green-400'}>
                        {location.requestsChange > 0 ? '+' : ''}{location.requestsChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Total */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Total</span>
                    <div className="flex items-center gap-1">
                      {location.totalChange > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-400" />
                      )}
                      <span className={location.totalChange > 0 ? 'text-red-400' : 'text-green-400'}>
                        {location.totalChange > 0 ? '+' : ''}{location.totalChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI Analysis */}
            {selectedLocation === location.name && (
              <div className="border-t border-gray-800 p-4">
                <LocationAIAgent 
                  location={location.name}
                  incidents={incidents}
                  requests={requests}
                  startDate={startDate}
                  endDate={endDate}
                />
              </div>
            )}
            
            {/* View Details Button */}
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={() => setSelectedLocation(selectedLocation === location.name ? null : location.name)}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {selectedLocation === location.name ? 'Ocultar análise detalhada' : 'Ver análise detalhada'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}