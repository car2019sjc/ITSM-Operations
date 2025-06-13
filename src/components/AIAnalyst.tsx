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
  Clock
} from 'lucide-react';
import OpenAI from 'openai';
import { Incident } from '../types/incident';
import { normalizePriority } from '../utils/incidentUtils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IncidentDetails } from './IncidentDetails';
import { getShiftFromTime, getShiftName } from '../utils/shiftUtils';
import { SHIFTS } from '../types/analyst';

// Interfaces para tipagem dos dados
interface AIAnalystProps {
  incidents: Incident[];
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
    incidents?: Incident[]; // Adicionado para armazenar os incidentes relacionados
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
    incidents: number;
  }[];
  severity: number;
  quickWins: string[];
}

interface ShiftAnalysis {
  summary: string;
  byShift: Record<string, {
    total: number;
    patterns: string[];
    criticalIncidents: number;
    commonCategories: string[];
    recommendations: string[];
  }>;
  crossShiftPatterns: string[];
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
  shiftAnalysis: ShiftAnalysis;
}

// Cores para cada nível de prioridade
const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
} as const;

// Inicialização do cliente OpenAI
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Limite máximo de incidentes para análise
const MAX_INCIDENTS = 50;

// SLA thresholds
const SLA_THRESHOLDS = {
  P1: 1,   // 1 hour
  P2: 4,   // 4 hours
  P3: 36,  // 36 hours
  P4: 72   // 72 hours
};

// Template padrão para a análise
const ANALYSIS_TEMPLATE = {
  rootCause: {
    summary: "",
    byPriority: {
      P1: "",
      P2: "",
      P3: "",
      P4: ""
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
  shiftAnalysis: {
    summary: "",
    byShift: {
      MORNING: {
        total: 0,
        patterns: [],
        criticalIncidents: 0,
        commonCategories: [],
        recommendations: []
      },
      AFTERNOON: {
        total: 0,
        patterns: [],
        criticalIncidents: 0,
        commonCategories: [],
        recommendations: []
      },
      NIGHT: {
        total: 0,
        patterns: [],
        criticalIncidents: 0,
        commonCategories: [],
        recommendations: []
      }
    },
    crossShiftPatterns: [],
    recommendations: []
  }
};

export function AIAnalyst({ incidents, onClose }: AIAnalystProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['root-cause']);
  const [progress, setProgress] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [expandedPatterns, setExpandedPatterns] = useState<number[]>([]);

  // Função para expandir/recolher seções
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Função para expandir/recolher padrões
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
    if (s.includes('closed') || s.includes('resolved')) return 'bg-green-500/20 text-green-400';
    if (s.includes('progress') || s.includes('assigned')) return 'bg-blue-500/20 text-blue-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };

  const analyzeIncidents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress(0);

      // Amostragem de incidentes se houver muitos
      const sampledIncidents = incidents.length > MAX_INCIDENTS
        ? incidents
            .sort(() => Math.random() - 0.5)
            .slice(0, MAX_INCIDENTS)
        : incidents;

      setProgress(10);

      // Preparação dos dados para análise
      const incidentData = sampledIncidents.map(incident => ({
        number: incident.Number,
        description: incident.ShortDescription,
        priority: normalizePriority(incident.Priority),
        category: incident.Category,
        subcategory: incident.Subcategory,
        assignmentGroup: incident.AssignmentGroup,
        state: incident.State,
        location: incident.Location,
        businessImpact: incident.BusinessImpact,
        responseTime: incident.ResponseTime,
        opened: incident.Opened,
        shift: getShiftFromTime(incident.Opened)
      }));

      setProgress(20);

      // Prompt do sistema para a IA
      const systemPrompt = `
        Você é um analista especialista em Operações de TI. Analise os incidentes e forneça insights detalhados neste formato JSON exato:
        {
          "rootCause": {
            "summary": "Visão geral aprofundada dos principais problemas e tendências",
            "byPriority": {
              "P1": "Análise detalhada dos incidentes críticos, incluindo padrões e impactos",
              "P2": "Análise detalhada dos incidentes de alta prioridade",
              "P3": "Análise detalhada dos incidentes de média prioridade",
              "P4": "Análise detalhada dos incidentes de baixa prioridade"
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
                "incidents": 0
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
          "shiftAnalysis": {
            "summary": "Análise geral dos padrões por turno",
            "byShift": {
              "MORNING": {
                "total": 0,
                "patterns": ["Padrões identificados no turno da manhã"],
                "criticalIncidents": 0,
                "commonCategories": ["Categorias mais comuns"],
                "recommendations": ["Recomendações específicas para o turno"]
              },
              "AFTERNOON": {
                "total": 0,
                "patterns": ["Padrões identificados no turno da tarde"],
                "criticalIncidents": 0,
                "commonCategories": ["Categorias mais comuns"],
                "recommendations": ["Recomendações específicas para o turno"]
              },
              "NIGHT": {
                "total": 0,
                "patterns": ["Padrões identificados no turno da noite"],
                "criticalIncidents": 0,
                "commonCategories": ["Categorias mais comuns"],
                "recommendations": ["Recomendações específicas para o turno"]
              }
            },
            "crossShiftPatterns": ["Padrões que se repetem entre turnos"],
            "recommendations": ["Recomendações gerais baseadas na análise por turnos"]
          }
        }

        IMPORTANTE:
        1. Forneça análises profundas e detalhadas em cada seção
        2. Identifique correlações entre incidentes
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
        11. Na análise por turnos, considere:
            - Padrões específicos de cada turno
            - Diferenças na natureza dos incidentes
            - Variações de volume e criticidade
            - Recomendações específicas por turno
            
        12. Considere os seguintes tempos de SLA para cada prioridade:
            - P1: 1 hora
            - P2: 4 horas
            - P3: 36 horas
            - P4: 72 horas
      `;

      setProgress(30);

      // Chamada à API da OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              task: "Analise estes incidentes de TI e forneça insights detalhados",
              incidents: incidentData
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
        // Análise da resposta JSON
        const parsedResponse = JSON.parse(response);
        
        setProgress(60);

        // Associar incidentes aos padrões identificados
        const patternsWithIncidents = parsedResponse.rootCause.patterns.map((pattern: any) => {
          const matchingIncidents = incidents.filter(incident => {
            const matchesCategory = incident.Category?.toLowerCase().includes(pattern.category.toLowerCase());
            const matchesSubcategory = pattern.subcategory ? 
              incident.Subcategory?.toLowerCase().includes(pattern.subcategory.toLowerCase()) : 
              true;
            const matchesDescription = incident.ShortDescription?.toLowerCase().includes(pattern.description.toLowerCase());
            
            return matchesCategory || matchesSubcategory || matchesDescription;
          });

          return {
            ...pattern,
            incidents: matchingIncidents.slice(0, 10) // Limitar a 10 incidentes por padrão
          };
        });

        // Validação e estruturação do resultado
        const analysisResult = {
          rootCause: {
            summary: parsedResponse.rootCause?.summary || ANALYSIS_TEMPLATE.rootCause.summary,
            byPriority: parsedResponse.rootCause?.byPriority || ANALYSIS_TEMPLATE.rootCause.byPriority,
            patterns: patternsWithIncidents || ANALYSIS_TEMPLATE.rootCause.patterns
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
          shiftAnalysis: parsedResponse.shiftAnalysis || ANALYSIS_TEMPLATE.shiftAnalysis
        };

        setProgress(70);

        setAnalysis(analysisResult);

        setProgress(80);

        // Pequeno delay para mostrar o progresso final
        await new Promise(resolve => setTimeout(resolve, 500));

        setProgress(100);

      } catch (parseError) {
        console.error('Erro ao analisar JSON:', parseError);
        throw new Error("Falha ao processar resultados da análise");
      }
    } catch (err) {
      console.error('Erro na análise:', err);
      setError(err instanceof Error ? err.message : 'Erro ao analisar incidentes');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  // Iniciar análise quando os incidentes mudarem
  useEffect(() => {
    console.log('VITE_OPENAI_API_KEY:', import.meta.env.VITE_OPENAI_API_KEY);
    analyzeIncidents();
  }, []);

  // Renderização do erro
  if (error) {
    return (
      <div className="bg-[#151B2B] p-6 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-red-500" />
            <h2 className="text-xl font-semibold text-white">Análise dos Dados por IA</h2>
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
                onClick={analyzeIncidents}
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

  // Renderização principal
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-orange-500 w-12 h-12 mb-4" />
        <span className="text-orange-300 text-lg font-semibold">Analisando incidentes com IA...</span>
        <span className="text-gray-400 mt-2">Isso pode levar alguns segundos dependendo do volume de dados.</span>
      </div>
    );
  }

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-indigo-500" />
          <h2 className="text-xl font-semibold text-white">Análise dos Dados por IA</h2>
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

      {/* Estado de carregamento */}
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
          <p className="text-gray-400">Analisando incidentes...</p>
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          {/* Análise de Causa Raiz */}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(analysis.rootCause.byPriority).map(([priority, analysis]) => (
                    <div 
                      key={priority}
                      className="bg-[#151B2B] p-4 rounded-lg"
                      style={{ borderLeft: `4px solid ${CHART_COLORS[priority as keyof typeof CHART_COLORS]}` }}
                    >
                      <h4 className="font-medium mb-2" style={{ color: CHART_COLORS[priority as keyof typeof CHART_COLORS] }}>
                        Prioridade {priority}
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
                        {pattern.incidents && pattern.incidents.length > 0 && (
                          <ChevronDown className={`h-5 w-5 text-gray-400 ml-4 transform transition-transform ${
                            expandedPatterns.includes(index) ? 'rotate-180' : ''
                          }`} />
                        )}
                      </button>

                      {/* Lista de incidentes relacionados ao padrão */}
                      {expandedPatterns.includes(index) && pattern.incidents && pattern.incidents.length > 0 && (
                        <div className="mt-4 border-t border-gray-700 pt-4">
                          <h5 className="text-sm font-medium text-gray-400 mb-3">
                            Ocorrências Relacionadas
                          </h5>
                          <div className="space-y-2">
                            {pattern.incidents.map((incident) => (
                              <div 
                                key={incident.Number}
                                className="bg-[#1C2333] p-3 rounded-lg flex items-center justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white">{incident.Number}</span>
                                    <span className="text-sm" style={{ 
                                      color: CHART_COLORS[normalizePriority(incident.Priority) as keyof typeof CHART_COLORS] 
                                    }}>
                                      {incident.Priority}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.State)}`}>
                                      {incident.State}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-400 mt-1">{incident.ShortDescription}</p>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    <span>{formatDate(incident.Opened)}</span>
                                    {incident.AssignmentGroup && (
                                      <>
                                        <span>•</span>
                                        <span>{incident.AssignmentGroup}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSelectedIncident(incident)}
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

          {/* Análise por Turno */}
          <div className="bg-[#1C2333] rounded-lg">
            <button
              onClick={() => toggleSection('shift-analysis')}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-medium text-white">
                  Análise por Turno
                </h3>
              </div>
              {expandedSections.includes('shift-analysis') ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedSections.includes('shift-analysis') && (
              <div className="p-4 pt-0 space-y-4">
                <p className="text-gray-300">{analysis.shiftAnalysis.summary}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(analysis.shiftAnalysis.byShift).map(([shift, data]) => (
                    <div 
                      key={shift}
                      className="bg-[#151B2B] p-4 rounded-lg space-y-4"
                    >
                      <div>
                        <h4 className="text-lg font-medium text-white mb-1">
                          {SHIFTS[shift as keyof typeof SHIFTS].name}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {SHIFTS[shift as keyof typeof SHIFTS].startTime}h às {SHIFTS[shift as keyof typeof SHIFTS].endTime}h
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Total de Chamados</span>
                          <span className="text-white font-medium">{data.total}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Incidentes Críticos</span>
                          <span className="text-red-400 font-medium">{data.criticalIncidents}</span>
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
                  <h4 className="text-lg font-medium text-white">Padrões Entre Turnos</h4>
                  <div className="space-y-2">
                    {analysis.shiftAnalysis.crossShiftPatterns.map((pattern, index) => (
                      <p key={index} className="text-yellow-200">
                        • {pattern}
                      </p>
                    ))}
                  </div>

                  <h4 className="text-lg font-medium text-white pt-4">Recomendações Gerais</h4>
                  <div className="space-y-2">
                    {analysis.shiftAnalysis.recommendations.map((rec, index) => (
                      <p key={index} className="text-yellow-200">
                        • {rec}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recomendações */}
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
                          {rec.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          rec.effort === 'quick-win' ? 'bg-green-500/20 text-green-400' :
                          rec.effort === 'medium-term' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {rec.effort}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm">{rec.description}</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className={`
                        ${rec.type === 'preventive' ? 'text-green-400' :
                        rec.type === 'process' ? 'text-blue-400' :
                        'text-yellow-400'}
                      `}>
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

          {/* Análise de Impacto */}
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
                        analysis.impact.severity >= 50 ? 'text-yellow-400' : 'text-green-400'
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
                            {group.incidents} chamados
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

          {/* Métricas de Confiança */}
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

      {/* Modal de Detalhes do Incidente */}
      {selectedIncident && (
        <IncidentDetails
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}