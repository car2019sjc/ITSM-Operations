import { Incident } from '../types/incident';

interface AIAnalysisResult {
  causaRaiz: string;
  analiseTurno: string;
  recomendacoes: string[];
  impacto: string;
  nivelConfianca: number;
}

export const analyzeIncidents = async (
  incidents: Incident[],
  categoria: string,
  subcategoria?: string,
  stringAssociado?: string
): Promise<AIAnalysisResult> => {
  try {
    // Aqui você implementará a chamada real para sua API de IA
    // Por enquanto, vamos retornar uma análise simulada
    const filteredIncidents = incidents.filter(inc => {
      let matches = inc.Category?.trim() === categoria;
      if (subcategoria) {
        matches = matches && (inc.Subcategory?.trim() === subcategoria || inc.ResolutionSubcategory?.trim() === subcategoria);
      }
      if (stringAssociado) {
        matches = matches && inc.StringAssociado?.trim() === stringAssociado;
      }
      return matches;
    });

    // Simular uma análise baseada nos incidentes filtrados
    const totalIncidents = filteredIncidents.length;
    const priorityDistribution = filteredIncidents.reduce((acc, inc) => {
      acc[inc.Priority] = (acc[inc.Priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Gerar análise simulada
    return {
      causaRaiz: `Análise de ${totalIncidents} incidentes na categoria ${categoria}${
        subcategoria ? `, subcategoria ${subcategoria}` : ''
      }${
        stringAssociado ? `, string associado ${stringAssociado}` : ''
      }. Distribuição de prioridades: ${Object.entries(priorityDistribution)
        .map(([priority, count]) => `${priority}: ${count}`)
        .join(', ')}.`,
      
      analiseTurno: `Análise por turno baseada nos ${totalIncidents} incidentes. Padrões de ocorrência e resolução por período do dia.`,
      
      recomendacoes: [
        `Implementar monitoramento proativo para ${categoria}`,
        `Revisar procedimentos de atendimento para incidentes de alta prioridade`,
        `Treinar equipe em resolução de problemas específicos da categoria`,
        `Estabelecer métricas de acompanhamento para melhorar o tempo de resolução`
      ],
      
      impacto: `Impacto nos serviços: ${totalIncidents} incidentes afetaram os serviços. Necessidade de ações preventivas para reduzir recorrência.`,
      
      nivelConfianca: Math.min(85 + Math.floor(Math.random() * 10), 95) // Simular um nível de confiança entre 85% e 95%
    };
  } catch (error) {
    console.error('Erro na análise de IA:', error);
    throw new Error('Falha ao realizar análise de IA');
  }
}; 