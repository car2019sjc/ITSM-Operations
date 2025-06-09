import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Incident } from '../types/incident';
import { Request } from '../types/request';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeLocationName } from '../utils/locationUtils';

interface LocationDetailChartProps {
  location: string;
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

export function LocationDetailChart({ location, incidents, requests, startDate, endDate, onClose }: LocationDetailChartProps) {
  const monthlyData = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const months = eachMonthOfInterval({ start, end });
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthLabel = format(month, 'MMM/yy', { locale: ptBR });
      const incidentsTotal = incidents.filter(incident => {
        try {
          const incidentDate = parseISO(incident.Opened);
          const loc = normalizeLocationName(incident.AssignmentGroup || '');
          return isWithinInterval(incidentDate, { start: monthStart, end: monthEnd }) && loc === location;
        } catch {
          return false;
        }
      }).length;
      const requestsTotal = requests.filter(request => {
        try {
          const requestDate = parseISO(request.Opened);
          const loc = normalizeLocationName(request.AssignmentGroup || '');
          return isWithinInterval(requestDate, { start: monthStart, end: monthEnd }) && loc === location;
        } catch {
          return false;
        }
      }).length;
      return { month: monthLabel, incidentsTotal, requestsTotal };
    });
  }, [incidents, requests, startDate, endDate, location]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#151B2B] rounded-lg p-8 max-w-2xl w-full relative shadow-2xl border border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
          aria-label="Fechar"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-white mb-6">{location}</h2>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
              <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="incidentsTotal" name="Incidentes" fill={CHART_COLORS.incidents} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="incidentsTotal" position="top" fill="#9CA3AF" fontSize={12} />
              </Bar>
              <Bar dataKey="requestsTotal" name="Requisições" fill={CHART_COLORS.requests} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="requestsTotal" position="top" fill="#9CA3AF" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
} 