import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  Loader2, 
  BarChart2, 
  Clock as ClockIcon,
  AlertTriangle
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
import { normalizePriority } from '../utils/incidentUtils';
import { normalizeRequestPriority } from '../types/request';

interface LocationAIAgentProps {
  location: string;
  incidents: Incident[];
  requests: Request[];
  startDate: string;
  endDate: string;
}

interface MonthlyData {
  month: string;
  incidentsTotal: number;
  requestsTotal: number;
  slaPercentage: number;
}

interface AnalysisResult {
  incidentsTrend: string[];
  requestsTrend: string[];
  slaTrend: string[];
  summary: string;
  recommendation: string;
}

export function LocationAIAgent({ location, incidents, requests, startDate, endDate }: LocationAIAgentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  
  useEffect(() => {
    runAnalysis();
  }, [location, incidents, requests, startDate, endDate]);

  const runAnalysis = () => {
    setIsLoading(true);
    
    // Calculate monthly data
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const months = eachMonthOfInterval({ start, end });
      
      // Filter incidents and requests for this location
      const locationIncidents = incidents.filter(incident => {
        const assignmentGroup = incident.AssignmentGroup || '';
        return assignmentGroup.includes(location);
      });
      
      const locationRequests = requests.filter(request => {
        const assignmentGroup = request.AssignmentGroup || '';
        return assignmentGroup.includes(location);
      });
      
      // Calculate monthly data
      const data = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthLabel = format(month, 'MMM/yy', { locale: ptBR });
        
        // Count incidents for this month
        const monthIncidents = locationIncidents.filter(incident => {
          try {
            const incidentDate = parseISO(incident.Opened);
            return isWithinInterval(incidentDate, { start: monthStart, end: monthEnd });
          } catch (error) {
            return false;
          }
        });
        
        // Count requests for this month
        const monthRequests = locationRequests.filter(request => {
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
          const state = incident.State?.toLowerCase() || '';
          
          // Only count closed incidents for SLA
          if (state.includes('closed') || state.includes('resolved')) {
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
      
      setMonthlyData(data);
      
      // Generate analysis
      generateAnalysis(data);
    } catch (error) {
      console.error("Error calculating monthly data:", error);
      setIsLoading(false);
    }
  };
  
  const generateAnalysis = (data: MonthlyData[]) => {
    // Skip analysis if we don't have enough data
    if (data.length <= 1) {
      setAnalysis({
        incidentsTrend: ["Dados insuficientes para análise de tendência."],
        requestsTrend: ["Dados insuficientes para análise de tendência."],
        slaTrend: ["Dados insuficientes para análise de tendência."],
        summary: "Período selecionado não possui dados suficientes para análise comparativa.",
        recommendation: "Selecione um período maior para obter análises mais detalhadas."
      });
      setIsLoading(false);
      return;
    }
    
    // Generate trend analysis for each indicator
    const incidentsTrend: string[] = [];
    const requestsTrend: string[] = [];
    const slaTrend: string[] = [];
    
    // Analyze month-to-month changes
    for (let i = 1; i < data.length; i++) {
      const currentMonth = data[i];
      const prevMonth = data[i-1];
      
      // Incidents trend
      const incidentsDiff = currentMonth.incidentsTotal - prevMonth.incidentsTotal;
      const incidentsPercentChange = prevMonth.incidentsTotal > 0 
        ? (incidentsDiff / prevMonth.incidentsTotal) * 100 
        : 0;
      
      incidentsTrend.push(
        `${currentMonth.month} → ${prevMonth.month}: ${incidentsPercentChange > 0 ? '+' : ''}${incidentsPercentChange.toFixed(1)}% (${incidentsDiff > 0 ? 'aumento' : 'redução'} de ${Math.abs(incidentsDiff)} chamados)`
      );
      
      // Requests trend
      const requestsDiff = currentMonth.requestsTotal - prevMonth.requestsTotal;
      const requestsPercentChange = prevMonth.requestsTotal > 0 
        ? (requestsDiff / prevMonth.requestsTotal) * 100 
        : 0;
      
      requestsTrend.push(
        `${currentMonth.month} → ${prevMonth.month}: ${requestsPercentChange > 0 ? '+' : ''}${requestsPercentChange.toFixed(1)}% (${requestsDiff > 0 ? 'aumento' : 'redução'} de ${Math.abs(requestsDiff)} solicitações)`
      );
      
      // SLA trend
      const slaDiff = currentMonth.slaPercentage - prevMonth.slaPercentage;
      
      slaTrend.push(
        `${currentMonth.month} → ${prevMonth.month}: ${slaDiff > 0 ? '+' : ''}${slaDiff.toFixed(1)}pp (${slaDiff > 0 ? 'melhoria' : 'piora'} no SLA)`
      );
    }
    
    // Generate summary
    let summary = "";
    
    // Analyze overall incident trend
    const firstMonth = data[0];
    const lastMonth = data[data.length - 1];
    const totalIncidentsDiff = lastMonth.incidentsTotal - firstMonth.incidentsTotal;
    const totalRequestsDiff = lastMonth.requestsTotal - firstMonth.requestsTotal;
    const totalSlaDiff = lastMonth.slaPercentage - firstMonth.slaPercentage;
    
    // Check for consistent trends
    const incidentsConsistentlyIncreasing = data.every((month, i) => 
      i === 0 || month.incidentsTotal >= data[i-1].incidentsTotal
    );
    
    const incidentsConsistentlyDecreasing = data.every((month, i) => 
      i === 0 || month.incidentsTotal <= data[i-1].incidentsTotal
    );
    
    const requestsConsistentlyIncreasing = data.every((month, i) => 
      i === 0 || month.requestsTotal >= data[i-1].requestsTotal
    );
    
    const requestsConsistentlyDecreasing = data.every((month, i) => 
      i === 0 || month.requestsTotal <= data[i-1].requestsTotal
    );
    
    const slaConsistentlyImproving = data.every((month, i) => 
      i === 0 || month.slaPercentage >= data[i-1].slaPercentage
    );
    
    const slaConsistentlyWorsening = data.every((month, i) => 
      i === 0 || month.slaPercentage <= data[i-1].slaPercentage
    );
    
    // Build summary based on trends
    if (incidentsConsistentlyIncreasing) {
      summary += `Aumento consistente no volume de incidentes ao longo do período. `;
    } else if (incidentsConsistentlyDecreasing) {
      summary += `Redução consistente no volume de incidentes ao longo do período. `;
    } else if (totalIncidentsDiff > 0) {
      summary += `Tendência geral de aumento nos incidentes, com algumas oscilações mensais. `;
    } else {
      summary += `Tendência geral de redução nos incidentes, com algumas oscilações mensais. `;
    }
    
    if (requestsConsistentlyIncreasing) {
      summary += `Aumento consistente no volume de requests ao longo do período. `;
    } else if (requestsConsistentlyDecreasing) {
      summary += `Redução consistente no volume de requests ao longo do período. `;
    } else if (totalRequestsDiff > 0) {
      summary += `Tendência geral de aumento nas solicitações, com algumas oscilações mensais. `;
    } else {
      summary += `Tendência geral de redução nas solicitações, com algumas oscilações mensais. `;
    }
    
    if (slaConsistentlyImproving) {
      summary += `Melhoria consistente no SLA ao longo do período.`;
    } else if (slaConsistentlyWorsening) {
      summary += `Piora consistente no SLA ao longo do período.`;
    } else if (totalSlaDiff > 0) {
      summary += `Tendência geral de melhoria no SLA, com algumas oscilações mensais.`;
    } else {
      summary += `Tendência geral de piora no SLA, com algumas oscilações mensais.`;
    }
    
    // Generate recommendation
    let recommendation = "";
    
    // Identify the most critical issue
    if (lastMonth.slaPercentage < 85) {
      recommendation = "Priorizar a melhoria do SLA, que está abaixo do nível aceitável. Revisar processos de atendimento e alocação de recursos.";
    } else if (incidentsConsistentlyIncreasing) {
      recommendation = "Investigar as causas do aumento consistente de incidentes. Considerar ações preventivas e revisão de processos.";
    } else if (requestsConsistentlyIncreasing && lastMonth.requestsTotal > lastMonth.incidentsTotal * 1.5) {
      recommendation = "Analisar o alto volume de solicitações. Considerar automação de processos comuns para reduzir a carga de trabalho.";
    } else if (totalIncidentsDiff < 0 && totalRequestsDiff < 0 && totalSlaDiff > 0) {
      recommendation = "Manter as boas práticas atuais. A redução de volume e melhoria de SLA indicam processos eficientes.";
    } else {
      recommendation = "Monitorar de perto as oscilações mensais e identificar padrões sazonais que possam impactar o volume de chamados.";
    }
    
    setAnalysis({
      incidentsTrend,
      requestsTrend,
      slaTrend,
      summary,
      recommendation
    });
    
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-medium text-white">Agente de IA - {location}</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-gray-400">Analisando dados da localidade...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-[#1C2333] p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-medium text-white">Agente de IA - {location}</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <AlertTriangle className="h-6 w-6 text-yellow-500 mr-2" />
          <p className="text-gray-400">Não foi possível gerar análise para esta localidade.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1C2333] p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-indigo-400" />
        <h3 className="text-lg font-medium text-white">Agente de IA - {location}</h3>
      </div>
      
      <div className="space-y-4">
        {/* Incidents Trend */}
        <div className="bg-[#151B2B] p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="h-4 w-4 text-yellow-400" />
            <h4 className="text-sm font-medium text-white">Incidentes</h4>
          </div>
          <div className="space-y-1">
            {analysis.incidentsTrend.map((trend, index) => (
              <p key={index} className="text-sm text-gray-300">
                {trend.includes('+') ? (
                  <TrendingUp className="h-3 w-3 text-red-400 inline-block mr-1" />
                ) : trend.includes('-') ? (
                  <TrendingDown className="h-3 w-3 text-green-400 inline-block mr-1" />
                ) : (
                  <span className="inline-block w-3 mr-1"></span>
                )}
                {trend}
              </p>
            ))}
          </div>
        </div>
        
        {/* Requests Trend */}
        <div className="bg-[#151B2B] p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ClockIcon className="h-4 w-4 text-blue-400" />
            <h4 className="text-sm font-medium text-white">Requisições</h4>
          </div>
          <div className="space-y-1">
            {analysis.requestsTrend.map((trend, index) => (
              <p key={index} className="text-sm text-gray-300">
                {trend.includes('+') ? (
                  <TrendingUp className="h-3 w-3 text-red-400 inline-block mr-1" />
                ) : trend.includes('-') ? (
                  <TrendingDown className="h-3 w-3 text-green-400 inline-block mr-1" />
                ) : (
                  <span className="inline-block w-3 mr-1"></span>
                )}
                {trend}
              </p>
            ))}
          </div>
        </div>
        
        {/* SLA Trend */}
        <div className="bg-[#151B2B] p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ClockIcon className="h-4 w-4 text-purple-400" />
            <h4 className="text-sm font-medium text-white">SLA</h4>
          </div>
          <div className="space-y-1">
            {analysis.slaTrend.map((trend, index) => (
              <p key={index} className="text-sm text-gray-300">
                {trend.includes('+') ? (
                  <TrendingUp className="h-3 w-3 text-green-400 inline-block mr-1" />
                ) : trend.includes('-') ? (
                  <TrendingDown className="h-3 w-3 text-red-400 inline-block mr-1" />
                ) : (
                  <span className="inline-block w-3 mr-1"></span>
                )}
                {trend}
              </p>
            ))}
          </div>
        </div>
        
        {/* Summary */}
        <div className="bg-[#151B2B] p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-indigo-400" />
            <h4 className="text-sm font-medium text-white">Resumo</h4>
          </div>
          <p className="text-sm text-gray-300">{analysis.summary}</p>
        </div>
        
        {/* Recommendation */}
        <div className="bg-[#151B2B] p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            <h4 className="text-sm font-medium text-white">Recomendação</h4>
          </div>
          <p className="text-sm text-gray-300">{analysis.recommendation}</p>
        </div>
      </div>
    </div>
  );
}