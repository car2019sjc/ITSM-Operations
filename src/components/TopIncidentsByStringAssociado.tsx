import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChevronLeft, ExternalLink, Brain } from 'lucide-react';
import { Incident } from '../types/incident';
import { AIAnalysisModal } from './AIAnalysisModal';
import { analyzeTopIncidentsByStringAssociado } from '../services/aiTopIncidentsService';

interface Props {
  incidents: Incident[];
  onBack: () => void;
  onShowIncidentDetails: (incident: Incident) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// ===================== DOCUMENTAÇÃO DO COMPONENTE =====================
// TopIncidentsByStringAssociado
//
// - Drilldown interativo: permite navegação por Categoria, Subcategoria e String Associado.
// - Botão 'Analisar com IA':
//   - No nível de Categoria: abre modal para escolher a categoria a ser analisada pela IA.
//   - No nível de Subcategoria: abre modal para escolher a subcategoria a ser analisada pela IA.
//   - Após a escolha, a IA analisa apenas o contexto selecionado e exibe o resultado em modal padronizado.
// - Modais inline, sem dependências externas, para escolha e análise.
// - O serviço de IA limita a análise aos 50 chamados mais recorrentes do contexto.
// - Para manutenção: mantenha a lógica de seleção e análise separada, e adapte o fluxo para outros níveis se necessário.
// =====================================================================

/**
 * Componente TopIncidentsByStringAssociado
 *
 * Este componente exibe um drilldown interativo dos chamados, permitindo visualizar os Top N (5, 10, 20) por Categoria, Subcategoria e String Associado.
 * O usuário pode navegar entre os níveis de agrupamento e visualizar detalhes dos chamados clicando nos gráficos.
 *
 * Localização: Dashboard > Indicadores Operacionais > Top Chamados – Drilldown por String Associado
 */
export const TopIncidentsByStringAssociado: React.FC<Props> = ({ incidents, onBack, onShowIncidentDetails }) => {
  // Estados para cada nível do drilldown
  const [categoria, setCategoria] = useState<string | null>(null);
  const [subcategoria, setSubcategoria] = useState<string | null>(null);
  const [stringAssociado, setStringAssociado] = useState<string | null>(null);
  const [topN, setTopN] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysis, setAIAnalysis] = useState<any>(null);
  const [aiLoading, setAILoading] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [showSubcategorySelect, setShowSubcategorySelect] = useState(false);

  useEffect(() => {
    setLoading(false);
    console.log('Valor atual de topN:', topN);
  }, [incidents, topN]);

  // Nível 1: Categorias
  const categoriasData = useMemo(() => {
    if (!incidents) return [];
    const counts: Record<string, number> = {};
    incidents.forEach(inc => {
      const cat = inc.Category?.trim() || 'Não Definido';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([name, value]) => ({ name, value }));
  }, [incidents, topN]);

  // Nível 2: Subcategorias
  const subcategoriasData = useMemo(() => {
    if (!categoria) return [];
    const filtered = incidents.filter(inc => (inc.Category?.trim() || 'Não Definido') === categoria);
    const counts: Record<string, number> = {};
    filtered.forEach(inc => {
      const sub = inc.Subcategory?.trim() || inc.ResolutionSubcategory?.trim() || 'Não Definido';
      counts[sub] = (counts[sub] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([name, value]) => ({ name, value }));
  }, [categoria, incidents, topN]);

  // Nível 3: String Associado
  const stringsAssociadoData = useMemo(() => {
    if (!categoria || !subcategoria) return [];
    const filtered = incidents.filter(inc =>
      (inc.Category?.trim() || 'Não Definido') === categoria &&
      ((inc.Subcategory?.trim() || inc.ResolutionSubcategory?.trim() || 'Não Definido') === subcategoria)
    );
    const counts: Record<string, number> = {};
    filtered.forEach(inc => {
      const str = inc.StringAssociado?.trim() || 'Não Definido';
      counts[str] = (counts[str] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([name, value]) => ({ name, value }));
  }, [categoria, subcategoria, incidents, topN]);

  // Nível 4: Detalhes dos chamados
  const incidentesDetalhados = useMemo(() => {
    if (!categoria || !subcategoria || !stringAssociado) return [];
    return incidents.filter(inc =>
      (inc.Category?.trim() || 'Não Definido') === categoria &&
      ((inc.Subcategory?.trim() || inc.ResolutionSubcategory?.trim() || 'Não Definido') === subcategoria) &&
      (inc.StringAssociado?.trim() || 'Não Definido') === stringAssociado
    );
  }, [categoria, subcategoria, stringAssociado, incidents]);

  // Função utilitária para altura dinâmica
  function getChartHeight(dataLength: number) {
    if (dataLength <= 5) return 260;
    if (dataLength <= 10) return 320;
    if (dataLength <= 15) return 380;
    if (dataLength <= 20) return 440;
    return 500;
  }

  const handleAIAnalysis = () => {
    setShowCategorySelect(true);
  };

  const handleCategorySelect = async (category: string) => {
    setSelectedCategory(category);
    setShowCategorySelect(false);
    setAILoading(true);
    setShowAIAnalysis(true);
    try {
      const analysis = await analyzeTopIncidentsByStringAssociado(
        incidents,
        category
      );
      setAIAnalysis(analysis);
    } catch (error) {
      console.error('Erro na análise de IA:', error);
      setAIAnalysis(null);
    } finally {
      setAILoading(false);
    }
  };

  const handleCloseAIAnalysis = () => {
    setShowAIAnalysis(false);
    setSelectedCategory(null);
    setAIAnalysis(null);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  // Nível 4: Detalhes dos chamados
  if (categoria && subcategoria && stringAssociado) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setStringAssociado(null)} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-semibold">Chamados: {stringAssociado}</h2>
        </div>
        <div className="space-y-4">
          {incidentesDetalhados.length === 0 && (
            <div className="text-gray-400">Nenhum chamado encontrado para este grupo.</div>
          )}
          {incidentesDetalhados.map((inc, idx) => (
            <div key={inc.Number || idx} className="bg-[#1E293B] rounded-lg p-4 flex flex-col gap-2 shadow-md relative">
              <div className="flex items-center gap-3 mb-1 justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-green-400">{inc.Number}</span>
                  <span className="text-sm font-semibold text-blue-400">{inc.Priority}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${inc.State === 'Assigned' ? 'bg-yellow-600 text-white' : inc.State === 'In Progress' ? 'bg-blue-600 text-white' : inc.State === 'Resolved' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}>{inc.State}</span>
                </div>
                <button
                  onClick={() => onShowIncidentDetails(inc)}
                  className="text-blue-400 hover:text-blue-300"
                  title="Ver detalhes do chamado"
                  style={{ position: 'absolute', top: 16, right: 16 }}
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
              </div>
              <div className="text-white font-medium text-base">
                {inc.ShortDescription}
              </div>
              {inc.StringAssociado && (
                <div className="text-xs text-gray-400">{inc.StringAssociado}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Nível 3: String Associado
  if (categoria && subcategoria) {
    const chartHeight = getChartHeight(stringsAssociadoData.length);
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setSubcategoria(null)} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-semibold">Strings Associadas: {subcategoria}</h2>
        </div>
        <div className="flex gap-2 mb-4 justify-end">
          <button onClick={() => setTopN(5)} className="px-3 py-1 rounded bg-blue-500 text-white">Top 5</button>
          <button onClick={() => setTopN(10)} className="px-3 py-1 rounded bg-blue-500 text-white">Top 10</button>
          <button onClick={() => setTopN(20)} className="px-3 py-1 rounded bg-blue-500 text-white">Top 20</button>
        </div>
        <div style={{ height: chartHeight + 'px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stringsAssociadoData} barCategoryGap={stringsAssociadoData.length === 1 ? '40%' : '20%'} barGap={20}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis />
              <Tooltip wrapperStyle={{ zIndex: 1000 }} formatter={(value: number, name: string) => [`${value} chamados`, name]} />
              <Legend />
              <Bar dataKey="value" name="Quantidade de Chamados" fill="#3b82f6" onClick={(_, idx) => setStringAssociado(stringsAssociadoData[idx].name)} cursor="pointer">
                {stringsAssociadoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {stringsAssociadoData.length === 1 && (
          <div className="text-gray-400 mt-4">Apenas uma string associada encontrada para esta subcategoria.</div>
        )}
      </div>
    );
  }

  // Nível 2: Subcategoria
  if (categoria) {
    const chartHeight = getChartHeight(subcategoriasData.length);
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setCategoria(null)} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold">Subcategorias: {categoria}</h2>
          </div>
          <button
            onClick={() => setShowSubcategorySelect(true)}
            className="flex items-center gap-2 px-4 py-2 rounded bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            <Brain className="w-5 h-5" />
            Analisar com IA
          </button>
        </div>
        <div className="flex gap-2 mb-4 justify-end">
          <button onClick={() => setTopN(5)} className="px-3 py-1 rounded bg-blue-500 text-white">Top 5</button>
          <button onClick={() => setTopN(10)} className="px-3 py-1 rounded bg-blue-500 text-white">Top 10</button>
          <button onClick={() => setTopN(20)} className="px-3 py-1 rounded bg-blue-500 text-white">Top 20</button>
        </div>
        <div style={{ height: chartHeight + 'px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subcategoriasData} barCategoryGap={subcategoriasData.length === 1 ? '40%' : '20%'} barGap={20}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis />
              <Tooltip wrapperStyle={{ zIndex: 1000 }} formatter={(value: number, name: string) => [`${value} chamados`, name]} />
              <Legend />
              <Bar dataKey="value" name="Quantidade de Chamados" fill="#3b82f6" onClick={(_, idx) => {
                setSubcategoria(subcategoriasData[idx].name);
                setSelectedSubcategory(subcategoriasData[idx].name);
              }} cursor="pointer">
                {subcategoriasData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {subcategoriasData.length === 1 && (
          <div className="text-gray-400 mt-4">Apenas uma subcategoria encontrada para esta categoria.</div>
        )}
        {showSubcategorySelect && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1E293B] rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">Escolha uma subcategoria para análise</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {subcategoriasData.map(subcat => (
                  <button
                    key={subcat.name}
                    onClick={async () => {
                      setSelectedSubcategory(subcat.name);
                      setShowSubcategorySelect(false);
                      setAILoading(true);
                      setShowAIAnalysis(true);
                      try {
                        const analysis = await analyzeTopIncidentsByStringAssociado(
                          incidents,
                          categoria,
                          subcat.name
                        );
                        setAIAnalysis(analysis);
                      } catch (error) {
                        console.error('Erro na análise de IA:', error);
                        setAIAnalysis(null);
                      } finally {
                        setAILoading(false);
                      }
                    }}
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors w-full text-left"
                  >
                    {subcat.name} <span className="text-xs text-gray-200 ml-2">({subcat.value} chamados)</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowSubcategorySelect(false)}
                className="mt-6 px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 w-full"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        <AIAnalysisModal
          isOpen={showAIAnalysis}
          onClose={handleCloseAIAnalysis}
          categoria={categoria}
          subcategoria={selectedSubcategory || subcategoria || undefined}
          stringAssociado={undefined}
          analysis={aiAnalysis}
          loading={aiLoading}
          incidents={incidents}
        />
      </div>
    );
  }

  // Nível 1: Categoria
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-semibold">Top Chamados por Categoria</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAIAnalysis}
            className="flex items-center gap-2 px-4 py-2 rounded bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            <Brain className="w-5 h-5" />
            Analisar com IA
          </button>
          <div className="flex gap-2">
            <button onClick={() => setTopN(5)} className="px-3 py-1 rounded bg-blue-500 text-white">Top 5</button>
            <button onClick={() => setTopN(10)} className="px-3 py-1 rounded bg-blue-500 text-white">Top 10</button>
            <button onClick={() => setTopN(20)} className="px-3 py-1 rounded bg-blue-500 text-white">Top 20</button>
          </div>
        </div>
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categoriasData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
            <YAxis />
            <Tooltip formatter={(value: number, name: string) => [`${value} chamados`, name]} />
            <Legend />
            <Bar dataKey="value" name="Quantidade de Chamados" fill="#3b82f6" onClick={(_, idx) => setCategoria(categoriasData[idx].name)} cursor="pointer">
              {categoriasData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {showCategorySelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1E293B] rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Escolha uma categoria para análise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoriasData.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => handleCategorySelect(cat.name)}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors w-full text-left"
                >
                  {cat.name} <span className="text-xs text-gray-200 ml-2">({cat.value} chamados)</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCategorySelect(false)}
              className="mt-6 px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 w-full"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      <AIAnalysisModal
        isOpen={showAIAnalysis}
        onClose={handleCloseAIAnalysis}
        categoria={selectedCategory || ''}
        subcategoria={selectedSubcategory || undefined}
        stringAssociado={undefined}
        analysis={aiAnalysis}
        loading={aiLoading}
        incidents={incidents}
      />
      {/* Rodapé de referência do componente */}
      <div className="fixed bottom-2 left-2 text-xs text-gray-400 z-50 select-none pointer-events-none">
        CD01
      </div>
    </div>
  );
}; 