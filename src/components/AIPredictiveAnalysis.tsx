import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Lightbulb, 
  X, 
  Loader2, 
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  Zap,
  ExternalLink,
  Clock,
  FileText
} from 'lucide-react';
import OpenAI from 'openai';
import { Request } from '../types/request';
import { normalizeRequestPriority, normalizeRequestStatus } from '../types/request';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interfaces for typing data
interface AIPredictiveAnalysisProps {
  requests: Request[];
  onClose?: () => void;
}

interface RootCauseAnalysis {
  summary: string;
  byPriority: Record<string, string>;
  patterns: {
    category: string;
    subcategory: string;
    description: string;
    frequency: number;
    requests?: Request[]; // Added to store related requests
  }[];
}

interface Recommendation {
  title: string;
  description: string;
  type: 'preventive' | 'process' | 'technical';
  priority: 'high' | 'medium' | 'low';
  effort: 'quick-win' | 'medium-term' | 'long-term';
  impact: number;
}

interface ImpactAnalysis {
  affectedAreas: string[];
  byGroup: {
    group: string;
    impact: number;
    requests: number;
  }[];
  severity: number;
  quickWins: string[];
}

interface TimeAnalysis {
  summary: string;
  byTime: Record<string, {
    total: number;
    patterns: string[];
    criticalRequests: number;
    commonCategories: string[];
    recommendations: string[];
  }>;
  crossTimePatterns: string[];
  recommendations: string[];
}

interface ConfidenceMetrics {
  overall: number;
  dataQuality: number;
  patternStrength: number;
  recommendations: number;
}

interface Analysis {
  rootCause: RootCauseAnalysis;
  recommendations: Recommendation[];
  impact: ImpactAnalysis;
  confidence: ConfidenceMetrics;
  timeAnalysis: TimeAnalysis;
}

// Colors for each priority level
const CHART_COLORS = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#10B981',
  'Não definido': '#6B7280'
} as const;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Maximum number of requests for analysis
const MAX_REQUESTS = 50;

// Default template for analysis
const ANALYSIS_TEMPLATE = {
  rootCause: {
    summary: "",
    byPriority: {
      HIGH: "",
      MEDIUM: "",
      LOW: ""
    },
    patterns: []
  },
  recommendations: [],
  impact: {
    affectedAreas: [],
    byGroup: [],
    severity: 0,
    quickWins: []
  },
  confidence: {
    overall: 0,
    dataQuality: 0,
    patternStrength: 0,
    recommendations: 0
  },
  timeAnalysis: {
    summary: "",
    byTime: {
      MORNING: {
        total: 0,
        patterns: [],
        criticalRequests: 0,
        commonCategories: [],
        recommendations: []
      },
      AFTERNOON: {
        total: 0,
        patterns: [],
        criticalRequests: 0,
        commonCategories: [],
        recommendations: []
      },
      NIGHT: {
        total: 0,
        patterns: [],
        criticalRequests: 0,
        commonCategories: [],
        recommendations: []
      }
    },
    crossTimePatterns: [],
    recommendations: []
  }
};

export function AIPredictiveAnalysis({ requests, onClose }: AIPredictiveAnalysisProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['root-cause']);
  const [progress, setProgress] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [expandedPatterns, setExpandedPatterns] = useState<number[]>([]);

  // Function to expand/collapse sections
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Function to expand/collapse patterns
  const togglePattern = (index: number) => {
    setExpandedPatterns(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const getStatusColor = (state: string) => {
    const s = state?.toLowerCase() || '';
    if (s.includes('closed') || s.includes('resolved') || s.includes('complete')) return 'bg-green-500/20 text-green-400';
    if (s.includes('progress') || s.includes('assigned')) return 'bg-blue-500/20 text-blue-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };

  const analyzeRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress(0);

      // Sample requests if there are too many
      const sampledRequests = requests.length > MAX_REQUESTS
        ? requests
            .sort(() => Math.random() - 0.5)
            .slice(0, MAX_REQUESTS)
        : requests;

      setProgress(10);

      // Prepare data for analysis
      const requestData = sampledRequests.map(request => ({
        number: request.Number,
        description: request.ShortDescription,
        priority: normalizeRequestPriority(request.Priority),
        category: request.RequestItem,
        assignmentGroup: request.AssignmentGroup,
        state: request.State,
        requestedFor: request.RequestedForName,
        responseTime: request.ResponseTime,
        opened: request.Opened,
        updated: request.Updated
      }));

      setProgress(20);

      // System prompt for AI
      const systemPrompt = `
        Você é um analista especialista em Operações de TI. Analise as solicitações (requests) e forneça insights detalhados neste formato JSON exato:
        {
          "rootCause": {
            "summary": "Visão geral aprofundada dos principais problemas e tendências",
            "byPriority": {
              "HIGH": "Análise detalhada das solicitações de alta prioridade, incluindo padrões e impactos",
              "MEDIUM": "Análise detalhada das solicitações de média prioridade",
              "LOW": "Análise detalhada das solicitações de baixa prioridade"
            },
            "patterns": [
              {
                "category": "Nome da categoria",
                "subcategory": "Nome da subcategoria",
                "description": "Descrição detalhada do padrão identificado, incluindo causas raiz e correlações",
                "frequency": 0
              }
            ]
          },
          "recommendations": [
            {
              "title": "Título da recomendação",
              "description": "Descrição detalhada da recomendação, incluindo benefícios esperados e passos de implementação",
              "type": "preventive",
              "priority": "high",
              "effort": "quick-win",
              "impact": 0
            }
          ],
          "impact": {
            "affectedAreas": ["Áreas afetadas com descrição do impacto"],
            "byGroup": [
              {
                "group": "Nome do grupo",
                "impact": 0,
                "requests": 0
              }
            ],
            "severity": 0,
            "quickWins": ["Ações rápidas com alto impacto"]
          },
          "confidence": {
            "overall": 0,
            "dataQuality": 0,
            "patternStrength": 0,
            "recommendations": 0
          },
          "timeAnalysis": {
            "summary": "Análise geral dos padrões por horário",
            "byTime": {
              "MORNING": {
                "total": 0,
                "patterns": ["Padrões identificados no período da manhã"],
                "criticalRequests": 0,
                "commonCategories": ["Categorias mais comuns"],
                "recommendations": ["Recomendações específicas para o período"]
              },
              "AFTERNOON": {
                "total": 0,
                "patterns": ["Padrões identificados no período da tarde"],
                "criticalRequests": 0,
                "commonCategories": ["Categorias mais comuns"],
                "recommendations": ["Recomendações específicas para o período"]
              },
              "NIGHT": {
                "total": 0,
                "patterns": ["Padrões identificados no período da noite"],
                "criticalRequests": 0,
                "commonCategories": ["Categorias mais comuns"],
                "recommendations": ["Recomendações específicas para o período"]
              }
            },
            "crossTimePatterns": ["Padrões que se repetem entre períodos"],
            "recommendations": ["Recomendações gerais baseadas na análise por períodos"]
          }
        }

        IMPORTANTE:
        1. Forneça análises profundas e detalhadas em cada seção
        2. Identifique correlações entre solicitações
        3. Destaque tendências e padrões emergentes
        4. Sugira ações preventivas específicas
        5. Avalie o impacto no negócio
        6. Mantenha exatamente esta estrutura JSON
        7. Todos os valores numéricos devem estar entre 0 e 100
        8. Não inclua nenhum texto fora do JSON
        9. Garanta que a resposta seja um JSON válido
        10. Use apenas os valores especificados para enums:
            - type: "preventive", "process", ou "technical"
            - priority: "high", "medium", ou "low"
            - effort: "quick-win", "medium-term", ou "long-term"
        11. Na análise por períodos, considere:
            - Padrões específicos de cada período do dia
            - Diferenças na natureza das solicitações
            - Variações de volume e criticidade
            - Recomendações específicas por período
      `;

      setProgress(30);

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              task: "Analise estas solicitações de TI e forneça insights detalhados",
              requests: requestData
            })
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      setProgress(40);

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error("Nenhuma análise foi gerada");

      setProgress(50);

      try {
        // Parse JSON response
        const parsedResponse = JSON.parse(response);
        
        setProgress(60);

        // Associate requests to patterns identified
        const patternsWithRequests = parsedResponse.rootCause.patterns.map((pattern: any) => {
          const matchingRequests = requests.filter(request => {
            const matchesCategory = request.RequestItem?.toLowerCase().includes(pattern.category.toLowerCase());
            const matchesSubcategory = pattern.subcategory ? 
              request.RequestItem?.toLowerCase().includes(pattern.subcategory.toLowerCase()) : 
              true;
            const matchesDescription = request.ShortDescription?.toLowerCase().includes(pattern.description.toLowerCase());
            
            return matchesCategory || matchesSubcategory || matchesDescription;
          });

          return {
            ...pattern,
            requests: matchingRequests.slice(0, 10) // Limit to 10 requests per pattern
          };
        });

        // Validate and structure the result
        const analysisResult = {
          rootCause: {
            summary: parsedResponse.rootCause?.summary || ANALYSIS_TEMPLATE.rootCause.summary,
            byPriority: parsedResponse.rootCause?.byPriority || ANALYSIS_TEMPLATE.rootCause.byPriority,
            patterns: patternsWithRequests || ANALYSIS_TEMPLATE.rootCause.patterns
          },
          recommendations: parsedResponse.recommendations || ANALYSIS_TEMPLATE.recommendations,
          impact: {
            affectedAreas: parsedResponse.impact?.affectedAreas || ANALYSIS_TEMPLATE.impact.affectedAreas,
            byGroup: parsedResponse.impact?.byGroup || ANALYSIS_TEMPLATE.impact.byGroup,
            severity: parsedResponse.impact?.severity || ANALYSIS_TEMPLATE.impact.severity,
            quickWins: parsedResponse.impact?.quickWins || ANALYSIS_TEMPLATE.impact.quickWins
          },
          confidence: {
            overall: parsedResponse.confidence?.overall || ANALYSIS_TEMPLATE.confidence.overall,
            dataQuality: parsedResponse.confidence?.dataQuality || ANALYSIS_TEMPLATE.confidence.dataQuality,
            patternStrength: parsedResponse.confidence?.patternStrength || ANALYSIS_TEMPLATE.confidence.patternStrength,
            recommendations: parsedResponse.confidence?.recommendations || ANALYSIS_TEMPLATE.confidence.recommendations
          },
          timeAnalysis: parsedResponse.timeAnalysis || ANALYSIS_TEMPLATE.timeAnalysis
        };

        setProgress(70);

        setAnalysis(analysisResult);

        setProgress(80);

        // Small delay to show final progress
        await new Promise(resolve => setTimeout(resolve, 500));

        setProgress(100);

      } catch (parseError) {
        console.error('Erro ao analisar JSON:', parseError);
        throw new Error("Falha ao processar resultados da análise");
      }
    } catch (err) {
      console.error('Erro na análise:', err);
      setError(err instanceof Error ? err.message : 'Erro ao analisar solicitações');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  // Start analysis when requests change
  useEffect(() => {
    analyzeRequests();
  }, [requests]);

  // Error rendering
  if (error) {
    return (
      <div className="bg-[#151B2B] p-6 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-red-500" />
            <h2 className="text-xl font-semibold text-white">Análise Preditiva - IA</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          )}
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="text-red-500 font-medium">Erro na Análise</h3>
              <p className="text-red-400 mt-1">{error}</p>
              <button
                onClick={analyzeRequests}
                className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main rendering
  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-indigo-500" />
          <h2 className="text-xl font-semibold text-white">Análise Preditiva - IA</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
            {progress > 0 && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span className="text-sm text-yellow-400">{progress}%</span>
              </div>
            )}
          </div>
          <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-400">Analisando solicitações...</p>
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          {/* Root Cause Analysis */}
          <div className="bg-[#1C2333] rounded-lg">
            <button
              onClick={() => toggleSection('root-cause')}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-medium text-white">
                  Análise de Causa Raiz
                </h3>
              </div>
              {expandedSections.includes('root-cause') ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedSections.includes('root-cause') && (
              <div className="p-4 pt-0 space-y-4">
                <p className="text-gray-300">{analysis.rootCause.summary}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(analysis.rootCause.byPriority).map(([priority, analysis]) => (
                    <div 
                      key={priority}
                      className="bg-[#151B2B] p-4 rounded-lg"
                      style={{ borderLeft: `4px solid ${CHART_COLORS[priority as keyof typeof CHART_COLORS]}` }}
                    >
                      <h4 className="font-medium mb-2" style={{ color: CHART_COLORS[priority as keyof typeof CHART_COLORS] }}>
                        Prioridade {priority === 'HIGH' ? 'Alta' : priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                      </h4>
                      <p className="text-gray-400 text-sm">{analysis}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {analysis.rootCause.patterns.map((pattern, index) => (
                    <div key={index} className="bg-[#151B2B] p-4 rounded-lg">
                      <button
                        onClick={() => togglePattern(index)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white font-medium">
                              {pattern.category} {pattern.subcategory && `• ${pattern.subcategory}`}
                            </h4>
                            <span className="text-indigo-400 text-sm">
                              {pattern.frequency} ocorrências
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm text-left">{pattern.description}</p>
                        </div>
                        {pattern.requests && pattern.requests.length > 0 && (
                          <ChevronDown className={`h-5 w-5 text-gray-400 ml-4 transform transition-transform ${
                            expandedPatterns.includes(index) ? 'rotate-180' : ''
                          }`} />
                        )}
                      </button>

                      {/* List of requests related to the pattern */}
                      {expandedPatterns.includes(index) && pattern.requests && pattern.requests.length > 0 && (
                        <div className="mt-4 border-t border-gray-700 pt-4">
                          <h5 className="text-sm font-medium text-gray-400 mb-3">
                            Solicitações Relacionadas
                          </h5>
                          <div className="space-y-2">
                            {pattern.requests.map((request) => (
                              <div 
                                key={request.Number}
                                className="bg-[#1C2333] p-3 rounded-lg flex items-center justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white">{request.Number}</span>
                                    <span className="text-sm" style={{ 
                                      color: CHART_COLORS[normalizeRequestPriority(request.Priority) as keyof typeof CHART_COLORS] 
                                    }}>
                                      {request.Priority}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.State)}`}>
                                      {request.State}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-400 mt-1">{request.ShortDescription}</p>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    <span>{formatDate(request.Opened)}</span>
                                    {request.AssignmentGroup && (
                                      <>
                                        <span>•</span>
                                        <span>{request.AssignmentGroup}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSelectedRequest(request)}
                                  className="text-indigo-400 hover:text-indigo-300 transition-colors ml-4"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Time Analysis */}
          <div className="bg-[#1C2333] rounded-lg">
            <button
              onClick={() => toggleSection('time-analysis')}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-medium text-white">
                  Análise por Período
                </h3>
              </div>
              {expandedSections.includes('time-analysis') ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedSections.includes('time-analysis') && (
              <div className="p-4 pt-0 space-y-4">
                <p className="text-gray-300">{analysis.timeAnalysis.summary}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(analysis.timeAnalysis.byTime).map(([time, data]) => (
                    <div 
                      key={time}
                      className="bg-[#151B2B] p-4 rounded-lg space-y-4"
                    >
                      <div>
                        <h4 className="text-lg font-medium text-white mb-1">
                          {time === 'MORNING' ? 'Manhã' : 
                           time === 'AFTERNOON' ? 'Tarde' : 'Noite'}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {time === 'MORNING' ? '06:00h às 14:00h' : 
                           time === 'AFTERNOON' ? '14:00h às 22:00h' : '22:00h às 06:00h'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Total de Solicitações</span>
                          <span className="text-white font-medium">{data.total}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Solicitações Críticas</span>
                          <span className="text-red-400 font-medium">{data.criticalRequests}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-400">Categorias Comuns</h5>
                        <div className="space-y-1">
                          {data.commonCategories.map((category, index) => (
                            <p key={index} className="text-sm text-yellow-200">
                              • {category}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-400">Padrões Identificados</h5>
                        <div className="space-y-1">
                          {data.patterns.map((pattern, index) => (
                            <p key={index} className="text-sm text-yellow-200">
                              • {pattern}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-400">Recomendações</h5>
                        <div className="space-y-1">
                          {data.recommendations.map((rec, index) => (
                            <p key={index} className="text-sm text-yellow-200">
                              • {rec}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#151B2B] p-4 rounded-lg space-y-4">
                  <h4 className="text-lg font-medium text-white">Padrões Entre Períodos</h4>
                  <div className="space-y-2">
                    {analysis.timeAnalysis.crossTimePatterns.map((pattern, index) => (
                      <p key={index} className="text-yellow-200">
                        • {pattern}
                      </p>
                    ))}
                  </div>

                  <h4 className="text-lg font-medium text-white pt-4">Recomendações Gerais</h4>
                  <div className="space-y-2">
                    {analysis.timeAnalysis.recommendations.map((rec, index) => (
                      <p key={index} className="text-yellow-200">
                        • {rec}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="bg-[#1C2333] rounded-lg">
            <button
              onClick={() => toggleSection('recommendations')}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                <h3 className="text-lg font-medium text-white">
                  Recomendações Inteligentes
                </h3>
              </div>
              {expandedSections.includes('recommendations') ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              
              )}
            </button>

            {expandedSections.includes('recommendations') && (
              <div className="p-4 pt-0 space-y-4">
                {analysis.recommendations.map((rec, index) => (
                  <div 
                    key={index}
                    className="bg-[#151B2B] p-4 rounded-lg border-l-4"
                    style={{
                      borderColor: 
                        rec.type === 'preventive' ? '#10B981' :
                        rec.type === 'process' ? '#3B82F6' :
                        '#F59E0B'
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium">{rec.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                          rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {rec.priority === 'high' ? 'alta' : 
                           rec.priority === 'medium' ? 'média' : 'baixa'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          rec.effort === 'quick-win' ? 'bg-green-500/20 text-green-400' :
                          rec.effort === 'medium-term' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {rec.effort === 'quick-win' ? 'rápida' : 
                           rec.effort === 'medium-term' ? 'média' : 'longa'}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm">{rec.description}</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className={`${
                        rec.type === 'preventive' ? 'text-green-400' :
                        rec.type === 'process' ? 'text-blue-400' :
                        'text-yellow-400'
                      }`}>
                        {rec.type === 'preventive' ? 'Ação Preventiva' :
                         rec.type === 'process' ? 'Melhoria de Processo' :
                         'Solução Técnica'}
                      </span>
                      <div className="flex items-center gap-1">
                        <Zap className="h-4 w-4 text-indigo-400" />
                        <span className="text-indigo-400">
                          Impacto: {rec.impact}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Impact Analysis */}
          <div className="bg-[#1C2333] rounded-lg">
            <button
              onClick={() => toggleSection('impact')}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-red-400" />
                <h3 className="text-lg font-medium text-white">
                  Análise de Impacto
                </h3>
              </div>
              {expandedSections.includes('impact') ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedSections.includes('impact') && (
              <div className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#151B2B] p-4 rounded-lg">
                    <h4 className="text-white font-medium mb-3">Áreas Afetadas</h4>
                    <div className="space-y-2">
                      {analysis.impact.affectedAreas.map((area, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-2 text-gray-400"
                        >
                          <AlertCircle className="h-4 w-4 text-yellow-400" />
                          <span>{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#151B2B] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Severidade</h4>
                      <span className={`text-lg font-bold ${
                        analysis.impact.severity >= 75 ? 'text-red-400' :
                        analysis.impact.severity >= 50 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {analysis.impact.severity}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                        style={{ width: `${analysis.impact.severity}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#151B2B] p-4 rounded-lg">
                  <h4 className="text-white font-medium mb-3">Impacto por Grupo</h4>
                  <div className="space-y-3">
                    {analysis.impact.byGroup.map((group, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">{group.group}</span>
                          <span className="text-gray-400">
                            {group.requests} solicitações
                          </span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500"
                            style={{ width: `${group.impact}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#151B2B] p-4 rounded-lg">
                  <h4 className="text-white font-medium mb-3">Quick Wins</h4>
                  <div className="space-y-2">
                    {analysis.impact.quickWins.map((win, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 text-gray-400"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span>{win}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confidence Metrics */}
          <div className="bg-[#1C2333] rounded-lg">
            <button
              onClick={() => toggleSection('confidence')}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <BarChart2 className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-medium text-white">
                  Nível de Confiança
                </h3>
              </div>
              {expandedSections.includes('confidence') ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedSections.includes('confidence') && (
              <div className="p-4 pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#151B2B] p-4 rounded-lg">
                    <h4 className="text-sm text-gray-400 mb-2">Geral</h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${
                        analysis.confidence.overall >= 75 ? 'text-green-400' :
                        analysis.confidence.overall >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {analysis.confidence.overall}%
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#151B2B] p-4 rounded-lg">
                    <h4 className="text-sm text-gray-400 mb-2">Qualidade dos Dados</h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${
                        analysis.confidence.dataQuality >= 75 ? 'text-green-400' :
                        analysis.confidence.dataQuality >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {analysis.confidence.dataQuality}%
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#151B2B] p-4 rounded-lg">
                    <h4 className="text-sm text-gray-400 mb-2">Força dos Padrões</h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${
                        analysis.confidence.patternStrength >= 75 ? 'text-green-400' :
                        analysis.confidence.patternStrength >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {analysis.confidence.patternStrength}%
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#151B2B] p-4 rounded-lg">
                    <h4 className="text-sm text-gray-400 mb-2">Recomendações</h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${
                        analysis.confidence.recommendations >= 75 ? 'text-green-400' :
                        analysis.confidence.recommendations >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {analysis.confidence.recommendations}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
          <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">
                  Solicitação {selectedRequest.Number}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRequest.State)}`}>
                    {selectedRequest.State}
                  </span>
                  <span className="flex items-center gap-1 text-sm" style={{ 
                    color: CHART_COLORS[normalizeRequestPriority(selectedRequest.Priority) as keyof typeof CHART_COLORS] 
                  }}>
                    <AlertCircle className="h-4 w-4" />
                    Prioridade {selectedRequest.Priority}
                  </span>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors ml-2"
                  >
                    <X className="h-5 w-5 text-gray-400 hover:text-white" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg text-white">Descrição</h3>
              <p className="text-gray-300 mt-2">{selectedRequest.ShortDescription}</p>
            </div>

            {/* Content - Scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto flex-grow">
              {/* Comments Section */}
              <div className="bg-[#1C2333] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    <span className="text-white font-medium">
                      Comentários e Notas de Trabalho
                    </span>
                  </div>
                </div>

                <div className="p-4 max-h-[300px] overflow-y-auto">
                  {selectedRequest.CommentsAndWorkNotes ? (
                    <div className="text-gray-300 whitespace-pre-wrap break-words">
                      {selectedRequest.CommentsAndWorkNotes.split('\n').map((line, index) => (
                        <div key={index} className="mb-2">
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">
                      Nenhum comentário ou nota de trabalho disponível.
                    </p>
                  )}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Solicitante</p>
                    <p className="text-white">{selectedRequest.RequestedForName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Grupo Responsável</p>
                    <p className="text-white">{selectedRequest.AssignmentGroup}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Data de Abertura</p>
                    <p className="text-white">{formatDate(selectedRequest.Opened)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Analista Responsável</p>
                    <p className="text-white">{selectedRequest.AssignedTo || 'Não atribuído'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Tipo de Solicitação</p>
                    <p className="text-white">{selectedRequest.RequestItem || 'Não categorizado'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Última Atualização</p>
                    <p className="text-white">
                      {selectedRequest.Updated ? formatDate(selectedRequest.Updated) : 'Não atualizado'}
                    </p>
                    {selectedRequest.UpdatedBy && (
                      <p className="text-sm text-gray-400">por {selectedRequest.UpdatedBy}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-700 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}