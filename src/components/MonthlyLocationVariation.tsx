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
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<string[]>([]);

  const toggleLocation = (location: string) => {
    setExpandedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  // Get monthly data for each location
  const locationsMonthlyData = React.useMemo(() => {
    try {
      if (!startDate || !endDate) return [];

      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const months = eachMonthOfInterval({ start, end });
      
      if (months.length < 2) return []; // Need at least 2 months for comparison
      
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
      
      // Calculate monthly data for each location
      const locationsData: LocationMonthlyData[] = [];
      
      uniqueLocations.forEach(location => {
        const monthlyComparisons = [];
        
        // For each month (except the first), compare with previous month
        for (let i = 1; i < months.length; i++) {
          const currentMonth = months[i];
          const previousMonth = months[i-1];
          
          const currentMonthStart = startOfMonth(currentMonth);
          const currentMonthEnd = endOfMonth(currentMonth);
          const previousMonthStart = startOfMonth(previousMonth);
          const previousMonthEnd = endOfMonth(previousMonth);
          
          // Current month incidents
          const currentMonthIncidents = incidents.filter(incident => {
            try {
              const incidentDate = parseISO(incident.Opened);
              const assignmentGroup = normalizeLocationName(incident.AssignmentGroup || '');
              return isWithinInterval(incidentDate, { start: currentMonthStart, end: currentMonthEnd }) && 
                     assignmentGroup === location;
            } catch (error) {
              return false;
            }
          }).length;
          
          // Previous month incidents
          const previousMonthIncidents = incidents.filter(incident => {
            try {
              const incidentDate = parseISO(incident.Opened);
              const assignmentGroup = normalizeLocationName(incident.AssignmentGroup || '');
              return isWithinInterval(incidentDate, { start: previousMonthStart, end: previousMonthEnd }) && 
                     assignmentGroup === location;
            } catch (error) {
              return false;
            }
          }).length;
          
          // Current month requests
          const currentMonthRequests = requests.filter(request => {
            try {
              const requestDate = parseISO(request.Opened);
              const assignmentGroup = normalizeLocationName(request.AssignmentGroup || '');
              return isWithinInterval(requestDate, { start: currentMonthStart, end: currentMonthEnd }) && 
                     assignmentGroup === location;
            } catch (error) {
              return false;
            }
          }).length;
          
          // Previous month requests
          const previousMonthRequests = requests.filter(request => {
            try {
              const requestDate = parseISO(request.Opened);
              const assignmentGroup = normalizeLocationName(request.AssignmentGroup || '');
              return isWithinInterval(requestDate, { start: previousMonthStart, end: previousMonthEnd }) && 
                     assignmentGroup === location;
            } catch (error) {
              return false;
            }
          }).length;
          
          // Calculate changes
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
        
        // Only add locations with data
        if (monthlyComparisons.some(m => 
          m.current.incidents > 0 || m.current.requests > 0 || 
          m.previous.incidents > 0 || m.previous.requests > 0
        )) {
          locationsData.push({
            location,
            months: monthlyComparisons
          });
        }
      });
      
      // Sort locations by total volume
      return locationsData.sort((a, b) => {
        const totalA = a.months.reduce((sum, m) => sum + m.current.incidents + m.current.requests, 0);
        const totalB = b.months.reduce((sum, m) => sum + m.current.incidents + m.current.requests, 0);
        return totalB - totalA;
      }).slice(0, 5); // Limit to top 5 locations
    } catch (error) {
      console.error("Error calculating monthly location data:", error);
      return [];
    }
  }, [incidents, requests, startDate, endDate]);

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6 relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
        aria-label="Fechar"
      >
        ×
      </button>
      {locationsMonthlyData.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          Não há dados suficientes para comparação mensal por localidade.
        </div>
      ) : (
        locationsMonthlyData.map(locationData => (
          <div key={locationData.location} className="bg-[#0F172A] rounded-lg overflow-hidden">
            {/* Location Header */}
            <div 
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleLocation(locationData.location)}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-medium text-white">{locationData.location}</h3>
              </div>
              {expandedLocations.includes(locationData.location) ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>

            {/* Monthly Comparisons */}
            {expandedLocations.includes(locationData.location) && (
              <div className="border-t border-gray-800 divide-y divide-gray-800">
                {locationData.months.map((monthData, index) => (
                  <div key={index} className="p-4">
                    <h4 className="text-white font-medium mb-3">
                      {monthData.current.month} em relação a {monthData.previous.month}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Incidents */}
                      <div className="bg-[#151B2B] p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-300">Incidentes</span>
                          <div className="flex items-center gap-1">
                            {monthData.incidentsChange > 0 ? (
                              <TrendingUp className="h-4 w-4 text-red-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-green-400" />
                            )}
                            <span className={monthData.incidentsChange > 0 ? 'text-red-400' : 'text-green-400'}>
                              {monthData.incidentsChange > 0 ? '+' : ''}{monthData.incidentsChange.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400">
                          {monthData.incidentsChangeAbsolute > 0 
                            ? `Aumento de ${monthData.incidentsChangeAbsolute} chamados`
                            : `Redução de ${Math.abs(monthData.incidentsChangeAbsolute)} chamados`}
                        </p>
                      </div>
                      
                      {/* Requests */}
                      <div className="bg-[#151B2B] p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-300">Requisições</span>
                          <div className="flex items-center gap-1">
                            {monthData.requestsChange > 0 ? (
                              <TrendingUp className="h-4 w-4 text-red-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-green-400" />
                            )}
                            <span className={monthData.requestsChange > 0 ? 'text-red-400' : 'text-green-400'}>
                              {monthData.requestsChange > 0 ? '+' : ''}{monthData.requestsChange.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400">
                          {monthData.requestsChangeAbsolute > 0 
                            ? `Aumento de ${monthData.requestsChangeAbsolute} solicitações`
                            : `Redução de ${Math.abs(monthData.requestsChangeAbsolute)} solicitações`}
                        </p>
                      </div>
                      
                      {/* Total */}
                      <div className="bg-[#151B2B] p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-300">Total</span>
                          <div className="flex items-center gap-1">
                            {monthData.totalChange > 0 ? (
                              <TrendingUp className="h-4 w-4 text-red-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-green-400" />
                            )}
                            <span className={monthData.totalChange > 0 ? 'text-red-400' : 'text-green-400'}>
                              {monthData.totalChange > 0 ? '+' : ''}{monthData.totalChange.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                          <div>
                            <span className="text-white">{monthData.current.month}:</span> {monthData.current.incidents + monthData.current.requests}
                          </div>
                          <div>
                            <span className="text-white">{monthData.previous.month}:</span> {monthData.previous.incidents + monthData.previous.requests}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}