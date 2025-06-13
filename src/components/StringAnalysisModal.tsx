import React, { useState, useEffect } from 'react';
import { Incident } from '../types/incident';
import { StringAnalysisResult, analyzeStringDistribution } from '../services/stringAnalysisService';

interface StringAnalysisModalProps {
  incidents: Incident[];
  selectedString: string;
  onClose: () => void;
}

export const StringAnalysisModal: React.FC<StringAnalysisModalProps> = ({
  incidents,
  selectedString,
  onClose
}) => {
  const [analysis, setAnalysis] = useState<StringAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIncidentsModal, setShowIncidentsModal] = useState(false);
  const [incidentsToShow, setIncidentsToShow] = useState<Incident[]>([]);
  const [impactTitle, setImpactTitle] = useState('');

  useEffect(() => {
    const performAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await analyzeStringDistribution(incidents, selectedString);
        setAnalysis(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao realizar análise');
      } finally {
        setLoading(false);
      }
    };

    performAnalysis();
  }, [incidents, selectedString]);

  // Função para abrir o modal de incidentes relacionados ao impacto
  const handleShowIncidents = (impactoString: string, impactoTitulo: string) => {
    // Busca por palavras-chave do impacto na descrição
    const keywords = impactoString.split(/\s+/).map(w => w.toLowerCase()).filter(Boolean);
    const related = incidents.filter(inc => {
      if (!inc.ShortDescription) return false;
      const desc = inc.ShortDescription.toLowerCase();
      return keywords.some(word => desc.includes(word));
    });
    setIncidentsToShow(related);
    setImpactTitle(impactoTitulo);
    setShowIncidentsModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#151B2B] rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Análise de String: {selectedString}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-300 mt-4">Realizando análise...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {analysis && (
          <div className="space-y-6 text-gray-200">
            {analysis.sumarioExecutivo && !/não disponível/i.test(analysis.sumarioExecutivo) && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Sumário Executivo</h3>
                <p className="text-gray-300">{analysis.sumarioExecutivo}</p>
              </div>
            )}

            {analysis.metodologia && !/não disponível/i.test(analysis.metodologia) && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Metodologia</h3>
                <p className="text-gray-300">{analysis.metodologia}</p>
              </div>
            )}

            {analysis.causaRaiz && !/não identificada|não disponível/i.test(analysis.causaRaiz) && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Causa-Raiz</h3>
                <p className="text-gray-300">{analysis.causaRaiz}</p>
              </div>
            )}

            {analysis.impactos && Array.isArray(analysis.impactos) && analysis.impactos.length > 0 &&
              analysis.impactos.some(impacto => !/não disponível|erro/i.test(impacto.descricao)) && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Impactos Detalhados</h3>
                <div className="space-y-4">
                  {analysis.impactos.filter(impacto => !/não disponível|erro/i.test(impacto.descricao)).map((impacto, index) => (
                    <div key={index} className="bg-gray-800 p-4 rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{impacto.string}</span>
                        <span className="text-blue-400 flex items-center gap-2">
                          {impacto.quantidade} incidentes
                          <button
                            title="Ver incidentes relacionados"
                            onClick={() => handleShowIncidents(impacto.string, impacto.string)}
                            className="ml-1 text-gray-300 hover:text-blue-400 focus:outline-none"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </span>
                      </div>
                      <p className="mt-2 text-gray-400">{impacto.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showIncidentsModal && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                <div className="bg-[#1a2236] rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto relative">
                  <button
                    onClick={() => setShowIncidentsModal(false)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <h4 className="text-lg font-bold text-white mb-4">Incidentes relacionados: {impactTitle}</h4>
                  {incidentsToShow.length === 0 ? (
                    <p className="text-gray-300">Nenhum incidente encontrado.</p>
                  ) : (
                    <table className="w-full text-left text-gray-200">
                      <thead>
                        <tr>
                          <th className="py-1 px-2">Número</th>
                          <th className="py-1 px-2">Data</th>
                          <th className="py-1 px-2">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incidentsToShow.map((inc, idx) => (
                          <tr key={idx} className="border-b border-gray-700">
                            <td className="py-1 px-2">{inc.Number}</td>
                            <td className="py-1 px-2">{inc.Opened}</td>
                            <td className="py-1 px-2">{inc.ShortDescription}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {analysis.nivelConfianca && (
              <div className="text-right text-sm text-gray-400">
                Nível de Confiança: {analysis.nivelConfianca}%
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 