import React from 'react';
import { X, Brain, Lightbulb, BarChart2, Zap, CheckCircle2, AlertCircle, Clock, Info } from 'lucide-react';

interface AIAnalysisResult {
  causaRaiz: string;
  analiseTurno: string;
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

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoria: string;
  subcategoria?: string;
  stringAssociado?: string;
  analysis: AIAnalysisResult | null;
  loading: boolean;
  incidents: any[];
}

const cleanText = (txt?: string) => (typeof txt === 'string' ? txt.replace(/\*\*/g, '').trim() : '');

const AnalysisBlock: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tooltip?: string;
  className?: string;
}> = ({ icon, title, children, tooltip, className = '' }) => (
  <div className={`bg-[#1E233B] rounded-lg p-5 flex flex-col gap-2 shadow transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 ${className}`}>
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {tooltip && (
        <div className="group relative">
          <Info className="w-4 h-4 text-gray-400 cursor-help" />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            {tooltip}
          </div>
        </div>
      )}
    </div>
    <div className="text-gray-300 text-base">{children}</div>
  </div>
);

export const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({
  isOpen,
  onClose,
  categoria,
  subcategoria,
  stringAssociado,
  analysis,
  loading,
  incidents
}) => {
  if (!isOpen) return null;

  // Fallback para calcular os números dos cards de resumo
  let totalIncidentes = 0;
  let topCategoria = categoria;
  let topRecorrencia: string | number = 0;

  // Calcular total de incidentes baseado nos dados filtrados
  if (Array.isArray(analysis?.impactosDetalhados) && analysis.impactosDetalhados.length > 0) {
    // Usar os dados estruturados da IA
    totalIncidentes = analysis.impactosDetalhados.reduce((acc, item) => acc + (item.quantidade || 0), 0);
    topCategoria = analysis.impactosDetalhados[0]?.categoria || categoria;
    topRecorrencia = analysis.impactosDetalhados[0]?.quantidade || 0;
  } else if (analysis && analysis.impacto) {
    // Extrair dados do texto da análise
    const texto = cleanText(analysis.impacto);
    const linhas = texto.split('\n').filter(l => /^\d+\./.test(l));
    
    // Extrair quantidades usando diferentes padrões
    const quantidades = linhas.map(linha => {
      const match = linha.match(/-\s*(\d+)\s*(incidente|caso|chamado)?/i);
      if (match) return parseInt(match[1], 10);
      const match2 = linha.match(/(\d+)\s*(incidente|caso|chamado)/i);
      if (match2) return parseInt(match2[1], 10);
      const match3 = linha.match(/(\d+)/);
      if (match3) return parseInt(match3[1], 10);
      return 0;
    }).filter(Boolean);

    // Calcular total de incidentes
    totalIncidentes = quantidades.reduce((a, b) => a + b, 0);
    
    // Determinar recorrência
    if (quantidades.length > 0 && quantidades.every(q => q === 1)) {
      topRecorrencia = 'Sem recorrência significativa';
    } else {
      topRecorrencia = quantidades[0] || linhas.length || 0;
    }

    // Extrair categoria top
    if (linhas.length > 0) {
      const matchCat = linhas[0].match(/\d+\.\s*([\w\-]+)/);
      if (matchCat) topCategoria = matchCat[1];
    }

    // Se não encontrou total, usar número de linhas
    if (totalIncidentes === 0) totalIncidentes = linhas.length;
  }
  const nivelConfianca = analysis?.nivelConfianca || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#151B2B] rounded-xl p-0 w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl border border-gray-700">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-700 bg-[#181F36]">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-orange-400" />
            <h2 className="text-3xl font-bold text-white">Análise Inteligente dos Incidentes</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors duration-200">
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Categoria selecionada */}
        <div className="px-8 pt-6 pb-2 flex flex-wrap gap-4 items-center">
          <span className="flex items-center gap-2">
            <b className="text-blue-300">Categoria:</b>
            <span className="bg-blue-900/30 px-2 py-1 rounded text-white">{categoria}</span>
          </span>
          {subcategoria && (
            <span className="flex items-center gap-2">
              <b className="text-blue-300">Subcategoria:</b>
              <span className="bg-blue-900/30 px-2 py-1 rounded text-white">{subcategoria}</span>
            </span>
          )}
          {stringAssociado && (
            <span className="flex items-center gap-2">
              <b className="text-blue-300">String Associado:</b>
              <span className="bg-blue-900/30 px-2 py-1 rounded text-white">{stringAssociado}</span>
            </span>
          )}
        </div>

        {/* Blocos de análise centralizados */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
            <span className="text-orange-300 text-lg font-semibold">Analisando dados com IA...</span>
            <span className="text-gray-400 mt-2">Isso pode levar alguns segundos dependendo do volume de dados.</span>
          </div>
        ) : analysis ? (
          <div className="px-8 pb-8 flex flex-col gap-6">
            {/* Causa Raiz */}
            <AnalysisBlock
              icon={<BarChart2 className="w-5 h-5 text-orange-400" />}
              title="Causa Raiz"
              tooltip="Principais causas dos incidentes analisados"
            >
              <p className="leading-relaxed">{cleanText(analysis.causaRaiz)}</p>
            </AnalysisBlock>

            {/* Recomendações Inteligentes */}
            <AnalysisBlock
              icon={<Lightbulb className="w-5 h-5 text-yellow-400" />}
              title="Recomendações Inteligentes"
              tooltip="Sugestões baseadas na análise de IA para melhorar os processos"
            >
              <ul className="list-disc list-inside space-y-2">
                {analysis.recomendacoes
                  .map((rec) => cleanText(rec))
                  .filter((rec) => rec.length > 0)
                  .map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
              </ul>
            </AnalysisBlock>

            {/* Análise de Impacto */}
            <AnalysisBlock
              icon={<Zap className="w-5 h-5 text-pink-400" />}
              title="Análise de Impacto"
              tooltip="Top 5 agrupamentos de Category + Subcategory mais recorrentes"
            >
              {Array.isArray(analysis.impactosDetalhados) && analysis.impactosDetalhados.length > 0 ? (
                <>
                  <ol className="space-y-2">
                    {analysis.impactosDetalhados.map((item, idx) => (
                      <li key={idx}>
                        <span className="font-bold text-pink-400">{idx + 1}.</span>{' '}
                        <span className="font-semibold">{item.categoria}</span>
                        {item.descricao && <span>: {item.descricao}</span>}
                        <span> – {item.quantidade} incidente{item.quantidade > 1 ? 's' : ''}</span>
                      </li>
                    ))}
                  </ol>
                  {/* Localidades mais afetadas */}
                  <div className="mt-6">
                    <span className="font-bold text-blue-300">Localidades mais afetadas:</span>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      {(() => {
                        // Agrupar e ordenar localidades
                        const counts: Record<string, number> = {};
                        incidents.forEach((inc: any) => {
                          const loc = inc.StringAssociado?.trim() || 'Não Definido';
                          counts[loc] = (counts[loc] || 0) + 1;
                        });
                        return Object.entries(counts)
                          .sort((a, b) => (b[1] as number) - (a[1] as number))
                          .slice(0, 5)
                          .map(([loc, count], idx) => (
                            <li key={loc}>
                              <span className="font-semibold text-blue-400">{loc}</span> — {count as number} incidente{(count as number) > 1 ? 's' : ''}
                            </li>
                          ));
                      })()}
                    </ol>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {cleanText(analysis.impacto).split('\n').map((line, index) => {
                    const isNumberedLine = /^\d+\./.test(line);
                    if (isNumberedLine) {
                      const [number, ...content] = line.split('.');
                      return (
                        <div key={index} className="flex gap-2 items-start">
                          <span className="font-bold text-pink-400 mt-1">{number}.</span>
                          <span className="leading-relaxed">{content.join('.').trim()}</span>
                        </div>
                      );
                    }
                    return <p key={index} className="leading-relaxed">{line}</p>;
                  })}
                </div>
              )}
            </AnalysisBlock>
          </div>
        ) : (
          <div className="text-red-500 font-semibold p-4 bg-red-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 inline-block mr-2" />
            Erro ao carregar a análise.
          </div>
        )}
      </div>
    </div>
  );
}; 