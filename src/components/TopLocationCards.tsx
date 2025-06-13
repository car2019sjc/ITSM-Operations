import React from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { Incident } from '../types/incident';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';
import { normalizeLocationName } from '../utils/locationUtils';

interface TopLocationCardsProps {
  incidents: Incident[];
  onLocationClick?: (location: string) => void;
}

export function TopLocationCards({ incidents, onLocationClick }: TopLocationCardsProps) {
  // Group incidents by location (using AssignmentGroup)
  const locationData = incidents.reduce((acc, incident) => {
    const location = normalizeLocationName(incident.AssignmentGroup) || 'Não especificado';
    
    if (!acc[location]) {
      acc[location] = {
        name: location,
        total: 0,
        P1: 0,
        P2: 0,
        openCritical: 0,
        users: new Set<string>()
      };
    }
    
    acc[location].total++;
    
    if (incident.Caller) {
      acc[location].users.add(incident.Caller);
    }
    
    const priority = normalizePriority(incident.Priority);
    if (priority === 'P1') acc[location].P1++;
    if (priority === 'P2') acc[location].P2++;
    
    if ((priority === 'P1' || priority === 'P2') && getIncidentState(incident.State) !== 'Fechado') {
      acc[location].openCritical++;
    }
    
    return acc;
  }, {} as Record<string, {
    name: string;
    total: number;
    P1: number;
    P2: number;
    openCritical: number;
    users: Set<string>;
  }>);
  
  // Get top 5 locations by total incidents
  const topLocations = Object.values(locationData)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  
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
              <MapPin className="h-5 w-5 text-indigo-400" />
              <h4 className="text-white font-medium truncate">{location.name}</h4>
            </div>
            <p className="text-2xl font-bold text-white mb-2">{location.total}</p>
            <p className="text-sm text-gray-400 mb-1">
              {location.users.size} usuários ativos
            </p>
            {location.openCritical > 0 && (
              <div className="flex items-center gap-1 text-sm text-yellow-300">
                <AlertTriangle className="h-4 w-4" />
                <span>Críticos (P1/P2): {location.openCritical}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}