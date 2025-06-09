import React from 'react';

// ===================== DOCUMENTAÇÃO DO COMPONENTE =====================
// MonthlySummaryModal
//
// - Exibe o sumário mensal dos indicadores (incidentes/requisições).
// - Para alterar o conteúdo, edite o corpo do modal (gráfico, texto, etc).
// - Para manutenção: mantenha a lógica de fechamento do modal desacoplada da lógica de dados.
// =====================================================================

interface MonthlySummaryModalProps {
  onClose: () => void;
}

export function MonthlySummaryModal({ onClose }: MonthlySummaryModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#151B2B] rounded-lg p-8 max-w-xl w-full relative shadow-2xl border border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
          aria-label="Fechar modal"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="inline-block bg-indigo-600 rounded-full w-3 h-3"></span>
          Sumário Mensal
        </h2>
        <div className="flex items-center justify-center h-64 text-gray-400">
          {/* Placeholder para gráfico ou conteúdo */}
          Gráfico/Indicador de Sumário Mensal aqui
        </div>
      </div>
    </div>
  );
} 