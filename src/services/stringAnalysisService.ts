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

  // Filtrar incidentes pela string selecionada (aceitando variações de chaves)
  const getStringField = (item: any): string => {
    const keys = ['StringAssociado','String Associado','String','Associado','String_Associado','Vinculo','Vínculo'];
    for (const k of keys) {
      const v = (item as any)[k];
      if (typeof v === 'string' && v.trim() !== '') return v.trim();
    }
    return 'Não Definido';
  };
  const normalizedSelected = (selectedString || '').trim();
  const filteredIncidents = incidents.filter(inc => getStringField(inc) === normalizedSelected);

  // Agregações quantitativas para basear a análise
  const byShortDesc: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byState: Record<string, number> = {};
  const byFunction: Record<string, number> = {};
  const byGroup: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  const byShift: Record<'Manhã'|'Tarde'|'Noite'|'Madrugada'|'Desconhecido', number> = { 'Manhã':0,'Tarde':0,'Noite':0,'Madrugada':0,'Desconhecido':0 };
  const getFunctionField = (item: any): string => {
    const keys = ['Função Associada','FuncaoAssociada','Funcao','Função','Nível','Nivel','NivelFuncao','NívelFunção','Nivel de Suporte','Nível de Suporte','SupportLevel','Support Level','Level','level','n1','n2','n3','N1','N2','N3'];
    for (const k of keys) {
      const v = (item as any)[k];
      if (typeof v === 'string' && v.trim() !== '') return v.trim();
    }
    return 'Não Definido';
  };
  const getShift = (dateStr?: string): keyof typeof byShift => {
    if (!dateStr) return 'Desconhecido';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Desconhecido';
    const h = d.getHours();
    if (h >= 6 && h < 12) return 'Manhã';
    if (h >= 12 && h < 18) return 'Tarde';
    if (h >= 18 && h < 24) return 'Noite';
    if (h >= 0 && h < 6) return 'Madrugada';
    return 'Desconhecido';
  };
  for (const inc of filteredIncidents) {
    const sd = inc.ShortDescription?.trim() || 'Sem descrição';
    byShortDesc[sd] = (byShortDesc[sd] || 0) + 1;
    const pr = inc.Priority || 'Não Informada';
    byPriority[pr] = (byPriority[pr] || 0) + 1;
    const st = inc.State || 'Não Informado';
    byState[st] = (byState[st] || 0) + 1;
    const fn = getFunctionField(inc);
    byFunction[fn] = (byFunction[fn] || 0) + 1;
    const grp = inc.AssignmentGroup?.trim() || 'Não Informado';
    byGroup[grp] = (byGroup[grp] || 0) + 1;
    if (inc.Opened) {
      const d = new Date(inc.Opened);
      if (!isNaN(d.getTime())) {
        const key = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        byMonth[key] = (byMonth[key] || 0) + 1;
      }
      byShift[getShift(inc.Opened)]++;
    } else {
      byShift['Desconhecido']++;
    }
  }
  const topShortExamples = Object.entries(byShortDesc).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([descricao,quantidade])=>({descricao, quantidade}));
  const aggregatedContext = {
    stringSelecionada: normalizedSelected,
    totalIncidentes: filteredIncidents.length,
    topDescricoes: topShortExamples,
    porPrioridade: byPriority,
    porEstado: byState,
    porFuncao: byFunction,
    porGrupo: byGroup,
    porMes: Object.fromEntries(Object.entries(byMonth).sort()),
    porTurno: byShift
  };

  const prompt = `Você é um analista sênior de Dados de Operações de TI.
Vou fornecer dados AGREGADOS e EXEMPLOS sobre incidentes do ServiceNow, focando na string selecionada. Baseie-se principalmente nos números agregados.

INSTRUÇÕES (NÃO INCLUIR NA RESPOSTA):
- Use somente informações que possam ser inferidas dos dados abaixo.
- Foque em padrões, hipóteses de causa-raiz e recomendações acionáveis.
- Destaque a relação entre a string, função associada, grupos e prioridades.

DADOS AGREGADOS (JSON):
${JSON.stringify(aggregatedContext, null, 2)}

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:

**Sumário Executivo:**
- Total analisado, principais padrões, impacto geral

**Metodologia:**
- Abordagem baseada nos dados agregados fornecidos

**Resultados:**
- Top descrições/recorrências (até 5), distribuição por prioridade, função, grupo, turno e tendências por mês

**Causa-Raiz:**
- Hipóteses embasadas nos números

**Recomendações:**
- Ações imediatas, melhorias de processo e prevenção

**Impactos Detalhados:**
Forneça APENAS o seguinte JSON (sem texto extra), com no máximo 5 itens:
[
  { "string": "${normalizedSelected}", "quantidade": <número>, "descricao": "<impacto objetivo com métricas>" }
]
`;

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
    const content = data.choices?.[0]?.message?.content || '';

    // Extrair as seções da resposta com validação
    let sumarioExecutivo = content.match(/Sumário Executivo:([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim() || 'Análise não disponível';
    let metodologia = content.match(/Metodologia:([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim() || 'Metodologia não disponível';
    let resultados = content.match(/Resultados:([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim() || 'Resultados não disponíveis';
    let causaRaiz = content.match(/Causa-Raiz:([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim() || 'Causa raiz não identificada';
    let recomendacoes = content.match(/Recomendações:([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim() || 'Recomendações não disponíveis';
    
    // Extrair impactos priorizando bloco ```json ... ```
    const fenced = content.match(/```json([\s\S]*?)```/i);
    const impactosMatch = fenced ? fenced : content.match(/\[([\s\S]*?)\]/);
    let impactos: Array<{ string: string; quantidade: number; descricao: string }> = [];
    if (impactosMatch) {
      try {
        const jsonStr = fenced ? fenced[1] : impactosMatch[0];
        impactos = JSON.parse(jsonStr);
        // Validar se todos os campos necessários estão presentes
        impactos = impactos.map(impacto => ({
          string: impacto.string || 'Não especificado',
          quantidade: impacto.quantidade || 0,
          descricao: impacto.descricao || 'Descrição não disponível'
        }));
      } catch (e) {
        console.error('Erro ao parsear impactos:', e);
        // Fallback: usar top descrições recorrentes
        impactos = topShortExamples.slice(0, 5).map(it => ({
          string: normalizedSelected,
          quantidade: it.quantidade,
          descricao: it.descricao
        }));
      }
    }

    // Extrair nível de confiança com validação
    const nivelConfRaw = content.match(/Nível de Confiança.*?(\d{2,3})\s*%/i)?.[1];
    const nivelConfianca = nivelConfRaw ? parseInt(nivelConfRaw, 10) : 90;

    // Validar se todos os campos obrigatórios estão preenchidos
    if (!sumarioExecutivo || !metodologia || !resultados || !causaRaiz || !recomendacoes || impactos.length === 0) {
      if (!sumarioExecutivo) sumarioExecutivo = 'Análise não disponível';
      if (!metodologia) metodologia = 'Metodologia não disponível';
      if (!resultados) resultados = 'Resultados não disponíveis';
      if (!causaRaiz) causaRaiz = 'Causa raiz não identificada';
      if (!recomendacoes) recomendacoes = 'Recomendações não disponíveis';
      if (impactos.length === 0) {
        impactos = topShortExamples.slice(0, 3).map(it => ({
          string: normalizedSelected,
          quantidade: it.quantidade,
          descricao: it.descricao
        }));
      }
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