import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { DashboardHeader } from './components/DashboardHeader';
import { Footer } from './components/Footer';
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
import { BacklogModal } from './components/BacklogModal';
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
import { CalendarSelector } from './components/CalendarSelector';

/**
 * ===================== CALENDÁRIO GLOBAL DO DASHBOARD =====================
 *
 * Função: Permite ao usuário selecionar o período global de análise do dashboard de incidentes.
 *
 * Localização: Painel principal, acima dos Indicadores Operacionais.
 *
 * Componentes envolvidos:
 *   - Botão "Selecionar Período": abre o calendário.
 *   - CalendarSelector: componente reutilizável para seleção de datas.
 *   - Modal centralizado com fundo escurecido.
 *
 * Funcionamento:
 *   - O botão "Selecionar Período" exibe o calendário em um modal.
 *   - O usuário pode escolher a data inicial e final do período de análise.
 *   - As datas selecionadas atualizam os estados globais startDate e endDate do dashboard.
 *   - O período selecionado afeta todos os cards, gráficos e análises do painel principal.
 *
 * Como alterar:
 *   - Para mudar o visual, edite o botão ou o modal do calendário.
 *   - Para trocar o calendário, altere o componente <CalendarSelector />.
 *   - Para modificar o comportamento, ajuste os handlers de estado (showMainCalendar, setStartDate, setEndDate).
 *
 * Observação:
 *   - Qualquer ajuste futuro de UX ou lógica de período global deve ser feito neste bloco e nos handlers citados.
 * ===========================================================================
 */



const AUTH_KEY = 'app_auth_state';

function App() {
  // Log inicial movido para useEffect para evitar spam

  const [showRequestDashboard, setShowRequestDashboard] = useState(false);
  const [showExecutiveDashboard, setShowExecutiveDashboard] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(() => {
    return '2025-01-01';
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
  const [showBacklog, setShowBacklog] = useState(false);
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
  const [showMainCalendar, setShowMainCalendar] = useState(false);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const calendarPopoverRef = useRef<HTMLDivElement>(null);

  // Log de montagem inicial (só executa uma vez)
  React.useEffect(() => {
    console.log('[APP] App montado com sucesso');
  }, []);

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

  // Fecha o popover ao clicar fora
  useEffect(() => {
    if (!showMainCalendar) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarPopoverRef.current &&
        !calendarPopoverRef.current.contains(event.target as Node) &&
        calendarButtonRef.current &&
        !calendarButtonRef.current.contains(event.target as Node)
      ) {
        setShowMainCalendar(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMainCalendar]);

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
    setStartDate('2025-01-01');
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
      if (!dateStr) return null;
      try {
        dateStr = dateStr.trim().replace(/['"]/g, '');
          // Formato brasileiro dd/MM/yyyy HH:mm:ss
        let match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/);
            if (match) {
              const [_, dia, mes, ano, hora, min, seg] = match;
          if (parseInt(mes) >= 1 && parseInt(mes) <= 12) {
              const dt = new Date(`${ano}-${mes}-${dia}T${hora}:${min}:${seg}`);
            if (!isNaN(dt.getTime())) return dt.toISOString();
            }
            return null;
        }
          // Formato brasileiro dd/MM/yyyy HH:mm
        match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})$/);
            if (match) {
              const [_, dia, mes, ano, hora, min] = match;
          if (parseInt(mes) >= 1 && parseInt(mes) <= 12) {
              const dt = new Date(`${ano}-${mes}-${dia}T${hora}:${min}:00`);
            if (!isNaN(dt.getTime())) return dt.toISOString();
            }
            return null;
        }
          // Formato brasileiro dd/MM/yyyy
        match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (match) {
              const [_, dia, mes, ano] = match;
          if (parseInt(mes) >= 1 && parseInt(mes) <= 12) {
              const dt = new Date(`${ano}-${mes}-${dia}T00:00:00`);
            if (!isNaN(dt.getTime())) return dt.toISOString();
              }
          return null;
            }
        // Formato ISO yyyy-MM-ddTHH:mm:ss ou yyyy-MM-dd
        match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})([ T](\d{2}):(\d{2})(:(\d{2}))?)?/);
        if (match) {
          const dt = new Date(dateStr);
          if (!isNaN(dt.getTime())) return dt.toISOString();
            return null;
          }
        // Formato numérico do Excel
        const num = parseFloat(dateStr);
        if (!isNaN(num)) {
          const baseDate = new Date(1900, 0, 1);
          const days = Math.floor(num);
          const milliseconds = (num - days) * 24 * 60 * 60 * 1000;
          const date = new Date(baseDate.getTime() + (days - 1) * 24 * 60 * 60 * 1000 + milliseconds);
          if (!isNaN(date.getTime())) return date.toISOString();
        }
        return null;
      } catch (e) {
        return null;
      }
    }

    // Garantir que todos os campos Opened e Updated estejam em formato ISO válido
    const processedDataISO = processedData
      .map(incident => {
        let opened = incident.Opened;
        let updated = incident.Updated;
        let openedISO = parseDateBR(opened);
        let updatedISO = parseDateBR(updated);
        
        if (!openedISO) {
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
                  openedISO = dt.toISOString();
                  console.log(`Data extraída do número do incidente ${incident.Number}: ${openedISO}`);
                }
              } else {
                console.warn(`Mês inválido extraído do número do incidente ${incident.Number}: ${mes}`);
              }
            }
          }
        }

        if (!updatedISO && incident.Updated) {
          console.warn(`Campo Updated inválido para incidente ${incident.Number}: ${updated}`);
          // Se não conseguiu converter o Updated, usa o Opened como fallback
          updatedISO = openedISO;
        }

        // Se ainda não conseguiu extrair a data, tenta usar a data atual como último recurso
        if (!openedISO) {
          console.warn(`Não foi possível determinar a data para o incidente ${incident.Number}, usando data atual como fallback`);
          openedISO = new Date().toISOString();
        }

        // Validação adicional das datas
        const openedDate = new Date(openedISO);
        const updatedDate = new Date(updatedISO || openedISO);

        if (isNaN(openedDate.getTime())) {
          console.warn(`Data Opened inválida após conversão para ISO: ${openedISO}, usando data atual como fallback`);
          openedISO = new Date().toISOString();
        }

        if (isNaN(updatedDate.getTime())) {
          console.warn(`Data Updated inválida após conversão para ISO: ${updatedISO}, usando Opened como fallback`);
          updatedISO = openedISO;
        }

        // Verifica se Updated é anterior a Opened
        if (updatedDate < openedDate) {
          console.warn(`Data Updated (${updatedISO}) é anterior a Opened (${openedISO}) para o incidente ${incident.Number}, usando Opened como fallback`);
          updatedISO = openedISO;
        }

        return { 
          ...incident, 
          Opened: openedISO,
          Updated: updatedISO || openedISO // Se Updated for inválido, usa Opened como fallback
        };
      });

    console.log("Total de incidentes após processamento de datas:", processedDataISO.length);
    console.log("=== FIM DO PROCESSAMENTO DE DATAS ===");

    // Aplicar filtros iniciais
    const filteredData = processedDataISO.filter(incident => {
      const openedDate = new Date(incident.Opened);
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2025-12-31');
      
      return openedDate >= startDate && openedDate <= endDate;
      });

    console.log("Total de incidentes após filtros iniciais:", filteredData.length);
    console.log("=== FIM DOS FILTROS INICIAIS ===");

    setIncidents(filteredData);
    
    // If we already have requests data, hide the file selector
    if (requests.length > 0) {
      setShowFileSelector(false);
    }

    // Debug logs removidos para evitar spam no console
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

  // Logs de contagem removidos para evitar spam no console

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

            {/* Botões principais movidos para acima dos Indicadores Operacionais */}



            <SupportQueuesAnalysis incidents={filteredIncidents} />

            {showHistoricalData && (
              <HistoricalDataAnalysis
                incidents={incidents}
                requests={requests}
                onClose={() => setShowHistoricalData(false)}
              />
            )}

            {/* Ações rápidas (claras e separadas do conteúdo acima) */}
            <div className="mt-6 mb-2 text-sm text-gray-300">Ações rápidas</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Navegação</div>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowRequestDashboard(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm w-full"
                  >
                    <FileText className="h-5 w-5" />
                    <span>Ir para Dashboard de Requests</span>
                    <ArrowLeft className="h-5 w-5 rotate-180" />
                  </button>
                  <button
                    ref={calendarButtonRef}
                    onClick={() => setShowMainCalendar((v) => !v)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors shadow-sm w-full relative"
                  >
                    <Calendar className="h-5 w-5" />
                    <span>Selecionar Período</span>
                  </button>
                  {showMainCalendar && (
                    <div
                      ref={calendarPopoverRef}
                      className="absolute right-0 mt-2 z-50 bg-[#1C2333] rounded-lg shadow-xl border border-gray-700"
                      style={{ minWidth: 340 }}
                    >
                      <CalendarSelector
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                        onClose={() => setShowMainCalendar(false)}
                        position="bottom"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Análises Backlog</div>
                <button
                  onClick={() => setShowBacklog(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Backlog</span>
                </button>
              </div>
            </div>

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
                startDate={'2025-01-01'}
                endDate={endDate}
                onClose={() => setActiveSection('')}
              />
            )}

            {activeSection === 'monthly-location-variation' && (
              <MonthlyLocationVariation
                incidents={filteredIncidents}
                requests={requests}
                startDate={'2025-01-01'}
                endDate={endDate}
                onClose={() => setActiveSection('')}
              />
            )}

            {activeSection === 'comparative-volumetry' && (
              (() => {
                // Encontrar a maior data de Opened entre incidentes e requisições
                const allDates = [
                  ...filteredIncidents.map(i => i.Opened),
                  ...requests.map(r => r.Opened)
                ].map(dateStr => {
                  if (!dateStr) return null;
                  const d = new Date(dateStr);
                  return !dateStr || isNaN(d.getTime()) ? null : d;
                }).filter((d): d is Date => d !== null);
                let lastDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();
                // Ajustar para o último dia do mês
                lastDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0);
                const endDateDynamic = lastDate.toISOString().slice(0, 10);

                // FILTRO EXTRA: garantir que só incidentes até 2025-06-30 sejam considerados
                const maxAllowedDate = new Date('2025-06-30T23:59:59');
                const filteredIncidentsMax = filteredIncidents.filter(i => {
                  const d = new Date(i.Opened);
                  const dateToCheck = d && !isNaN(d.getTime()) ? d : new Date(0);
                  return dateToCheck <= maxAllowedDate;
                });
                // Logar incidentes problemáticos
                const incidentsInvalid = filteredIncidents.filter(i => {
                  const d = new Date(i.Opened);
                  const dateToCheck = d && !isNaN(d.getTime()) ? d : new Date(0);
                  return dateToCheck > maxAllowedDate;
                });
                if (incidentsInvalid.length > 0) {
                  console.warn('Incidentes com data acima de 2025-06-30:', incidentsInvalid.map(i => ({ Number: i.Number, Opened: i.Opened })));
                }

                // Debug logs removidos para evitar spam no console

                return (
              <ComparativeVolumetry
                    incidents={filteredIncidentsMax}
                requests={requests}
                    startDate={'2025-01-01'}
                    endDate={endDateDynamic}
                onClose={() => setActiveSection('')}
              />
                );
              })()
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

            {showBacklog && (
              <BacklogModal
                incidents={filteredIncidents}
                onClose={() => setShowBacklog(false)}
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
      
      <Footer />
    </div>
  );
}

export default App;