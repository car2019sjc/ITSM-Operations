import { Incident } from '../types/incident';

export interface TopIncidentsAIAnalysisResult {
  causaRaiz: string;
  metodologiaUtilizada: string;
  recomendacoes: string[];
  impacto: string;
  nivelConfianca: number;
  impactosDetalhados?: {
    categoria: string;
    subcategoria: string;
    quantidade: number;
    descricao?: string;
  }[];
}

export async function analyzeTopIncidentsByStringAssociado(
  incidents: Incident[],
  categoria: string,
  subcategoria?: string,
  stringAssociado?: string
): Promise<TopIncidentsAIAnalysisResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('API Key da OpenAI não configurada');

  // Montar o prompt com os dados filtrados
  const filtered = incidents.filter(inc => {
    let matches = inc.Category?.trim() === categoria;
    if (subcategoria) {
      matches = matches && (inc.Subcategory?.trim() === subcategoria || inc.ResolutionSubcategory?.trim() === subcategoria);
    }
    if (stringAssociado) {
      matches = matches && inc.StringAssociado?.trim() === stringAssociado;
    }
    return matches;
  });

  // Ordenar por recorrência (quantidade de chamados por descrição ou shortDescription)
  const countMap: Record<string, { count: number; inc: Incident }> = {};
  filtered.forEach(inc => {
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
    `Número: ${inc.Number}, Prioridade: ${inc.Priority}, Estado: ${inc.State}, Aberto em: ${inc.Opened}, Fechado em: ${inc.Closed || '-'}, Descrição: ${inc.ShortDescription}`
  ).join('\n');

  const prompt = `Você é um analista sênior de Dados de Operações de TI.
Vou fornecer um conjunto de registros de incidentes extraídos do ServiceNow, contendo para cada chamado, no mínimo, os campos:

Short description (descrição resumida do incidente)
Caller (quem abriu o chamado)
Priority (nível de prioridade)
State (estado atual: aberto, em atendimento, fechado etc.)
Category (categoria principal)
Subcategory (subcategoria)
StringAssociado (string de associação)
FuncaoAssociada (função associada)

INSTRUÇÕES INTERNAS (NÃO INCLUIR NA RESPOSTA):
Para realizar a análise, siga estas etapas:
1. Pré-processamento: Padronize textos, trate valores faltantes, analise distribuições
2. Análise exploratória: Crie tabelas de frequência e nuvens de palavras
3. Detecção de recorrências: Use clustering para agrupar incidentes similares
4. Causa-raiz: Elabore árvores de problemas para clusters relevantes
5. Considere sempre a relação entre StringAssociado e FuncaoAssociada

ESTRUTURA DA RESPOSTA:
Sua resposta DEVE seguir EXATAMENTE este formato, com as seções abaixo:

**Sumário Executivo:**
[Resumo conciso dos principais pontos encontrados na análise]

**Metodologia:**
[Descrição da abordagem utilizada para analisar os dados]

**Resultados:**
[Análise detalhada dos padrões encontrados, incluindo as top 5 combinações de Category + Subcategory]

**Causa-Raiz:**
[Identificação das causas principais dos incidentes mais recorrentes]

**Recomendações:**
[Lista de recomendações específicas para melhorar o gerenciamento de incidentes]

**Impactos Detalhados:**
[Array JSON com os top 5 impactos mais significativos, no formato:
[
  {
    "categoria": "nome da categoria",
    "subcategoria": "nome da subcategoria",
    "quantidade": número de incidentes,
    "descricao": "descrição opcional do impacto"
  }
]]

Contexto:
Categoria: ${categoria}${subcategoria ? `, Subcategoria: ${subcategoria}` : ''}${stringAssociado ? `, String Associado: ${stringAssociado}` : ''}.

Incidentes:
${incidentesStr}

IMPORTANTE: Responda apenas com as seções solicitadas, sem incluir as instruções internas.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Você é um especialista em ITSM e análise de incidentes.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error('Erro ao consultar a OpenAI: ' + response.statusText);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  console.log('Resposta bruta da IA:', content);

  // Extrair as seções do texto da IA usando delimitador correto
  const sections = content.split(/\n\*\*/);
  const sumarioExecutivo = sections.find((s: string) => s.startsWith('Sumário Executivo'))?.replace(/^Sumário Executivo:?\s*/i, '').trim() || '';
  const metodologia = sections.find((s: string) => s.startsWith('Metodologia'))?.replace(/^Metodologia:?\s*/i, '').trim() || '';
  const resultados = sections.find((s: string) => s.startsWith('Resultados'))?.replace(/^Resultados:?\s*/i, '').trim() || '';
  const causaRaiz = sections.find((s: string) => s.startsWith('Causa-Raiz') || s.startsWith('Causa Raiz'))?.replace(/^Causa[- ]?Raiz:?\s*/i, '').trim() || '';
  const recomendacoesRaw = sections.find((s: string) => s.startsWith('Recomendações'))?.replace(/^Recomendações:?\s*/i, '').trim() || '';
  const impactosDetalhadosRaw = sections.find((s: string) => s.startsWith('Impactos Detalhados'))?.replace(/^Impactos Detalhados:?\s*/i, '').trim() || '';
  
  // Log detalhado das seções extraídas
  console.log('Seções extraídas:', JSON.stringify({
    sumarioExecutivo,
    metodologia,
    resultados,
    causaRaiz,
    recomendacoesRaw,
    impactosDetalhadosRaw
  }, null, 2));

  // Processar recomendações
  const recomendacoes = recomendacoesRaw
    .split(/\n|\r/)
    .map((r: string) => r.replace(/^[-•\d.]+\s*/, '').trim())
    .filter(Boolean);

  // Processar impactos detalhados
  let impactosDetalhados;
  try {
    impactosDetalhados = JSON.parse(impactosDetalhadosRaw);
  } catch (e) {
    console.error('Erro ao processar impactos detalhados:', e);
    impactosDetalhados = [];
  }

  // Mapear as seções para os campos do retorno
  const result = {
    causaRaiz: causaRaiz || sumarioExecutivo, // Usar sumário se causa raiz estiver vazio
    metodologiaUtilizada: metodologia, // Metodologia como metodologia utilizada
    recomendacoes,
    impacto: resultados, // Resultados como impacto
    nivelConfianca: 90, // Nível de confiança padrão
    impactosDetalhados // Adicionar impactos detalhados ao resultado
  };

  // Log do resultado final
  console.log('Resultado processado:', JSON.stringify(result, null, 2));

  return result;
} 