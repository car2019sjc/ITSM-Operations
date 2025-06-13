import React from 'react';

interface ComponentInfo {
  name: string;
  type: 'Filtro' | 'Modal' | 'Componente Auxiliar';
  description: string;
  file: string;
}

const auxiliaryComponents: ComponentInfo[] = [
  {
    name: 'CalendarSelector',
    type: 'Filtro',
    description: 'Seletor de período para análise de dados',
    file: 'CalendarSelector.tsx'
  },
  {
    name: 'CategoryFilter',
    type: 'Filtro',
    description: 'Filtro por categorias de incidentes',
    file: 'CategoryFilter.tsx'
  },
  {
    name: 'DateRangeFilter',
    type: 'Filtro',
    description: 'Filtro por intervalo de datas',
    file: 'DateRangeFilter.tsx'
  },
  {
    name: 'SearchBar',
    type: 'Componente Auxiliar',
    description: 'Barra de pesquisa para busca de incidentes',
    file: 'SearchBar.tsx'
  },
  {
    name: 'IncidentModal',
    type: 'Modal',
    description: 'Modal com detalhes do incidente',
    file: 'IncidentModal.tsx'
  },
  {
    name: 'PendingIncidentsModal',
    type: 'Modal',
    description: 'Modal de incidentes pendentes',
    file: 'PendingIncidentsModal.tsx'
  },
  {
    name: 'CriticalIncidentsModal',
    type: 'Modal',
    description: 'Modal de incidentes críticos',
    file: 'CriticalIncidentsModal.tsx'
  },
  {
    name: 'SLAIncidentsModal',
    type: 'Modal',
    description: 'Modal de incidentes fora do SLA',
    file: 'SLAIncidentsModal.tsx'
  },
  {
    name: 'StatsCard',
    type: 'Componente Auxiliar',
    description: 'Card para exibição de estatísticas',
    file: 'StatsCard.tsx'
  },
  {
    name: 'PriorityAlert',
    type: 'Componente Auxiliar',
    description: 'Alerta de prioridade',
    file: 'PriorityAlert.tsx'
  }
];

const AuxiliaryComponentsTable: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Componentes Auxiliares</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descrição
              </th>
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Arquivo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {auxiliaryComponents.map((component, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {component.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {component.type}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {component.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {component.file}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuxiliaryComponentsTable; 