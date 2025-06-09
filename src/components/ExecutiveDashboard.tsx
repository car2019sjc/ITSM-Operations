import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  LabelList,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  X, 
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  BarChart2,
  LineChartIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
  MapPin,
  PieChart as PieChartIcon
} from 'lucide-react';
import { Incident } from '../types/incident';
import { Request } from '../types/request';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval,
  eachDayOfInterval,
  isWithinInterval,
  subMonths,
  isSameMonth,
  isSameDay,
  addMonths,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  differenceInMonths,
  startOfYear
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';
import { normalizeRequestPriority, normalizeRequestStatus } from '../types/request';
import { normalizeLocationName } from '../utils/locationUtils';
import { MonthlyVariation } from './MonthlyVariation';
import { MonthlyLocationVariation } from './MonthlyLocationVariation';
import { CalendarSelector } from './CalendarSelector';
import { TopIncidentsByStringAssociado } from './TopIncidentsByStringAssociado';
import { DashboardSections } from './DashboardSections';
import { AIPredictiveAnalysis } from './AIPredictiveAnalysis';

interface ExecutiveDashboardProps {
  incidents: Incident[];
  requests: Request[];
  onBack: () => void;
}

const CHART_COLORS = {
  incidents: '#F59E0B', // Yellow
  requests: '#3B82F6', // Blue
  sla: '#F59E0B',
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280',
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#10B981'
};

const LOCATION_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#EF4444'  // red
];

export function ExecutiveDashboard({ incidents, requests, onBack }: ExecutiveDashboardProps) {
  // Definir ano corrente
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(() => `${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(() => `${currentYear}-12-31`);
  const [showCalendar, setShowCalendar] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [locationChartType, setLocationChartType] = useState<'bar' | 'pie'>('bar');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Calculate SLA for a specific date range and location
  const calculateSLAForDateRange = (incidentsData: Incident[], start: Date, end: Date, locationName: string) => {
    let withinSLA = 0;
    let totalForSLA = 0;
    
    const rangeIncidents = incidentsData.filter(incident => {
      try {
        const incidentDate = parseISO(incident.Opened);
        const assignmentGroup = normalizeLocationName(incident.AssignmentGroup || '');
        return isWithinInterval(incidentDate, { start, end }) && 
               (locationName === '' || assignmentGroup === locationName);
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

  // Filter incidents and requests based on selected date range
  const filteredData = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const filteredIncidents = incidents.filter(incident => {
      try {
        const incidentDate = parseISO(incident.Opened);
        return isWithinInterval(incidentDate, { start, end });
      } catch (error) {
        return false;
      }
    });

    const filteredRequests = requests.filter(request => {
      try {
        const requestDate = parseISO(request.Opened);
        return isWithinInterval(requestDate, { start, end });
      } catch (error) {
        return false;
      }
    });

    return { incidents: filteredIncidents, requests: filteredRequests };
  }, [incidents, requests, startDate, endDate]);

  // Monthly data for incidents and requests
  const monthlyData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const months = eachMonthOfInterval({ start, end });

    return months.map((month, index) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthLabel = format(month, 'MMM/yy', { locale: ptBR });

      // Count incidents for this month
      const monthIncidents = filteredData.incidents.filter(incident => {
        try {
          const incidentDate = parseISO(incident.Opened);
          return isWithinInterval(incidentDate, { start: monthStart, end: monthEnd });
        } catch (error) {
          return false;
        }
      });

      // Count requests for this month
      const monthRequests = filteredData.requests.filter(request => {
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

      // Get previous month data for comparison (if not the first month)
      let incidentsPercentChange = 0;
      let requestsPercentChange = 0;
      
      if (index > 0) {
        const prevMonthData = months[index - 1];
        const prevMonthStart = startOfMonth(prevMonthData);
        const prevMonthEnd = endOfMonth(prevMonthData);
        
        // Count previous month incidents
        const prevMonthIncidents = filteredData.incidents.filter(incident => {
          try {
            const incidentDate = parseISO(incident.Opened);
            return isWithinInterval(incidentDate, { start: prevMonthStart, end: prevMonthEnd });
          } catch (error) {
            return false;
          }
        }).length;

        // Count previous month requests
        const prevMonthRequests = filteredData.requests.filter(request => {
          try {
            const requestDate = parseISO(request.Opened);
            return isWithinInterval(requestDate, { start: prevMonthStart, end: prevMonthEnd });
          } catch (error) {
            return false;
          }
        }).length;

        // Calculate percentage changes
        incidentsPercentChange = prevMonthIncidents > 0 
          ? ((monthIncidents.length - prevMonthIncidents) / prevMonthIncidents) * 100 
          : 0;
        
        requestsPercentChange = prevMonthRequests > 0 
          ? ((monthRequests.length - prevMonthRequests) / prevMonthRequests) * 100 
          : 0;
      }

      return {
        month: monthLabel,
        monthDate: month,
        incidentsTotal: monthIncidents.length,
        requestsTotal: monthRequests.length,
        slaPercentage,
        incidentsPercentChange,
        requestsPercentChange
      };
    });
  }, [filteredData, startDate, endDate]);

  // Location distribution data
  const locationData = useMemo(() => {
    // Group by location
    const locationCounts: Record<string, { incidents: number, requests: number }> = {};
    
    // Count incidents by location
    filteredData.incidents.forEach(incident => {
      const location = normalizeLocationName(incident.AssignmentGroup) || 'Não especificado';
      if (!locationCounts[location]) {
        locationCounts[location] = { incidents: 0, requests: 0 };
      }
      locationCounts[location].incidents++;
    });
    
    // Count requests by location
    filteredData.requests.forEach(request => {
      const location = normalizeLocationName(request.AssignmentGroup) || 'Não especificado';
      if (!locationCounts[location]) {
        locationCounts[location] = { incidents: 0, requests: 0 };
      }
      locationCounts[location].requests++;
    });

    // Convert to array and sort by total (incidents + requests)
    return Object.entries(locationCounts)
      .map(([name, counts]) => ({ 
        name, 
        incidents: counts.incidents,
        requests: counts.requests,
        total: counts.incidents + counts.requests
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6); // Top 6 locations
  }, [filteredData.incidents, filteredData.requests]);

  // Get location data for comparison based on the selected date range
  const getLocationComparisonChartData = (location: string) => {
    if (!location) return [];

    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      
      // Get all months in the selected date range
      const months = eachMonthOfInterval({ start, end });
      
      return months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthLabel = format(month, 'MMM/yy', { locale: ptBR });
        
        // Count incidents for this location and month
        const locationIncidents = filteredData.incidents.filter(incident => {
          try {
            const incidentDate = parseISO(incident.Opened);
            const normalizedLocation = normalizeLocationName(incident.AssignmentGroup);
            return normalizedLocation === location && 
                   isWithinInterval(incidentDate, { start: monthStart, end: monthEnd });
          } catch (error) {
            return false;
          }
        }).length;
        
        // Count requests for this location and month
        const locationRequests = filteredData.requests.filter(request => {
          try {
            const requestDate = parseISO(request.Opened);
            const normalizedLocation = normalizeLocationName(request.AssignmentGroup);
            return normalizedLocation === location && 
                   isWithinInterval(requestDate, { start: monthStart, end: monthEnd });
          } catch (error) {
            return false;
          }
        }).length;
        
        return {
          month: monthLabel,
          incidents: locationIncidents,
          requests: locationRequests,
          total: locationIncidents + locationRequests
        };
      });
    } catch (error) {
      console.error("Error generating location comparison data:", error);
      return [];
    }
  };

  // Calculate overall stats
  const overallStats = useMemo(() => {
    // Calculate total incidents and requests
    const totalIncidents = filteredData.incidents.length;
    const totalRequests = filteredData.requests.length;
    const total = totalIncidents + totalRequests;
    
    // Calculate open incidents and requests
    const openIncidents = filteredData.incidents.filter(incident => {
      const state = getIncidentState(incident.State);
      return state !== 'Fechado' && state !== 'Cancelado';
    }).length;
    
    const openRequests = filteredData.requests.filter(request => {
      const status = normalizeRequestStatus(request.State);
      return status !== 'COMPLETED' && status !== 'CANCELLED';
    }).length;
    
    // Calculate critical incidents and high priority requests
    const criticalIncidents = filteredData.incidents.filter(incident => {
      const priority = normalizePriority(incident.Priority);
      const state = getIncidentState(incident.State);
      return (priority === 'P1' || priority === 'P2') && 
             state !== 'Fechado' && 
             state !== 'Cancelado';
    }).length;
    
    const highPriorityRequests = filteredData.requests.filter(request => {
      const priority = normalizeRequestPriority(request.Priority);
      const status = normalizeRequestStatus(request.State);
      return priority === 'HIGH' && 
             status !== 'COMPLETED' && 
             status !== 'CANCELLED';
    }).length;
    
    // Calculate SLA compliance
    let withinSLA = 0;
    let totalForSLA = 0;
    
    filteredData.incidents.forEach(incident => {
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
    
    const slaPercentage = totalForSLA > 0 ? (withinSLA / totalForSLA) * 100 : 0;
    
    // Calculate percentages for the proportion card
    const incidentsPercentage = total > 0 ? (totalIncidents / total) * 100 : 0;
    const requestsPercentage = total > 0 ? (totalRequests / total) * 100 : 0;
    
    // Calculate period-over-period changes
    // Use the same date range but from the previous year
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    // Calculate previous period with same duration but from previous year
    const previousPeriodStart = subDays(start, 365); // 1 year before
    const previousPeriodEnd = subDays(end, 365); // 1 year before
    
    // Previous period incidents and requests
    const previousPeriodIncidents = incidents.filter(incident => {
      try {
        const incidentDate = parseISO(incident.Opened);
        return isWithinInterval(incidentDate, { 
          start: previousPeriodStart, 
          end: previousPeriodEnd
        });
      } catch (error) {
        return false;
      }
    }).length;
    
    const previousPeriodRequests = requests.filter(request => {
      try {
        const requestDate = parseISO(request.Opened);
        return isWithinInterval(requestDate, { 
          start: previousPeriodStart, 
          end: previousPeriodEnd
        });
      } catch (error) {
        return false;
      }
    }).length;
    
    // Calculate percentage changes
    const incidentsChange = previousPeriodIncidents > 0 
      ? ((totalIncidents - previousPeriodIncidents) / previousPeriodIncidents) * 100 
      : 0;
    
    const requestsChange = previousPeriodRequests > 0 
      ? ((totalRequests - previousPeriodRequests) / previousPeriodRequests) * 100 
      : 0;
    
    // Calculate SLA change
    const prevPeriodSLA = calculateSLAForDateRange(
      incidents, 
      previousPeriodStart,
      previousPeriodEnd,
      ''
    );
    
    const slaChange = prevPeriodSLA > 0 
      ? slaPercentage - prevPeriodSLA
      : 0;
    
    return {
      totalIncidents,
      totalRequests,
      total,
      openIncidents,
      openRequests,
      criticalIncidents,
      highPriorityRequests,
      slaPercentage,
      incidentsPercentage,
      requestsPercentage,
      incidentsChange,
      requestsChange,
      slaChange,
      previousPeriodStart: format(previousPeriodStart, 'yyyy-MM-dd'),
      previousPeriodEnd: format(previousPeriodEnd, 'yyyy-MM-dd'),
      previousPeriodIncidents,
      previousPeriodRequests
    };
  }, [filteredData, incidents, requests, startDate, endDate]);

  // Format dates for display
  const formatDateForDisplay = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-[#1F2937] p-4 rounded-lg border border-gray-700 shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="text-white">{entry.value}</span>
            </div>
          ))}
          {payload[0]?.payload?.total && (
            <div className="pt-2 mt-2 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total</span>
                <span className="text-white font-bold">{payload[0].payload.total}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <header className="bg-[#151B2B] py-4 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Voltar</span>
              </button>
              <h1 className="ml-6 text-2xl font-bold text-white">
                Dashboard Executivo
              </h1>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-2 px-3 py-2 bg-[#0B1120] border border-gray-700 rounded-lg text-white hover:bg-gray-700 transition-colors"
              >
                <Calendar className="h-5 w-5 text-gray-400" />
                <span>{formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}</span>
              </button>
              {showCalendar && (
                <CalendarSelector
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  onClose={() => setShowCalendar(false)}
                />
              )}
            </div>
          </div>
        </div>
        {/* Botão de fechar fixo no canto superior direito */}
        <button
          onClick={onBack}
          className="absolute top-4 right-6 text-gray-400 hover:text-red-500 transition-colors text-2xl font-bold z-50"
          title="Fechar Dashboard Executivo"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeSection !== 'executive' ? (
          <DashboardSections
            onSectionClick={setActiveSection}
            activeSection={activeSection || ''}
            onShowPendingIncidents={() => {}}
          />
        ) : (
          <>
            {/* Apenas os gráficos, cards e painéis do dashboard executivo abaixo. Nenhum bloco de seleção de indicadores deve ser renderizado aqui. */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Total Incidents */}
              <div className="bg-[#151B2B] p-6 rounded-lg">
                <h2 className="text-gray-400 text-sm mb-4">Total de Incidentes</h2>
                <p className="text-4xl font-bold text-white mb-2">{overallStats.totalIncidents}</p>
                <p className={`text-sm ${
                  overallStats.incidentsChange <= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {overallStats.incidentsChange === 0 ? '0.0%' : 
                   `${overallStats.incidentsChange <= 0 ? '↓' : '↑'} ${Math.abs(overallStats.incidentsChange).toFixed(1)}%`} vs Ano Anterior
                </p>
              </div>
              {/* Total Requests */}
              <div className="bg-[#151B2B] p-6 rounded-lg">
                <h2 className="text-gray-400 text-sm mb-4">Total de Requests</h2>
                <p className="text-4xl font-bold text-white mb-2">{overallStats.totalRequests}</p>
                <p className={`text-sm ${
                  overallStats.requestsChange <= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {overallStats.requestsChange === 0 ? '0.0%' : 
                   `${overallStats.requestsChange <= 0 ? '↓' : '↑'} ${Math.abs(overallStats.requestsChange).toFixed(1)}%`} vs Ano Anterior
                </p>
              </div>
              {/* SLA Compliance */}
              <div className="bg-[#151B2B] p-6 rounded-lg">
                <h2 className="text-gray-400 text-sm mb-4">SLA Global</h2>
                <p className={`text-4xl font-bold mb-2 ${
                  overallStats.slaPercentage >= 95 ? 'text-green-500' :
                  overallStats.slaPercentage >= 85 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {overallStats.slaPercentage.toFixed(1)}%
                </p>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      overallStats.slaPercentage >= 95 ? 'bg-green-500' :
                      overallStats.slaPercentage >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${overallStats.slaPercentage}%` }}
                  />
                </div>
                <p className={`text-sm mt-2 ${
                  overallStats.slaChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {overallStats.slaChange >= 0 ? '↑' : '↓'} {Math.abs(overallStats.slaChange).toFixed(1)}pp vs Ano Anterior
                </p>
              </div>
              {/* Proportion */}
              <div className="bg-[#151B2B] p-6 rounded-lg">
                <h2 className="text-gray-400 text-sm mb-4">Proporção</h2>
                <p className="text-4xl font-bold text-white mb-2">{overallStats.total}</p>
                <p className="text-sm text-gray-400">
                  {overallStats.incidentsPercentage.toFixed(0)}% incidentes • {overallStats.requestsPercentage.toFixed(0)}% requests
                </p>
              </div>
            </div>
            {/* Variação Mensal */}
            <div className="bg-[#151B2B] rounded-lg overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => toggleSection('monthly-variation')}
              >
                <h2 className="text-xl font-semibold text-white">Variação Mensal</h2>
                {expandedSections.includes('monthly-variation') ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              {expandedSections.includes('monthly-variation') && (
                <MonthlyVariation 
                  incidents={incidents}
                  requests={requests}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}
            </div>
            {/* Variação Mensal por Localidade */}
            <div className="bg-[#151B2B] rounded-lg overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => toggleSection('monthly-location-variation')}
              >
                <h2 className="text-xl font-semibold text-white">Variação Mensal por Localidade</h2>
                {expandedSections.includes('monthly-location-variation') ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              {expandedSections.includes('monthly-location-variation') && (
                <MonthlyLocationVariation
                  incidents={incidents}
                  requests={requests}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}
            </div>
            {/* Volumetria Comparativa */}
            <div className="bg-[#151B2B] p-6 rounded-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Volumetria Comparativa</h2>
                <div className="flex items-center gap-2">
                  <div className="flex bg-[#1C2333] rounded-lg p-1">
                    <button
                      onClick={() => setChartType('bar')}
                      className={`p-2 rounded-lg transition-colors ${
                        chartType === 'bar' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                      title="Gráfico de Barras"
                    >
                      <BarChart2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setChartType('line')}
                      className={`p-2 rounded-lg transition-colors ${
                        chartType === 'line' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                      title="Gráfico de Linha"
                    >
                      <LineChartIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <button
                    onClick={() => toggleSection('volume-comparison')}
                    className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
                  >
                    {expandedSections.includes('volume-comparison') ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              {expandedSections.includes('volume-comparison') && (
                <div className="h-[400px]">
                  {chartType === 'bar' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: '#9CA3AF', fontSize: 12 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar
                          dataKey="incidentsTotal"
                          name="Incidentes"
                          fill={CHART_COLORS.incidents}
                          radius={[4, 4, 0, 0]}
                        >
                          <LabelList
                            dataKey="incidentsTotal"
                            position="top"
                            fill="#9CA3AF"
                            fontSize={12}
                          />
                        </Bar>
                        <Bar
                          dataKey="requestsTotal"
                          name="Requisições"
                          fill={CHART_COLORS.requests}
                          radius={[4, 4, 0, 0]}
                        >
                          <LabelList
                            dataKey="requestsTotal"
                            position="top"
                            fill="#9CA3AF"
                            fontSize={12}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthlyData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: '#9CA3AF', fontSize: 12 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="incidentsTotal"
                          name="Incidentes"
                          stroke={CHART_COLORS.incidents}
                          strokeWidth={2}
                          dot={{ fill: CHART_COLORS.incidents, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="requestsTotal"
                          name="Requisições"
                          stroke={CHART_COLORS.requests}
                          strokeWidth={2}
                          dot={{ fill: CHART_COLORS.requests, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>
            {/* Distribuição por Localidade */}
            <div className="bg-[#151B2B] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Distribuição por Localidade</h2>
                <div className="flex items-center gap-2">
                  <div className="flex bg-[#1C2333] rounded-lg p-1">
                    <button
                      onClick={() => setLocationChartType('bar')}
                      className={`p-2 rounded-lg transition-colors ${
                        locationChartType === 'bar' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                      title="Gráfico de Barras"
                    >
                      <BarChart2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setLocationChartType('pie')}
                      className={`p-2 rounded-lg transition-colors ${
                        locationChartType === 'pie' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                      title="Gráfico de Pizza"
                    >
                      <PieChartIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <button
                    onClick={() => toggleSection('location-distribution')}
                    className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
                  >
                    {expandedSections.includes('location-distribution') ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              {expandedSections.includes('location-distribution') && (
                <div className="space-y-6">
                  {locationData.length > 0 ? (
                    <>
                      {/* Location Chart */}
                      <div className="h-[400px]">
                        {locationChartType === 'bar' ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={locationData}
                              margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                              <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                              <YAxis 
                                dataKey="name" 
                                type="category" 
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                width={100}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Bar
                                dataKey="incidents"
                                name="Incidentes"
                                fill={CHART_COLORS.incidents}
                                stackId="stack"
                              />
                              <Bar
                                dataKey="requests"
                                name="Requisições"
                                fill={CHART_COLORS.requests}
                                stackId="stack"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={locationData}
                                dataKey="total"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={150}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                labelLine={true}
                              >
                                {locationData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={LOCATION_COLORS[index % LOCATION_COLORS.length]} 
                                  />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value: number, name: string, props: any) => {
                                  const data = props.payload;
                                  return [`${value} (${((value / (data.total || 1)) * 100).toFixed(1)}%)`, name];
                                }}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      {/* Location Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {locationData.map((location, index) => (
                          <div 
                            key={location.name}
                            className={`bg-[#1C2333] p-4 rounded-lg cursor-pointer transition-all ${
                              selectedLocation === location.name ? 'ring-2 ring-indigo-500' : ''
                            }`}
                            onClick={() => setSelectedLocation(
                              selectedLocation === location.name ? null : location.name
                            )}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="h-5 w-5" style={{ color: LOCATION_COLORS[index % LOCATION_COLORS.length] }} />
                              <h3 className="text-lg font-medium text-white">{location.name}</h3>
                            </div>
                            <p className="text-2xl font-bold text-white mb-2">{location.total}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-400">Incidentes:</span>
                                <span className="text-yellow-400 ml-2">{location.incidents}</span>
                                <span className="text-gray-400 ml-1">
                                  ({filteredData.incidents.length > 0 
                                    ? ((location.incidents / filteredData.incidents.length) * 100).toFixed(1) 
                                    : "0"}%)
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Requests:</span>
                                <span className="text-blue-400 ml-2">{location.requests}</span>
                                <span className="text-gray-400 ml-1">
                                  ({filteredData.requests.length > 0 
                                    ? ((location.requests / filteredData.requests.length) * 100).toFixed(1) 
                                    : "0"}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400">Nenhuma localidade encontrada no período selecionado.</p>
                    </div>
                  )}

                  {selectedLocation && (
                    <div className="bg-[#1C2333] p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-white mb-4">
                        Tendência: {selectedLocation}
                      </h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={getLocationComparisonChartData(selectedLocation)}
                            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                            <XAxis
                              dataKey="month"
                              tick={{ fill: '#9CA3AF', fontSize: 12 }}
                              interval={0}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar
                              dataKey="incidents"
                              name="Incidentes"
                              fill={CHART_COLORS.incidents}
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="requests"
                              name="Requisições"
                              fill={CHART_COLORS.requests}
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Análise Preditiva - IA */}
            <div className="bg-[#151B2B] rounded-lg overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => toggleSection('ai-predictive')}
              >
                <h2 className="text-xl font-semibold text-white">Análise Preditiva - IA</h2>
                {expandedSections.includes('ai-predictive') ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              {expandedSections.includes('ai-predictive') && (
                <AIPredictiveAnalysis
                  requests={requests}
                  onClose={() => toggleSection('ai-predictive')}
                />
              )}
            </div>
            {/* Resumo do Período */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Período Selecionado */}
              <div className="bg-[#151B2B] p-6 rounded-lg">
                <h2 className="text-gray-400 text-sm mb-4">Período Selecionado</h2>
                <p className="text-xl font-bold text-white mb-2">
                  {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
                </p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Incidentes</span>
                    <span className="text-white">{overallStats.totalIncidents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Requests</span>
                    <span className="text-white">{overallStats.totalRequests}</span>
                  </div>
                </div>
              </div>
              {/* Variação vs Ano Anterior */}
              <div className="bg-[#151B2B] p-6 rounded-lg">
                <h2 className="text-gray-400 text-sm mb-4">Variação vs Ano Anterior</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Incidentes</span>
                      <span className={`font-medium ${
                        overallStats.incidentsChange <= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {overallStats.incidentsChange === 0 ? '0.0%' : 
                         `${overallStats.incidentsChange <= 0 ? '↓' : '↑'} ${Math.abs(overallStats.incidentsChange).toFixed(1)}%`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {overallStats.previousPeriodIncidents} incidentes no período anterior
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Requests</span>
                      <span className={`font-medium ${
                        overallStats.requestsChange <= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {overallStats.requestsChange === 0 ? '0.0%' : 
                         `${overallStats.requestsChange <= 0 ? '↓' : '↑'} ${Math.abs(overallStats.requestsChange).toFixed(1)}%`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {overallStats.previousPeriodRequests} requests no período anterior
                    </p>
                  </div>
                </div>
              </div>
              {/* SLA Compliance */}
              <div className="bg-[#151B2B] p-6 rounded-lg">
                <h2 className="text-gray-400 text-sm mb-4">SLA Compliance</h2>
                <p className={`text-2xl font-bold mb-2 ${
                  overallStats.slaPercentage >= 95 ? 'text-green-500' :
                  overallStats.slaPercentage >= 85 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {overallStats.slaPercentage.toFixed(1)}%
                </p>
                <p className={`text-sm ${
                  overallStats.slaChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {overallStats.slaChange >= 0 ? '↑' : '↓'} {Math.abs(overallStats.slaChange).toFixed(1)}pp vs Ano Anterior
                </p>
              </div>
            </div>
            {/* Indicadores por Associado */}
            <div className="w-full mt-8 p-0">
              <div className="bg-[#151B2B] rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <PieChartIcon className="w-6 h-6 text-[#3B82F6]" /> Indicadores por Associado
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Gráfico por StringAssociado */}
                  <div className="bg-[#1C2333] rounded-lg shadow p-6 flex flex-col items-start min-h-[340px]">
                    <h3 className="text-lg font-semibold text-white mb-4">Chamados por String Associado</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={(function() {
                          const counts: Record<string, number> = {};
                          filteredData.incidents.forEach(inc => {
                            const key = inc.StringAssociado || 'Não informado';
                            counts[key] = (counts[key] || 0) + 1;
                          });
                          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                          const top = sorted.slice(0, 10);
                          const outros = sorted.slice(10);
                          const outrosTotal = outros.reduce((sum, [, v]) => sum + v, 0);
                          const data = top.map(([name, value]) => ({ name, value }));
                          if (outrosTotal > 0) data.push({ name: 'Outros', value: outrosTotal });
                          return data;
                        })()}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#232B41" vertical={false} />
                        <XAxis type="number" tick={{ fill: '#F59E0B', fontSize: 12 }} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" tick={{ fill: '#F3F4F6', fontSize: 13 }} width={120} />
                        <Tooltip content={({ active, payload }) => active && payload && payload.length ? (
                          <div className="bg-[#232B41] p-2 rounded shadow text-white">
                            <span className="font-bold">{payload[0].payload.name}</span>: {payload[0].payload.value} chamados
                          </div>
                        ) : null} />
                        <Bar dataKey="value" fill="#F59E0B" radius={[0, 6, 6, 0]}>
                          <LabelList dataKey="value" position="right" fill="#F59E0B" fontSize={13} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Gráfico por FuncaoAssociada */}
                  <div className="bg-[#1C2333] rounded-lg shadow p-6 flex flex-col items-start min-h-[340px]">
                    <h3 className="text-lg font-semibold text-white mb-4">Chamados por Função Associada</h3>
                    <div className="flex flex-row w-full h-[260px] items-center">
                      <ResponsiveContainer width="60%" height="100%">
                        <PieChart>
                          {(function() {
                            const counts: Record<string, number> = {};
                            filteredData.incidents.forEach(inc => {
                              const key = inc.FuncaoAssociada || 'Não informado';
                              counts[key] = (counts[key] || 0) + 1;
                            });
                            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                            const top = sorted.slice(0, 10);
                            const outros = sorted.slice(10);
                            const outrosTotal = outros.reduce((sum, [, v]) => sum + v, 0);
                            const data = top.map(([name, value]) => ({ name, value }));
                            if (outrosTotal > 0) data.push({ name: 'Outros', value: outrosTotal });
                            return (
                              <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name, value }: { name: string, value: number }) => `${value}`}
                              >
                                {data.map((entry, idx) => (
                                  <Cell key={entry.name} fill={["#3B82F6", "#6366F1", "#F59E0B", "#10B981", "#EF4444", "#FBBF24"][idx % 6]} />
                                ))}
                              </Pie>
                            );
                          })()}
                          <Tooltip content={({ active, payload }) => active && payload && payload.length ? (
                            <div className="bg-[#232B41] p-2 rounded shadow text-white">
                              <span className="font-bold">{payload[0].payload.name}</span>: {payload[0].payload.value} chamados
                            </div>
                          ) : null} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Legenda lateral */}
                      <div className="flex flex-col flex-1 pl-4">
                        {(function() {
                          const counts: Record<string, number> = {};
                          filteredData.incidents.forEach(inc => {
                            const key = inc.FuncaoAssociada || 'Não informado';
                            counts[key] = (counts[key] || 0) + 1;
                          });
                          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                          const top = sorted.slice(0, 10);
                          const outros = sorted.slice(10);
                          const outrosTotal = outros.reduce((sum, [, v]) => sum + v, 0);
                          const data = top.map(([name, value]) => ({ name, value }));
                          if (outrosTotal > 0) data.push({ name: 'Outros', value: outrosTotal });
                          return data.map((entry, idx) => (
                            <div key={entry.name} className="flex items-center gap-2 mb-2">
                              <span className="inline-block w-3 h-3 rounded-full" style={{ background: ["#3B82F6", "#6366F1", "#F59E0B", "#10B981", "#EF4444", "#FBBF24"][idx % 6] }}></span>
                              <span className="text-white text-sm">{entry.name}</span>
                              <span className="text-gray-300 text-xs">({entry.value})</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}