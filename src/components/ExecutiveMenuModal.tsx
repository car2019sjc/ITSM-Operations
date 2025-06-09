import React from 'react';

interface ExecutiveMenuModalProps {
  onClose: () => void;
  onNavigate: (section: string) => void;
}

export function ExecutiveMenuModal({ onClose, onNavigate }: ExecutiveMenuModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#151B2B] rounded-lg p-8 max-w-3xl w-full relative shadow-2xl border border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
          aria-label="Fechar modal"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="inline-block bg-purple-600 rounded-full w-3 h-3"></span>
          Indicadores Executivos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button onClick={() => onNavigate('executive')} className="bg-[#1E293B] hover:bg-indigo-600 p-6 rounded-lg flex flex-col items-center transition-colors">
            <span className="text-white text-3xl mb-2">📊</span>
            <span className="text-white font-bold">Visão Consolidada</span>
            <span className="text-gray-400 text-sm">Dashboard Executivo</span>
          </button>
          <button onClick={() => onNavigate('top-categories')} className="bg-[#1E293B] hover:bg-indigo-600 p-6 rounded-lg flex flex-col items-center transition-colors">
            <span className="text-white text-3xl mb-2">📈</span>
            <span className="text-white font-bold">Top 5 Categorias</span>
            <span className="text-gray-400 text-sm">Principais categorias</span>
          </button>
          <button onClick={() => onNavigate('top-locations')} className="bg-[#1E293B] hover:bg-indigo-600 p-6 rounded-lg flex flex-col items-center transition-colors">
            <span className="text-white text-3xl mb-2">📍</span>
            <span className="text-white font-bold">Top 5 Localidades</span>
            <span className="text-gray-400 text-sm">Principais localidades</span>
          </button>
          <button onClick={() => onNavigate('monthly-summary')} className="bg-[#1E293B] hover:bg-indigo-600 p-6 rounded-lg flex flex-col items-center transition-colors">
            <span className="text-white text-3xl mb-2">📅</span>
            <span className="text-white font-bold">Sumário Mensal</span>
            <span className="text-gray-400 text-sm">Resumo mensal</span>
          </button>
          <button onClick={() => onNavigate('monthly-location-summary')} className="bg-[#1E293B] hover:bg-indigo-600 p-6 rounded-lg flex flex-col items-center transition-colors">
            <span className="text-white text-3xl mb-2">🗺️</span>
            <span className="text-white font-bold">Sumarização Mensal por Localidade</span>
            <span className="text-gray-400 text-sm">Resumo mensal por localidade</span>
          </button>
        </div>
      </div>
    </div>
  );
} 