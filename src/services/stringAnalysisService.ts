import { Incident } from '../types/incident';

export interface StringAnalysisResult {
  sumarioExecutivo: string;
  metodologia: string;
  resultados: string;
  causaRaiz: string;
  recomendacoes: string;
  impactos: Array<{
    string: string;
    quantidade: number;
    descricao: string;
  }>;
  nivelConfianca: number;
}

export async function analyzeStringDistribution(
  incidents: Incident[],
  selectedString: string
): Promise<StringAnalysisResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('API Key da OpenAI não configurada');

  // Filtrar incidentes pela string selecionada
  const filteredIncidents = incidents.filter(inc => 
    (inc.StringAssociado?.trim() || 'Não Definido') === selectedString
  );

  // Ordenar por recorrência (quantidade de chamados por descrição)
  const countMap: Record<string, { count: number; inc: Incident }> = {};
  filteredIncidents.forEach(inc => {
    const key = inc.ShortDescription?.trim() || 'Sem descrição';
    if (!countMap[key]) countMap[key] = { count: 0, inc };
    countMap[key].count++;
  });

  // Ordenar por maior recorrência
  const sortedByRecurrence = Object.values(countMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
    .map(obj => obj.inc);

  const incidentesStr = sortedByRecurrence.map(inc =>
    `Número: ${inc.Number}, Prioridade: ${inc.Priority}, Estado: ${inc.State}, Aberto em: ${inc.Opened}, Fechado em: ${inc.Closed || '-'}, Descrição: ${inc.ShortDescription}, Função: ${inc.FuncaoAssociada || 'Não Definido'}`
  ).join('\n');

  const prompt = `Você é um analista sênior de Dados de Operações de TI.
Vou fornecer um conjunto de registros de incidentes extraídos do ServiceNow, focando na análise de uma string específica.

INSTRUÇÕES INTERNAS (NÃO INCLUIR NA RESPOSTA):
Para realizar a análise, siga estas etapas:
1. Pré-processamento: Padronize textos, trate valores faltantes, analise distribuições
2. Análise exploratória: Crie tabelas de frequência e nuvens de palavras
3. Detecção de recorrências: Use clustering para agrupar incidentes similares
4. Causa-raiz: Elabore árvores de problemas para clusters relevantes
5. Considere sempre a relação entre StringAssociado e FuncaoAssociada

ESTRUTURA DA RESPOSTA:
Sua resposta DEVE seguir EXATAMENTE este formato, com as seções abaixo. TODAS as seções são OBRIGATÓRIAS e devem conter informações relevantes:

**Sumário Executivo:**
[Resumo conciso dos principais pontos encontrados na análise, incluindo:
- Total de incidentes analisados
- Principais padrões identificados
- Impacto geral na operação]

**Metodologia:**
[Descrição detalhada da abordagem utilizada, incluindo:
- Técnicas de análise aplicadas
- Critérios de agrupamento
- Ferramentas e métodos utilizados]

**Resultados:**
[Análise detalhada dos padrões encontrados, incluindo:
- Top 5 combinações de incidentes mais recorrentes
- Distribuição por prioridade
- Distribuição por função
- Tendências temporais]

**Causa-Raiz:**
[Identificação das causas principais, incluindo:
- Fatores técnicos identificados
- Fatores operacionais
- Relação com processos existentes]

**Recomendações:**
[Lista de recomendações específicas, incluindo:
- Ações imediatas
- Melhorias de processo
- Prevenção de recorrência]

**Impactos Detalhados:**
[Array JSON com os top 5 impactos mais significativos, no formato:
[
  {
    "string": "nome da string",
    "quantidade": número de incidentes,
    "descricao": "descrição detalhada do impacto, incluindo métricas e consequências"
  }
]]

Contexto:
String Analisada: ${selectedString}
Total de Incidentes: ${filteredIncidents.length}

Incidentes:
${incidentesStr}

IMPORTANTE: 
1. Responda apenas com as seções solicitadas, sem incluir as instruções internas
2. TODAS as seções são OBRIGATÓRIAS e devem conter informações relevantes
3. Use dados quantitativos sempre que possível
4. Mantenha um tom profissional e técnico
5. Inclua métricas e números específicos nas análises`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Você é um analista sênior de Dados de Operações de TI, especializado em análise de incidentes. Sua análise deve ser completa, detalhada e baseada em dados.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      throw new Error('Erro na chamada à API da OpenAI');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Extrair as seções da resposta com validação
    const sumarioExecutivo = content.match(/Sumário Executivo:([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim() || 'Análise não disponível';
    const metodologia = content.match(/Metodologia:([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim() || 'Metodologia não disponível';
    const resultados = content.match(/Resultados:([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim() || 'Resultados não disponíveis';
    const causaRaiz = content.match(/Causa-Raiz:([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim() || 'Causa raiz não identificada';
    const recomendacoes = content.match(/Recomendações:([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim() || 'Recomendações não disponíveis';
    
    // Extrair impactos do JSON com validação
    const impactosMatch = content.match(/\[([\s\S]*?)\]/);
    let impactos: Array<{ string: string; quantidade: number; descricao: string }> = [];
    if (impactosMatch) {
      try {
        impactos = JSON.parse(impactosMatch[0]);
        // Validar se todos os campos necessários estão presentes
        impactos = impactos.map(impacto => ({
          string: impacto.string || 'Não especificado',
          quantidade: impacto.quantidade || 0,
          descricao: impacto.descricao || 'Descrição não disponível'
        }));
      } catch (e) {
        console.error('Erro ao parsear impactos:', e);
        impactos = [{
          string: selectedString,
          quantidade: filteredIncidents.length,
          descricao: 'Erro ao processar impactos detalhados'
        }];
      }
    }

    // Extrair nível de confiança com validação
    const nivelConfRaw = content.match(/Nível de Confiança.*?(\d{2,3})\s*%/i)?.[1];
    const nivelConfianca = nivelConfRaw ? parseInt(nivelConfRaw, 10) : 90;

    // Validar se todos os campos obrigatórios estão preenchidos
    if (!sumarioExecutivo || !metodologia || !resultados || !causaRaiz || !recomendacoes || impactos.length === 0) {
      throw new Error('Análise incompleta: alguns campos obrigatórios não foram preenchidos');
    }

    return {
      sumarioExecutivo,
      metodologia,
      resultados,
      causaRaiz,
      recomendacoes,
      impactos,
      nivelConfianca
    };
  } catch (error) {
    console.error('Erro na análise de strings:', error);
    throw error;
  }
} 