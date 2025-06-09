import React, { useState, useMemo, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { DashboardHeader } from './components/DashboardHeader';
import { SearchBar } from './components/SearchBar';
import { StatsCard } from './components/StatsCard';
import { CategoryCard } from './components/CategoryCard';
import { PriorityAlert } from './components/PriorityAlert';
import { CategoryAnalysis } from './components/CategoryAnalysis';
import { SoftwareAnalysis } from './components/SoftwareAnalysis';
import { HardwareAnalysis } from './components/HardwareAnalysis';
import { GroupAnalysis } from './components/GroupAnalysis';
import { SLAAnalysis } from './components/SLAAnalysis';
import { UserAnalysis } from './components/UserAnalysis';
import { IncidentDetails } from './components/IncidentDetails';
import { GroupHistoryAnalysis } from './components/GroupHistoryAnalysis';
import { LocationAnalysis } from './components/LocationAnalysis';
import { AnalystAnalysis } from './components/AnalystAnalysis';
import { CriticalIncidentsModal } from './components/CriticalIncidentsModal';
import { PendingIncidentsModal } from './components/PendingIncidentsModal';
import { OnHoldIncidentsModal } from './components/OnHoldIncidentsModal';
import { OutOfRuleIncidentsModal } from './components/OutOfRuleIncidentsModal';
import { SupportQueuesAnalysis } from './components/SupportQueuesAnalysis';
import { CategoryHistoryAnalysis } from './components/CategoryHistoryAnalysis';
import { AIAnalyst } from './components/AIAnalyst';
import { ShiftHistoryAnalysis } from './components/ShiftHistoryAnalysis';
import { LoginScreen } from './components/prod/LoginScreen';
import { RequestDashboard } from './components/RequestDashboard';
import { HistoricalDataAnalysis } from './components/HistoricalDataAnalysis';
import { FileUploadSelector } from './components/FileUploadSelector';
import { TopLocationCards } from './components/TopLocationCards';
import { CategoryHistoryTop5 } from './components/CategoryHistoryTop5';
import { LocationHistoryTop5 } from './components/LocationHistoryTop5';
import { MonthlyLocationSummary } from './components/MonthlyLocationSummary';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { PendingIncidentsAnalysis } from './components/PendingIncidentsAnalysis';
import { ExecutiveIndicatorsModal } from './components/ExecutiveIndicatorsModal';
import { ExecutiveMenuModal } from './components/modals/ExecutiveMenuModal';
import { TopCategoriesModal } from './components/modals/TopCategoriesModal';
import { TopLocationsModal } from './components/modals/TopLocationsModal';
import { MonthlySummaryModal } from './components/modals/MonthlySummaryModal';
import { MonthlyLocationSummaryModal } from './components/modals/MonthlyLocationSummaryModal';
import { ComparativeVolumetry } from './components/ComparativeVolumetry';
import { LocationDistribution } from './components/LocationDistribution';
import type { Incident } from './types/incident';
import type { Request } from './types/request';
import { getIncidentState, isHighPriority, isCancelled, normalizePriority } from './utils/incidentUtils';
import environment from './config/environment';
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
  ArrowLeft,
  Calendar,
  PieChart
} from 'lucide-react';
import { format, isWithinInterval, parseISO, addDays, subDays, startOfDay, endOfDay, startOfYear, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Auth } from './components/Auth';
import { logout } from './utils/authUtils';
import { DashboardSections } from './components/DashboardSections';
import { TopIncidentsByStringAssociado } from './components/TopIncidentsByStringAssociado';
import { MonthlyVariation } from './components/MonthlyVariation';
import { MonthlyLocationVariation } from './components/MonthlyLocationVariation';

const SLA_THRESHOLDS = {
  P1: 1,   // 1 hour
  P2: 4,   // 4 hours
  P3: 36,  // 36 hours
  P4: 72   // 72 hours
};

const AUTH_KEY = 'app_auth_state';

function App() {
  // Log inicial para saber se o App está sendo montado
  console.log('[APP] Iniciando montagem do App...');

  const [showRequestDashboard, setShowRequestDashboard] = useState(false);
  const [showExecutiveDashboard, setShowExecutiveDashboard] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1);
    return firstDay.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showPriorityAlert, setShowPriorityAlert] = useState(true);
  const [showHistorical, setShowHistorical] = useState(false);
  const [showCategoryAnalysis, setShowCategoryAnalysis] = useState(false);
  const [showSoftwareAnalysis, setShowSoftwareAnalysis] = useState(false);
  const [showHardwareAnalysis, setShowHardwareAnalysis] = useState(false);
  const [showGroupAnalysis, setShowGroupAnalysis] = useState(false);
  const [showSLAAnalysis, setShowSLAAnalysis] = useState(false);
  const [showUserAnalysis, setShowUserAnalysis] = useState(false);
  const [showLocationAnalysis, setShowLocationAnalysis] = useState(false);
  const [showGroupHistoryAnalysis, setShowGroupHistoryAnalysis] = useState(false);
  const [showAnalystAnalysis, setShowAnalystAnalysis] = useState(false);
  const [showCriticalIncidents, setShowCriticalIncidents] = useState(false);
  const [showPendingIncidents, setShowPendingIncidents] = useState(false);
  const [showOnHoldIncidents, setShowOnHoldIncidents] = useState(false);
  const [showOutOfRuleIncidents, setShowOutOfRuleIncidents] = useState(false);
  const [showCategoryHistoryAnalysis, setShowCategoryHistoryAnalysis] = useState(false);
  const [showAIAnalyst, setShowAIAnalyst] = useState(false);
  const [showShiftHistory, setShowShiftHistory] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showHistoricalData, setShowHistoricalData] = useState(false);
  const [showFileSelector, setShowFileSelector] = useState(true);
  const [showCategoryHistoryTop5, setShowCategoryHistoryTop5] = useState(false);
  const [showLocationHistoryTop5, setShowLocationHistoryTop5] = useState(false);
  const [showMonthlyLocationSummary, setShowMonthlyLocationSummary] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showExecutiveIndicatorsModal, setShowExecutiveIndicatorsModal] = useState(false);
  const [showExecutiveMenu, setShowExecutiveMenu] = useState(false);
  const [showTopCategories, setShowTopCategories] = useState(false);
  const [showTopLocations, setShowTopLocations] = useState(false);
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  });

  // Log de autenticação
  React.useEffect(() => {
    console.log('[APP] Estado de autenticação:', isAuthenticated);
  }, [isAuthenticated]);

  // Log de exibição do seletor de arquivo
  React.useEffect(() => {
    console.log('[APP] showFileSelector:', showFileSelector);
  }, [showFileSelector]);

  // Log de erros globais
  React.useEffect(() => {
    window.onerror = function (msg, url, lineNo, columnNo, error) {
      console.error('[APP][GLOBAL ERROR]', msg, url, lineNo, columnNo, error);
      return false;
    };
    window.onunhandledrejection = function (event) {
      console.error('[APP][UNHANDLED PROMISE REJECTION]', event.reason);
    };
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(incidents.map(i => {
      const category = i.Category?.trim() || 'Não categorizado';
      if (category.toLowerCase().includes('backup') || category.toLowerCase().includes('restore')) {
        return 'Backup/Restore';
      }
      if (category.toLowerCase().includes('security') || category.toLowerCase().includes('segurança')) {
        return 'IT Security';
      }
      if (category.toLowerCase().includes('monitor')) {
        return 'Monitoring';
      }
      if (category.toLowerCase().includes('rede') || category.toLowerCase().includes('network')) {
        return 'Network';
      }
      if (category.toLowerCase().includes('servidor') || category.toLowerCase().includes('server')) {
        return 'Server';
      }
      if (category.toLowerCase().includes('suporte') || category.toLowerCase().includes('support')) {
        return 'Service Support';
      }
      if (category.toLowerCase().includes('software') || category.toLowerCase().includes('programa')) {
        return 'Software';
      }
      if (category.toLowerCase().includes('hardware') || category.toLowerCase().includes('equipment')) {
        return 'Hardware';
      }
      if (category.toLowerCase().includes('cloud') || category.toLowerCase().includes('nuvem')) {
        return 'Cloud';
      }
      if (category.toLowerCase().includes('database') || category.toLowerCase().includes('banco de dados')) {
        return 'Database';
      }
      return category;
    }));
    return Array.from(uniqueCategories).sort();
  }, [incidents]);

  /**
   * Filtra os incidentes com base em diversos critérios e mantém contadores para análise.
   * Esta função é responsável por:
   * 1. Filtrar incidentes por período de data
   * 2. Filtrar por categoria selecionada
   * 3. Filtrar por status selecionado
   * 4. Realizar busca por texto em diversos campos
   * 5. Manter contadores de incidentes cancelados, fora do período e com erro de data
   * 
   * A função mantém os seguintes contadores:
   * - cancelados: Número de incidentes com status de cancelado
   * - foraDoPeriodo: Número de incidentes fora do período selecionado
   * - erroData: Número de incidentes com erro na conversão de data
   * 
   * Logs gerados:
   * - Total de incidentes antes da filtragem
   * - Total de incidentes após filtragem
   * - Número de incidentes cancelados
   * - Número de incidentes fora do período
   * - Número de erros de data
   * 
   * Campos pesquisados na busca por texto:
   * - Número do incidente (com normalização para remover zeros à esquerda)
   * - Descrição curta
   * - Solicitante
   * - Categoria
   * - Grupo de atribuição
   * - Atribuído para
   * - Localização
   * 
   * Lógica de filtragem:
   * 1. Se houver termo de busca:
   *    - Busca em todos os campos listados acima
   *    - Normaliza o número do incidente para comparação
   * 2. Se não houver termo de busca:
   *    - Aplica filtros de categoria e status
   *    - Verifica se está dentro do período selecionado
   * 
   * @returns {Incident[]} Array de incidentes filtrados
   * 
   * @example
   * // Filtra incidentes do último mês
   * const incidentesFiltrados = filteredIncidents;
   * 
   * @dependencies
   * - incidents: Array de incidentes original
   * - searchQuery: Termo de busca
   * - selectedCategory: Categoria selecionada
   * - selectedStatus: Status selecionado
   * - startDate: Data inicial do período
   * - endDate: Data final do período
   * 
   * @see isCancelled
   * @see getIncidentState
   * @see isWithinInterval
   */
  const filteredIncidents = useMemo(() => {
    let cancelados = 0;
    let foraDoPeriodo = 0;
    let erroData = 0;
    
    const filtered = incidents.filter(incident => {
      if (isCancelled(incident.State)) {
        cancelados++;
      }

      const query = searchQuery.toLowerCase().trim();
      
      if (!query) {
        const matchesCategory = selectedCategory
          ? incident.Category?.toLowerCase().includes(selectedCategory.toLowerCase())
          : true;

        const matchesStatus = selectedStatus
          ? getIncidentState(incident.State) === selectedStatus
          : true;

        try {
          const isInDateRange = isWithinInterval(parseISO(incident.Opened), {
            start: startOfDay(parseISO(startDate)),
            end: endOfDay(parseISO(endDate))
          });

          if (!isInDateRange) {
            foraDoPeriodo++;
          }

          return matchesCategory && matchesStatus && isInDateRange;
        } catch (error) {
          erroData++;
          return false;
        }
      }

      const searchFields = [
        incident.Number?.toLowerCase() || '',
        incident.ShortDescription?.toLowerCase() || '',
        incident.Caller?.toLowerCase() || '',
        incident.Category?.toLowerCase() || '',
        incident.AssignmentGroup?.toLowerCase() || '',
        incident.AssignedTo?.toLowerCase() || '',
        incident.Location?.toLowerCase() || ''
      ];

      const matchesSearch = searchFields.some(field => field.includes(query));

      const normalizedNumber = incident.Number?.toLowerCase().replace(/^0+/, '') || '';
      const normalizedQuery = query.replace(/^0+/, '');

      return matchesSearch || normalizedNumber.includes(normalizedQuery);
    });

    return filtered;
  }, [incidents, searchQuery, selectedCategory, selectedStatus, startDate, endDate]);

  /**
   * Retorna os incidentes de alta prioridade (P1/P2) que ainda não foram fechados nem cancelados.
   * Usado para alertas e estatísticas de chamados críticos pendentes.
   * 
   * Critérios:
   * - Prioridade alta (P1 ou P2)
   * - Estado diferente de 'Fechado'
   * - Não cancelado
   */
  const criticalPendingIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const isPriority = isHighPriority(incident.Priority);
      const state = getIncidentState(incident.State);
      const cancelled = isCancelled(incident.State);
      return isPriority && state !== 'Fechado' && !cancelled;
    });
  }, [incidents]);

  /**
   * Retorna os incidentes que estão pendentes (nem fechados, nem cancelados, nem em espera).
   * Usado para contagem e exibição de chamados pendentes.
   * 
   * Critérios:
   * - Estado diferente de 'Fechado'
   * - Não cancelado
   * - Não está em espera (hold, pending, aguardando)
   */
  const pendingIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const state = incident.State?.toLowerCase() || '';
      const normalizedState = getIncidentState(incident.State);
      const cancelled = isCancelled(incident.State);
      return normalizedState !== 'Fechado' && 
             !cancelled &&
             !state.includes('hold') && 
             !state.includes('pending') && 
             !state.includes('aguardando');
    });
  }, [incidents]);

  /**
   * Retorna os incidentes que estão em espera (hold, pending, aguardando), excluindo cancelados.
   * Usado para contagem e exibição de chamados em espera.
   * 
   * Critérios:
   * - Estado contém 'hold', 'pending' ou 'aguardando'
   * - Não cancelado
   */
  const onHoldIncidents = useMemo(() => {
    return filteredIncidents.filter(incident => {
      const state = incident.State?.toLowerCase() || '';
      const cancelled = isCancelled(incident.State);
      return !cancelled && (state.includes('hold') || state.includes('pending') || state.includes('aguardando'));
    });
  }, [filteredIncidents]);

  /**
   * Retorna os incidentes que estão fora da regra (>48h abertos), excluindo cancelados e em espera.
   * Usado para contagem e exibição de chamados fora do prazo.
   * 
   * Critérios:
   * - Não cancelado
   * - Não está em espera (hold, pending, aguardando)
   * - Estado aberto, em andamento ou atribuído
   * - Mais de 48h desde a última atualização
   */
  const outOfRuleIncidents = useMemo(() => {
    return filteredIncidents.filter(incident => {
      const state = incident.State?.toLowerCase() || '';
      const cancelled = isCancelled(incident.State);
      if (cancelled) return false;
      // Exclude On Hold incidents
      if (state.includes('hold') || state.includes('pending') || state.includes('aguardando')) {
        return false;
      }
      // Check if incident is Open, In Progress, or Assigned
      const isValidState = state.includes('open') || 
                          state.includes('in progress') || 
                          state.includes('assigned') ||
                          state.includes('aberto') ||
                          state.includes('em andamento') ||
                          state.includes('atribuído');
      if (!isValidState) return false;
      try {
        // Check if it's been in this state for more than 48 hours
        const now = new Date();
        const lastUpdate = incident.Updated ? parseISO(incident.Updated) : now;
        const hoursElapsed = differenceInHours(now, lastUpdate);
        return hoursElapsed > 48;
      } catch (error) {
        return false;
      }
    });
  }, [filteredIncidents]);

  const stats = useMemo(() => {
    if (!filteredIncidents.length) return null;

    // Count total incidents and requests
    const totalIncidents = filteredIncidents.length;
    const totalRequests = requests.length;
    const totalItems = totalIncidents + totalRequests;

    const highPriorityIncidents = filteredIncidents.filter(i => 
      isHighPriority(i.Priority)
    ).length;

    const uniqueCategories = new Set(filteredIncidents.map(i => i.Category)).size;

    const criticalPendingCount = criticalPendingIncidents.length;
    const pendingCount = pendingIncidents.length;
    const onHoldCount = onHoldIncidents.length;
    const outOfRuleCount = outOfRuleIncidents.length;

    const highPriorityPercentage = ((highPriorityIncidents / totalIncidents) * 100).toFixed(2);
    const trend = parseFloat(highPriorityPercentage) > 0 ? `↑ ${highPriorityPercentage}%` : '0%';

    return {
      total: totalItems,
      highPriority: highPriorityIncidents,
      categories: uniqueCategories,
      criticalPending: criticalPendingCount,
      pending: pendingCount,
      onHold: onHoldCount,
      outOfRule: outOfRuleCount,
      trend
    };
  }, [filteredIncidents, requests, criticalPendingIncidents, pendingIncidents, onHoldIncidents, outOfRuleIncidents]);

  const handleIncidentsLoaded = (data: Incident[]) => {
    console.log("=== INÍCIO DO PROCESSAMENTO DE INCIDENTES ===");
    console.log("Total de incidentes recebidos:", data.length);
    
    setSearchQuery('');
    setStartDate('2020-01-01');
    setEndDate('2025-12-31');
    setSelectedCategory('');
    setSelectedStatus('');
    setShowPriorityAlert(true);
    setShowHistorical(false);
    setShowCategoryAnalysis(false);
    setShowSoftwareAnalysis(false);
    setShowHardwareAnalysis(false);
    setShowGroupAnalysis(false);
    setShowSLAAnalysis(false);
    setShowUserAnalysis(false);
    setShowLocationAnalysis(false);
    setShowGroupHistoryAnalysis(false);
    setShowAnalystAnalysis(false);
    setShowCategoryHistoryAnalysis(false);
    setShowAIAnalyst(false);
    setSelectedIncident(null);

    const processedData = data.map(incident => {
      const processed = {
        ...incident,
        Category: incident.Category || 'Não categorizado',
        Number: String(incident.Number),
        Opened: incident.Opened || new Date().toISOString(),
        State: incident.State || 'Aberto',
        Priority: incident.Priority || 'Não definido'
      };
      return processed;
    });

    console.log("Total de incidentes após processamento inicial:", processedData.length);
    console.log("=== FIM DO PROCESSAMENTO INICIAL ===");

    // Função para converter datas brasileiras para ISO
    function parseDateBR(dateStr: string) {
      if (!dateStr) return '';
      
      try {
        // Remove possíveis caracteres extras
        dateStr = dateStr.trim().replace(/['"]/g, '');
        
        // Log para debug
        console.log(`Tentando parsear data: ${dateStr}`);
        
        // Tenta diferentes formatos de data
        const formats = [
          // Formato ISO direto
          () => {
            const iso = Date.parse(dateStr);
            if (!isNaN(iso)) {
              const date = new Date(iso);
              console.log(`Data parseada como ISO: ${date.toISOString()}`);
              return date.toISOString();
            }
            return null;
          },
          // Formato brasileiro dd/MM/yyyy HH:mm:ss
          () => {
            const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})/);
            if (match) {
              const [_, dia, mes, ano, hora, min, seg] = match;
              // Validação adicional do mês
              if (parseInt(mes) < 1 || parseInt(mes) > 12) {
                console.warn(`Mês inválido encontrado: ${mes}`);
                return null;
              }
              const dt = new Date(`${ano}-${mes}-${dia}T${hora}:${min}:${seg}`);
              if (!isNaN(dt.getTime())) {
                console.log(`Data parseada como dd/MM/yyyy HH:mm:ss: ${dt.toISOString()}`);
                return dt.toISOString();
              }
            }
            return null;
          },
          // Formato brasileiro dd/MM/yyyy HH:mm
          () => {
            const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})/);
            if (match) {
              const [_, dia, mes, ano, hora, min] = match;
              // Validação adicional do mês
              if (parseInt(mes) < 1 || parseInt(mes) > 12) {
                console.warn(`Mês inválido encontrado: ${mes}`);
                return null;
              }
              const dt = new Date(`${ano}-${mes}-${dia}T${hora}:${min}:00`);
              if (!isNaN(dt.getTime())) {
                console.log(`Data parseada como dd/MM/yyyy HH:mm: ${dt.toISOString()}`);
                return dt.toISOString();
              }
            }
            return null;
          },
          // Formato brasileiro dd/MM/yyyy
          () => {
            const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
              const [_, dia, mes, ano] = match;
              // Validação adicional do mês
              if (parseInt(mes) < 1 || parseInt(mes) > 12) {
                console.warn(`Mês inválido encontrado: ${mes}`);
                return null;
              }
              const dt = new Date(`${ano}-${mes}-${dia}T00:00:00`);
              if (!isNaN(dt.getTime())) {
                console.log(`Data parseada como dd/MM/yyyy: ${dt.toISOString()}`);
                return dt.toISOString();
              }
            }
            return null;
          }
        ];

        // Tenta cada formato até encontrar um válido
        for (const format of formats) {
          const result = format();
          if (result) return result;
        }

        console.warn(`Não foi possível parsear a data: ${dateStr}`);
        return null;
      } catch (error) {
        console.error(`Erro ao parsear data ${dateStr}:`, error);
        return null;
      }
    }

    // Garantir que todos os campos Opened estejam em formato ISO válido
    const processedDataISO = processedData
      .map(incident => {
        let opened = incident.Opened;
        let isoDate = parseDateBR(opened);
        
        if (!isoDate) {
          console.warn(`Campo Opened inválido para incidente ${incident.Number}: ${opened}`);
          // Tenta extrair a data do número do incidente
          const incidentNumber = incident.Number;
          if (incidentNumber) {
            const match = incidentNumber.match(/(\d{4})(\d{2})(\d{2})/);
            if (match) {
              const [_, ano, mes, dia] = match;
              if (parseInt(mes) >= 1 && parseInt(mes) <= 12) {
                const dt = new Date(`${ano}-${mes}-${dia}T00:00:00`);
                if (!isNaN(dt.getTime())) {
                  isoDate = dt.toISOString();
                  console.log(`Data extraída do número do incidente ${incident.Number}: ${isoDate}`);
                }
              } else {
                console.warn(`Mês inválido extraído do número do incidente ${incident.Number}: ${mes}`);
              }
            }
          }
          // Se ainda não conseguiu extrair a data, retorna null para ser filtrado depois
          if (!isoDate) {
            console.warn(`Não foi possível determinar a data para o incidente ${incident.Number}`);
            return null;
          }
        }
        return { ...incident, Opened: isoDate };
      })
      .filter(incident => incident !== null);

    // Filtra incidentes com datas válidas e dentro do intervalo permitido (01/2025 a 06/2025)
    const validIncidents = processedDataISO.filter(incident => {
      if (typeof incident.Opened !== 'string' || !incident.Opened) return false;
      const date = new Date(incident.Opened);
      const ano = date.getFullYear();
      const mes = date.getMonth() + 1; // getMonth() retorna 0-11
      // Aceita apenas de janeiro a junho de 2025
      const valido = ano === 2025 && mes >= 1 && mes <= 6;
      if (!valido) {
        console.warn(`Incidente ${incident.Number} com data fora do intervalo permitido: ${incident.Opened}`);
      }
      return valido;
    });
    const invalidIncidents = processedDataISO.filter(incident => incident.Opened === null);

    if (invalidIncidents.length > 0) {
      console.warn(`Encontrados ${invalidIncidents.length} incidentes com datas inválidas`);
      invalidIncidents.forEach(incident => {
        console.warn(`Incidente ${incident.Number} tem data inválida: ${incident.Opened}`);
      });
    }

    console.log(`Processados ${validIncidents.length} incidentes com datas válidas`);
    setIncidents(validIncidents);
    
    if (requests.length > 0) {
      setShowFileSelector(false);
    }
  };

  const handleRequestsLoaded = (data: Request[]) => {
    console.log("handleRequestsLoaded called with", data.length, "requests");
    setRequests(data);
    
    // If we already have incidents data, hide the file selector
    if (incidents.length > 0) {
      setShowFileSelector(false);
    }
  };

  const handleCloseIncidentDetails = () => {
    setSelectedIncident(null);
    setSearchQuery('');
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_KEY, 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
    setShowFileSelector(true);
    setIncidents([]);
    setRequests([]);
  };

  const handleLocationClick = (location: string) => {
    setShowLocationAnalysis(true);
    // You could also set a selected location in the LocationAnalysis component
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  function handleSectionClick(section: string) {
    if (section === 'executive-modal') {
      setShowExecutiveMenu(true);
    } else {
      setActiveSection(section);
    }
  }

  if (!isAuthenticated) {
    console.log('[APP] Usuário não autenticado, renderizando Auth...');
    return <Auth onAuthSuccess={handleLogin} />;
  }

  if (showExecutiveDashboard) {
    return (
      <ExecutiveDashboard 
        incidents={filteredIncidents} 
        requests={requests} 
        onBack={() => setShowExecutiveDashboard(false)} 
      />
    );
  }

  if (showRequestDashboard) {
    return <RequestDashboard onBack={() => setShowRequestDashboard(false)} requests={requests} />;
  }

  console.log("Current incidents count:", incidents.length);
  console.log("Current requests count:", requests.length);
  console.log("Filtered incidents count:", filteredIncidents.length);

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <DashboardHeader
        title={environment.appTitle}
        onLogout={handleLogout}
        {...(!showFileSelector && {
          onShowRequestDashboard: () => setShowRequestDashboard(true),
          onShowExecutiveDashboard: () => setShowExecutiveDashboard(true),
        })}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showFileSelector ? (
          <div className="max-w-4xl mx-auto">
            <FileUploadSelector 
              onSelectIncidents={handleIncidentsLoaded} 
              onSelectRequests={handleRequestsLoaded} 
            />
          </div>
        ) : (
          <div className="space-y-8">
            {showPriorityAlert && criticalPendingIncidents.length > 0 && (
              <PriorityAlert 
                incidents={filteredIncidents}
                onClose={() => setShowPriorityAlert(false)}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <StatsCard
                title="Total de Chamados"
                value={stats?.total || 0}
                icon={BarChart3}
                trend={stats?.trend}
                className="bg-[#151B2B]"
                onClick={() => setShowHistoricalData(!showHistoricalData)}
                clickable={true}
                subtitle="Clique para ver histórico"
              />
              <StatsCard
                title="P1/P2 Pendentes"
                value={stats?.criticalPending || 0}
                icon={AlertOctagon}
                trendColor="text-red-500"
                className="bg-[#151B2B] border-2 border-red-500/50"
                valueColor="text-red-500"
                onClick={() => setShowCriticalIncidents(true)}
                clickable={true}
              />
              <StatsCard
                title="Chamados Pendentes"
                value={stats?.pending || 0}
                icon={AlertCircle}
                className="bg-[#151B2B] border-2 border-yellow-500/50"
                valueColor="text-yellow-500"
                onClick={() => setShowPendingIncidents(true)}
                clickable={true}
              />
              <StatsCard
                title="Chamados On Hold"
                value={stats?.onHold || 0}
                icon={PauseCircle}
                className="bg-[#151B2B] border-2 border-orange-500/50"
                valueColor="text-orange-500"
                onClick={() => setShowOnHoldIncidents(true)}
                clickable={true}
              />
              <StatsCard
                title="Fora de Regra"
                value={stats?.outOfRule || 0}
                icon={Timer}
                className="bg-[#151B2B] border-2 border-red-500/50"
                valueColor="text-red-500"
                onClick={() => setShowOutOfRuleIncidents(true)}
                clickable={true}
                subtitle="Chamados abertos > 48h"
                subtitleColor="text-red-400"
              />
            </div>

            <div className="flex justify-between mb-4">
              <button
                onClick={() => setShowRequestDashboard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5" />
                <span>Ir para Dashboard de Requests</span>
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </button>
            </div>

            {/* Monthly Location Summary */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Sumarização Mensal por Localidade</h3>
              <button
                onClick={() => setShowMonthlyLocationSummary(!showMonthlyLocationSummary)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <Calendar className="h-4 w-4" />
                <span>{showMonthlyLocationSummary ? 'Ocultar Detalhes' : 'Ver Detalhes'}</span>
              </button>
            </div>

            {showMonthlyLocationSummary && (
              <MonthlyLocationSummary
                incidents={filteredIncidents}
                onClose={() => setShowMonthlyLocationSummary(false)}
              />
            )}

            <SupportQueuesAnalysis incidents={filteredIncidents} />

            {showHistoricalData && (
              <HistoricalDataAnalysis
                incidents={incidents}
                requests={requests}
                onClose={() => setShowHistoricalData(false)}
              />
            )}

            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categories={categories}
              requests={requests}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
            />

            <DashboardSections
              onSectionClick={handleSectionClick}
              activeSection={activeSection}
              onShowPendingIncidents={() => setShowPendingIncidents(true)}
              data={filteredIncidents}
              dateRange={{
                start: startOfDay(parseISO(startDate)),
                end: endOfDay(parseISO(endDate))
              }}
            />

            {/* Renderização condicional dos componentes baseada na seção ativa */}
            {activeSection === 'associates' && (
              <UserAnalysis
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {activeSection === 'category' && (
              <CategoryAnalysis 
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {activeSection === 'sla' && (
              <SLAAnalysis
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {activeSection === 'group' && (
              <GroupAnalysis
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {activeSection === 'category-history' && (
              <CategoryHistoryAnalysis
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
              />
            )}

            {activeSection === 'group-history' && (
              <GroupHistoryAnalysis
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
              />
            )}

            {activeSection === 'executive' && (
              <ExecutiveDashboard 
                incidents={filteredIncidents} 
                requests={requests} 
                onBack={() => setActiveSection('')} 
              />
            )}

            {activeSection === 'top-categories' && (
              <CategoryHistoryTop5
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {activeSection === 'top-locations' && (
              <LocationHistoryTop5
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {activeSection === 'monthly-location-summary' && (
              <MonthlyLocationSummary
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
              />
            )}

            {activeSection === 'predictive' && (
              <AIAnalyst
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
              />
            )}

            {activeSection === 'analyst' && (
              <AnalystAnalysis
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {activeSection === 'shift' && (
              <ShiftHistoryAnalysis
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
              />
            )}

            {activeSection === 'software' && (
              <SoftwareAnalysis
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {activeSection === 'top-string-associado' && (
              <TopIncidentsByStringAssociado
                incidents={filteredIncidents}
                onBack={() => setActiveSection('')}
                onShowIncidentDetails={setSelectedIncident}
              />
            )}

            {activeSection === 'location-history' && (
              <LocationHistoryTop5
                incidents={filteredIncidents}
                onClose={() => setActiveSection('')}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {activeSection === 'monthly-variation' && (
              <MonthlyVariation
                incidents={filteredIncidents}
                requests={requests}
                startDate={startDate}
                endDate={endDate}
                onClose={() => setActiveSection('')}
              />
            )}

            {activeSection === 'monthly-location-variation' && (
              <MonthlyLocationVariation
                incidents={filteredIncidents}
                requests={requests}
                startDate={startDate}
                endDate={endDate}
                onClose={() => setActiveSection('')}
              />
            )}

            {activeSection === 'comparative-volumetry' && (
              <ComparativeVolumetry
                incidents={filteredIncidents}
                requests={requests}
                startDate={startDate}
                endDate={endDate}
                onClose={() => setActiveSection('')}
              />
            )}

            {activeSection === 'location-distribution' && (
              <LocationDistribution
                incidents={filteredIncidents}
                requests={requests}
                startDate={startDate}
                endDate={endDate}
                onClose={() => setActiveSection('')}
              />
            )}

            {/* Modais */}
            {showCriticalIncidents && (
              <CriticalIncidentsModal
                incidents={criticalPendingIncidents}
                onClose={() => setShowCriticalIncidents(false)}
              />
            )}

            {showPendingIncidents && (
              <PendingIncidentsModal
                incidents={pendingIncidents}
                onClose={() => setShowPendingIncidents(false)}
              />
            )}

            {showOnHoldIncidents && (
              <OnHoldIncidentsModal
                incidents={onHoldIncidents}
                onClose={() => setShowOnHoldIncidents(false)}
              />
            )}

            {showOutOfRuleIncidents && (
              <OutOfRuleIncidentsModal
                incidents={outOfRuleIncidents}
                onClose={() => setShowOutOfRuleIncidents(false)}
              />
            )}

            {selectedIncident && (
              <IncidentDetails
                incident={selectedIncident}
                onClose={handleCloseIncidentDetails}
              />
            )}
          </div>
        )}
      </main>

      {showExecutiveIndicatorsModal && (
        <ExecutiveIndicatorsModal
          onClose={() => setShowExecutiveIndicatorsModal(false)}
          indicadores={[
            { nome: 'Total de Incidentes', valor: filteredIncidents.length },
            { nome: 'SLA Global', valor: '98%' },
            // Adicione outros indicadores relevantes aqui
          ]}
        />
      )}

      {showExecutiveMenu && (
        <ExecutiveMenuModal
          onClose={() => setShowExecutiveMenu(false)}
          onNavigate={(section) => {
            setShowExecutiveMenu(false);
            if (section === 'top-categories') setShowTopCategories(true);
            if (section === 'top-locations') setShowTopLocations(true);
            if (section === 'monthly-summary') setShowMonthlySummary(true);
            if (section === 'monthly-location-summary') setShowMonthlyLocationSummary(true);
            if (section === 'executive') {
              // Aqui você pode abrir o dashboard completo ou outro modal, conforme sua arquitetura
            }
          }}
        />
      )}
      {showTopCategories && (
        <TopCategoriesModal onClose={() => setShowTopCategories(false)} />
      )}
      {showTopLocations && (
        <TopLocationsModal onClose={() => setShowTopLocations(false)} />
      )}
      {showMonthlySummary && (
        <MonthlySummaryModal onClose={() => setShowMonthlySummary(false)} />
      )}
      {showMonthlyLocationSummary && (
        <MonthlyLocationSummaryModal onClose={() => setShowMonthlyLocationSummary(false)} />
      )}
    </div>
  );
}

export default App;