import React, { useMemo } from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { Request } from '../types/request';
import { normalizeRequestPriority, normalizeRequestStatus } from '../types/request';
import { normalizeLocationName } from '../utils/locationUtils';
import { parseISO, isWithinInterval } from 'date-fns';

interface RequestTopLocationCardsProps {
  requests: Request[];
  onLocationClick?: (location: string) => void;
  startDate?: string;
  endDate?: string;
}

export function RequestTopLocationCards({ requests, onLocationClick, startDate, endDate }: RequestTopLocationCardsProps) {
  // Filter requests by date range and group by location
  const locationData = useMemo(() => {
    // First filter requests by date range if provided
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
    
    // Then group by location
    return filteredRequests.reduce((acc, request) => {
      const location = normalizeLocationName(request.AssignmentGroup) || 'Não especificado';
      
      if (!acc[location]) {
        acc[location] = {
          name: location,
          total: 0,
          highPriority: 0,
          inProgress: 0,
          users: new Set<string>()
        };
      }
      
      acc[location].total++;
      
      // Use the correct field for user identification
      if (request["Request item [Catalog Task] Requested for Name"]) {
        acc[location].users.add(request["Request item [Catalog Task] Requested for Name"]);
      } else if (request.RequestedForName) {
        acc[location].users.add(request.RequestedForName);
      }
      
      const priority = normalizeRequestPriority(request.Priority);
      if (priority === 'HIGH') acc[location].highPriority++;
      
      const status = normalizeRequestStatus(request.State);
      if (status === 'IN_PROGRESS') acc[location].inProgress++;
      
      return acc;
    }, {} as Record<string, {
      name: string;
      total: number;
      highPriority: number;
      inProgress: number;
      users: Set<string>;
    }>);
  }, [requests, startDate, endDate]);
  
  // Get top 5 locations by total requests
  const topLocations = useMemo(() => {
    return Object.values(locationData)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [locationData]);
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-white mb-4">Top 5 por Localidade</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {topLocations.map(location => (
          <div 
            key={location.name}
            className="bg-[#151B2B] p-4 rounded-lg cursor-pointer hover:bg-[#1C2333] transition-colors"
            onClick={() => onLocationClick?.(location.name)}
          >
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-emerald-400" />
              <h4 className="text-white font-medium truncate">{location.name}</h4>
            </div>
            <p className="text-2xl font-bold text-white mb-2">{location.total}</p>
            <p className="text-sm text-gray-400 mb-1">
              {location.users.size} usuários ativos
            </p>
            {location.highPriority > 0 && (
              <div className="flex items-center gap-1 text-sm text-yellow-300">
                <AlertTriangle className="h-4 w-4" />
                <span>Alta prioridade: {location.highPriority}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}