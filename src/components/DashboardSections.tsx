import React, { useState } from 'react';
import { 
  BarChart3, 
  Monitor, 
  HardDrive, 
  Users, 
  Clock, 
  UserCircle,
  AlertOctagon,
  MapPin,
  History,
  AlertCircle,
  PauseCircle,
  Timer,
  Brain,
  UserCog,
  FileText,
  PieChart,
  TrendingUp,
  Target,
  LineChart,
  BarChart2,
  Users2,
  X,
  Calendar
} from 'lucide-react';
import { AssociatedIndicatorsAnalysis } from './AssociatedIndicatorsAnalysis';
import { WeekendIncidentsAnalysis } from './WeekendIncidentsAnalysis';

// Adicione o tipo para os itens das seções
interface DashboardSectionItem {
  title: string;
  description: string;
  icon: any;
  sectionKey?: string;
  onClick: () => void;
}

// Atualize o tipo das seções
interface DashboardSectionsProps {
  onSectionClick: (section: string) => void;
  activeSection: string | null;
  onShowPendingIncidents: () => void;
  data: any[];
  dateRange: { start: Date; end: Date };
}

// ===================== ATENÇÃO =====================\n// A seção 'Indicadores Estratégicos' agora exibe cards/botões de navegação, similar à seção 'Indicadores Operacionais'.\n// Cada botão, ao ser clicado, ativa a análise correspondente via handleSectionClick.\n// Para alterar os cards ou adicionar novas funcionalidades, edite o objeto 'sections' na chave 'estrategico'.\n// ===================================================\n

// ===================== DOCUMENTAÇÃO DA SEÇÃO PREDITIVA =====================
// Seção: Análise Preditiva - IA
//
// - Cards disponíveis:
//   - Análise Preditiva: ativa painel de previsões e tendências com IA.
//   - Análise por Analista: ativa painel de desempenho individual.
//   - Análise por Turno: ativa painel de desempenho por período.
// - Para adicionar/remover cards, edite o array 'items' dentro da chave 'preditiva'.
// - Para manutenção: mantenha a lógica de navegação dos cards separada da lógica de exibição dos painéis.
// - Não há mais o card 'Análise de Software' (removido conforme solicitação).
// ===========================================================================

/**
 * Componente DashboardSections
 *
 * Exibe os botões de navegação dos indicadores do dashboard, agrupados por seções (Operacional, Estratégico, Executivo, Preditiva).
 * Cada botão dispara uma ação específica ao ser clicado, utilizando as funções recebidas via props:
 * - onSectionClick: ativa a seção correspondente para análise detalhada.
 * - onShowPendingIncidents: abre o modal de chamados pendentes (usado no botão "Chamados Pendentes").
 *
 * Localização: Dashboard principal > Indicadores Operacionais e demais seções
 *
 * Para alterar textos, lógica de navegação ou visualização dos botões, edite este componente.
 */
export function DashboardSections({ 
  onSectionClick, 
  activeSection, 
  onShowPendingIncidents,
  data,
  dateRange 
}: DashboardSectionsProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showAssociatedAnalysis, setShowAssociatedAnalysis] = useState(false);
  const [showWeekendAnalysis, setShowWeekendAnalysis] = useState(false);

  const handleSectionClick = (section: string) => {
    if (section === 'weekend-incidents') {
      setShowWeekendAnalysis(true);
    } else {
      onSectionClick(section);
    }
  };

  const handleAssociatedAnalysisClick = () => {
    setShowAssociatedAnalysis(true);
  };

  const sections = {
    operacional: {
      title: "Indicadores Operacionais",
      description: "Métricas de operação diária",
      icon: BarChart3,
      color: "bg-blue-600",
      hoverColor: "hover:bg-blue-700",
      items: [
        {
          title: "Chamados Pendentes",
          description: "Status atual dos chamados",
          icon: AlertCircle,
          sectionKey: "pending-incidents",
          onClick: () => onShowPendingIncidents()
        },
        {
          title: "SLA",
          description: "Acordo de nível de serviço",
          icon: Clock,
          sectionKey: "sla",
          onClick: () => handleSectionClick("sla")
        },
        {
          title: "Por Categoria",
          description: "Distribuição por tipo",
          icon: BarChart3,
          sectionKey: "category",
          onClick: () => handleSectionClick("category")
        },
        {
          title: "Por Grupo",
          description: "Distribuição por equipe",
          icon: Users,
          sectionKey: "group",
          onClick: () => handleSectionClick("group")
        },
        {
          title: "Por Usuários",
          description: "Distribuição por usuários",
          icon: UserCircle,
          sectionKey: "associates",
          onClick: () => handleSectionClick("associates")
        },
        {
          title: "Top Chamados – Drilldown por String Associado",
          description: "Drilldown por Categoria, Subcategoria e String Associado",
          icon: BarChart2,
          sectionKey: "top-string-associado",
          onClick: () => handleSectionClick("top-string-associado")
        },
        {
          title: "Chamados em Fins de Semana",
          description: "Chamados de associados em finais de semana e feriados",
          icon: Calendar,
          sectionKey: "weekend-incidents",
          onClick: () => handleSectionClick("weekend-incidents")
        },
        {
          title: "Análise de Indicadores Associados",
          description: "Análise integrada de Função, Grupo e String Associado com turnos",
          icon: Users2,
          sectionKey: "operacional",
          onClick: () => {
            handleAssociatedAnalysisClick();
          }
        }
      ]
    },
    estrategico: {
      title: "Indicadores Estratégicos",
      description: "Métricas de longo prazo",
      icon: Target,
      color: "bg-green-600",
      hoverColor: "hover:bg-green-700",
      items: [
        {
          title: "Histórico por Categoria",
          description: "Tendências por categoria",
          icon: History,
          sectionKey: "category-history",
          onClick: () => handleSectionClick("category-history")
        },
        {
          title: "Histórico por Grupo",
          description: "Tendências por equipe",
          icon: Users,
          sectionKey: "group-history",
          onClick: () => handleSectionClick("group-history")
        },
        {
          title: "Histórico por Localidade",
          description: "Tendências por local",
          icon: MapPin,
          sectionKey: "location-history",
          onClick: () => handleSectionClick("location-history")
        }
      ]
    },
    executivo: {
      title: "Indicadores Executivos",
      description: "Visão geral para gestão",
      icon: PieChart,
      color: "bg-purple-600",
      hoverColor: "hover:bg-purple-700",
      items: [
        {
          title: "Variação Mensal",
          description: "Análise de variação mês a mês",
          icon: LineChart,
          sectionKey: "monthly-variation",
          onClick: () => handleSectionClick("monthly-variation")
        },
        {
          title: "Variação Mensal por Localidade",
          description: "Comparativo mensal por local",
          icon: MapPin,
          sectionKey: "monthly-location-variation",
          onClick: () => handleSectionClick("monthly-location-variation")
        },

        {
          title: "Distribuição por Localidade",
          description: "Distribuição de incidentes e requisições por local",
          icon: MapPin,
          sectionKey: "location-distribution",
          onClick: () => handleSectionClick("location-distribution")
        }
      ]
    },
    preditiva: {
      title: "Análise Preditiva - IA",
      description: "Insights e previsões",
      icon: Brain,
      color: "bg-orange-600",
      hoverColor: "hover:bg-orange-700",
      items: [
        {
          title: "Análise Preditiva",
          description: "Previsões e tendências",
          icon: Brain,
          sectionKey: "predictive",
          onClick: () => handleSectionClick("predictive")
        },
        {
          title: "Análise por Analista",
          description: "Desempenho individual",
          icon: UserCog,
          sectionKey: "analyst",
          onClick: () => handleSectionClick("analyst")
        },
        {
          title: "Análise por Turno",
          description: "Desempenho por período",
          icon: Clock,
          sectionKey: "shift",
          onClick: () => handleSectionClick("shift")
        }
      ]
    }
  };

  return (
    <div className="space-y-8">
      {Object.entries(sections).map(([key, section]) => (
        <div key={key} className="bg-[#151B2B] rounded-lg p-6">
          <div className="flex items-center mb-6">
            <section.icon className={`w-8 h-8 ${section.color} text-white p-2 rounded-lg`} />
            <div className="ml-4">
              <h2 className="text-xl font-bold text-white">{section.title}</h2>
              <p className="text-gray-400">{section.description}</p>
            </div>
          </div>
          {key === 'operacional' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {section.items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    item.onClick();
                  }}
                  className={`flex flex-col items-center p-4 rounded-lg transition-colors ${
                    activeSection === item.sectionKey
                      ? 'bg-indigo-600'
                      : 'bg-[#1E293B] hover:bg-[#2D3748]'
                  }`}
                >
                  <item.icon className="w-6 h-6 text-white mb-2" />
                  <h3 className="text-white font-medium text-center">{item.title}</h3>
                  <p className="text-gray-400 text-sm text-center mt-1">{item.description}</p>
                </button>
              ))}
            </div>
          )}
          {key === 'estrategico' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {section.items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    item.onClick();
                  }}
                  className={`flex flex-col items-center p-4 rounded-lg transition-colors ${
                    activeSection === item.sectionKey
                      ? 'bg-indigo-600'
                      : 'bg-[#1E293B] hover:bg-[#2D3748]'
                  }`}
                >
                  <item.icon className="w-6 h-6 text-white mb-2" />
                  <h3 className="text-white font-medium text-center">{item.title}</h3>
                  <p className="text-gray-400 text-sm text-center mt-1">{item.description}</p>
                </button>
              ))}
            </div>
          )}
          {key === 'executivo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {section.items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    item.onClick();
                  }}
                  className={`flex flex-col items-center p-4 rounded-lg transition-colors ${
                    activeSection === item.sectionKey
                      ? 'bg-indigo-600'
                      : 'bg-[#1E293B] hover:bg-[#2D3748]'
                  }`}
                >
                  <item.icon className="w-6 h-6 text-white mb-2" />
                  <h3 className="text-white font-medium text-center">{item.title}</h3>
                  <p className="text-gray-400 text-sm text-center mt-1">{item.description}</p>
                </button>
              ))}
            </div>
          )}
          {key === 'preditiva' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {section.items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    item.onClick();
                  }}
                  className={`flex flex-col items-center p-4 rounded-lg transition-colors ${
                    activeSection === item.sectionKey
                      ? 'bg-orange-600'
                      : 'bg-[#1E293B] hover:bg-[#2D3748]'
                  }`}
                >
                  <item.icon className="w-6 h-6 text-white mb-2" />
                  <h3 className="text-white font-medium text-center">{item.title}</h3>
                  <p className="text-gray-400 text-sm text-center mt-1">{item.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      
      {showAssociatedAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#151B2B] rounded-lg p-6 w-11/12 max-w-7xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Análise de Indicadores Associados</h2>
              <button
                onClick={() => setShowAssociatedAnalysis(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <AssociatedIndicatorsAnalysis
              data={data}
              dateRange={dateRange}
            />
          </div>
        </div>
      )}

      {showWeekendAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#151B2B] rounded-lg p-6 w-11/12 max-w-7xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Chamados em Fins de Semana e Feriados</h2>
              <button
                onClick={() => setShowWeekendAnalysis(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <WeekendIncidentsAnalysis
              data={data}
              dateRange={dateRange}
            />
          </div>
        </div>
      )}
    </div>
  );
} 