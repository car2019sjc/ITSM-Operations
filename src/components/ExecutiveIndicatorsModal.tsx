import React from 'react';

// ===================== DOCUMENTAÇÃO DO COMPONENTE =====================
// ExecutiveIndicatorsModal
//
// - Exibe os indicadores executivos detalhados em formato de lista ou painel.
// - Para alterar os indicadores exibidos, edite a prop 'indicadores' passada ao componente.
// - Para manutenção: mantenha a lógica de fechamento do modal desacoplada da lógica de dados.
// =====================================================================

interface ExecutiveIndicatorsModalProps {
  onClose: () => void;
  indicadores: { nome: string; valor: string | number }[];
}

export function ExecutiveIndicatorsModal({ onClose, indicadores }: ExecutiveIndicatorsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#151B2B] rounded-lg p-8 max-w-2xl w-full relative shadow-2xl border border-gray-700">
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
        <ul className="space-y-4">
          {indicadores.map((item, idx) => (
            <li key={idx} className="flex justify-between items-center bg-[#1C2333] rounded-lg px-4 py-3">
              <span className="text-gray-300 font-medium">{item.nome}</span>
              <span className="text-white text-lg font-bold">{item.valor}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 