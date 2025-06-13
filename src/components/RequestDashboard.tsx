import React, { useState, useMemo } from 'react';
import { FileUpload } from './FileUpload';
import { DashboardHeader } from './DashboardHeader';
import { SearchBar } from './SearchBar';
import { StatsCard } from './StatsCard';
import { CategoryCard } from './CategoryCard';
import { RequestAnalysis } from './RequestAnalysis';
import { RequestCategoryAnalysis } from './RequestCategoryAnalysis';
import { RequestPriorityAnalysis } from './RequestPriorityAnalysis';
import { RequestHistoryAnalysis } from './RequestHistoryAnalysis';
import { RequestSLAAnalysis } from './RequestSLAAnalysis';
import { RequestDashboardMetrics } from './RequestDashboardMetrics';
import { RequestPerformanceMetrics } from './RequestPerformanceMetrics';
import { RequestTrendAnalysis } from './RequestTrendAnalysis';
import { AIPredictiveAnalysis } from './AIPredictiveAnalysis';
import { InProgressRequestsModal } from './InProgressRequestsModal';
import { OnHoldRequestsModal } from './OnHoldRequestsModal';
import { RequestTopLocationCards } from './RequestTopLocationCards';
import { RequestMonthlyLocationSummary } from './RequestMonthlyLocationSummary';
import { Request } from '../types/request';
import { 
  BarChart2, 
  FileText, 
  Clock, 
  Users, 
  History,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  UserCircle,
  Timer,
  TrendingUp,
  X,
  Brain,
  PauseCircle,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { format, startOfYear, parseISO, isWithinInterval } from 'date-fns';
import environment from '../config/environment';
import { normalizeRequestPriority, normalizeRequestStatus } from '../types/request';
import { normalizeLocationName } from '../utils/locationUtils';
import { RequestDetails } from './RequestDetails';
import { CalendarSelector } from './CalendarSelector';

interface RequestDashboardProps {
  onBack: () => void;
  requests: Request[];
}

export function RequestDashboard({ onBack, requests }: RequestDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showRequestAnalysis, setShowRequestAnalysis] = useState(false);
  const [showCategoryAnalysis, setShowCategoryAnalysis] = useState(false);
  const [showPriorityAnalysis, setShowPriorityAnalysis] = useState(false);
  const [showHistoryAnalysis, setShowHistoryAnalysis] = useState(false);
  const [showSLAAnalysis, setShowSLAAnalysis] = useState(false);
  const [showDashboardMetrics, setShowDashboardMetrics] = useState(false);
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(false);
  const [showTrendAnalysis, setShowTrendAnalysis] = useState(false);
  const [showUserAnalysis, setShowUserAnalysis] = useState(false);
  const [showLocationAnalysis, setShowLocationAnalysis] = useState(false);
  const [showAIPredictiveAnalysis, setShowAIPredictiveAnalysis] = useState(false);
  const [showInProgressRequests, setShowInProgressRequests] = useState(false);
  const [showOnHoldRequests, setShowOnHoldRequests] = useState(false);
  const [showMonthlyLocationSummary, setShowMonthlyLocationSummary] = useState(false);
  const [showHighPriorityModal, setShowHighPriorityModal] = useState(false);
  const highPriorityRequests = useMemo(() => requests.filter(r =>
    r.Priority?.toLowerCase().includes('high') ||
    r.Priority?.toLowerCase().includes('p1') ||
    r.Priority?.toLowerCase().includes('1')
  ), [requests]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  // Novos estados independentes para o modal
  const [modalStartDate, setModalStartDate] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [modalEndDate, setModalEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showCalendar, setShowCalendar] = useState(false);

  // Extract unique categories from requests
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    requests.forEach(request => {
      if (request.RequestItem) {
        uniqueCategories.add(request.RequestItem);
      }
    });
    return Array.from(uniqueCategories).sort();
  }, [requests]);

  // Função para filtrar requisições por período
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const requestDate = parseISO(request.Opened);
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      return isWithinInterval(requestDate, { start, end });
    });
  }, [requests, startDate, endDate]);

  // Função independente para filtrar requisições no modal
  const modalFilteredRequests = useMemo(() => {
    return requests.filter(request => {
      const requestDate = parseISO(request.Opened);
      const start = parseISO(modalStartDate);
      const end = parseISO(modalEndDate);
      return isWithinInterval(requestDate, { start, end });
    });
  }, [requests, modalStartDate, modalEndDate]);

  // Função para atualizar as datas
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };

  // Função independente para atualizar as datas do modal
  const handleModalDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setModalStartDate(value);
    } else {
      setModalEndDate(value);
    }
  };

  const handleLogout = () => {
    // Call the onBack function to return to the main dashboard
    // This will trigger the parent component's logout logic
    onBack();
  };

  const handleLocationClick = (location: string) => {
    setShowLocationAnalysis(true);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const stats = useMemo(() => {
    // Count requests by status
    const inProgress = requests.filter(r => {
      const status = normalizeRequestStatus(r.State);
      const state = r.State?.toLowerCase() || '';
      return (status === 'IN_PROGRESS' || status === 'NEW') && 
             !state.includes('hold') && !state.includes('pending') && !state.includes('aguardando');
    }).length;
    
    const onHold = requests.filter(r => {
      const state = r.State?.toLowerCase() || '';
      return state.includes('hold') || state.includes('pending') || state.includes('aguardando');
    }).length;
    
    const completed = requests.filter(r => 
      normalizeRequestStatus(r.State) === 'COMPLETED'
    ).length;
    
    const cancelled = requests.filter(r => 
      normalizeRequestStatus(r.State) === 'CANCELLED'
    ).length;
    
    const highPriority = requests.filter(r => 
      r.Priority?.toLowerCase().includes('high') || 
      r.Priority?.toLowerCase().includes('p1') || 
      r.Priority?.toLowerCase().includes('1')
    ).length;
    
    // Corrigido: total geral
    const total = requests.length;
    
    return {
      total,
      inProgress,
      onHold,
      completed,
      highPriority
    };
  }, [requests]);

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-6">
      <DashboardHeader 
        title="Requests Dashboard"
        onLogout={handleLogout}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-[#151B2B] hover:bg-[#1C2333] rounded-lg transition-colors text-yellow-400 hover:text-yellow-400"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar para Dashboard de Incidentes</span>
          </button>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <StatsCard
              title="Total de Requests"
              value={stats.total}
              icon={FileText}
              className="bg-[#151B2B]"
            />
            <StatsCard
              title="Em Andamento"
              value={stats.inProgress}
              icon={Clock}
              className="bg-[#151B2B] border-2 border-blue-500/50"
              valueColor="text-blue-500"
              onClick={() => setShowInProgressRequests(true)}
              clickable={true}
              subtitle="Clique para ver detalhes"
            />
            <StatsCard
              title="Em Espera"
              value={stats.onHold}
              icon={PauseCircle}
              className="bg-[#151B2B] border-2 border-orange-500/50"
              valueColor="text-orange-500"
              onClick={() => setShowOnHoldRequests(true)}
              clickable={true}
              subtitle="Clique para ver detalhes"
            />
            <StatsCard
              title="Concluídos"
              value={stats.completed}
              icon={CheckCircle2}
              className="bg-[#151B2B] border-2 border-green-500/50"
              valueColor="text-green-500"
            />
            <StatsCard
              title="Alta Prioridade"
              value={stats.highPriority}
              icon={AlertTriangle}
              className="bg-[#151B2B] border-2 border-red-500/50"
              valueColor="text-red-500"
              clickable={stats.highPriority > 0}
              onClick={() => { if (stats.highPriority > 0) setShowHighPriorityModal(true); }}
            />
          </div>

          <div className="space-y-6">
            {/* Filtro de Data Independente */}
            <div className="bg-[#151B2B] p-4 rounded-lg relative">
              <div className="flex items-center space-x-4">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                  onClick={() => setShowCalendar((prev) => !prev)}
                  type="button"
                >
                  <Calendar className="h-5 w-5 text-white" />
                  <span>Selecionar Período</span>
                </button>
                {showCalendar && (
                  <CalendarSelector
                    startDate={modalStartDate}
                    endDate={modalEndDate}
                    onStartDateChange={setModalStartDate}
                    onEndDateChange={setModalEndDate}
                    onClose={() => setShowCalendar(false)}
                    position="bottom"
                  />
                )}
              </div>
            </div>

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
              <RequestMonthlyLocationSummary
                requests={modalFilteredRequests}
                onClose={() => setShowMonthlyLocationSummary(false)}
                startDate={modalStartDate}
                endDate={modalEndDate}
              />
            )}
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
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            requests={requests}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CategoryCard
              title="Análise Geral"
              description="Visão geral das requests"
              icon={BarChart2}
              onClick={() => setShowRequestAnalysis(!showRequestAnalysis)}
              active={showRequestAnalysis}
            />
            <CategoryCard
              title="Por Categoria"
              description="Distribuição por categoria"
              icon={FileText}
              onClick={() => setShowCategoryAnalysis(!showCategoryAnalysis)}
              active={showCategoryAnalysis}
            />
            <CategoryCard
              title="Por Prioridade"
              description="Análise por prioridade"
              icon={Users}
              onClick={() => setShowPriorityAnalysis(!showPriorityAnalysis)}
              active={showPriorityAnalysis}
            />
            <CategoryCard
              title="Histórico"
              description="Análise histórica"
              icon={History}
              onClick={() => setShowHistoryAnalysis(!showHistoryAnalysis)}
              active={showHistoryAnalysis}
            />
            <CategoryCard
              title="Principais usuários"
              description="Usuários mais frequentes"
              icon={UserCircle}
              onClick={() => setShowUserAnalysis(!showUserAnalysis)}
              active={showUserAnalysis}
            />
            <CategoryCard
              title="Por Localidade"
              description="Análise por localização"
              icon={MapPin}
              onClick={() => setShowLocationAnalysis(!showLocationAnalysis)}
              active={showLocationAnalysis}
            />
            <CategoryCard
              title="Análise de SLA"
              description="Acordo de nível de serviço"
              icon={Timer}
              onClick={() => setShowSLAAnalysis(!showSLAAnalysis)}
              active={showSLAAnalysis}
            />
            <CategoryCard
              title="Métricas"
              description="Indicadores de desempenho"
              icon={BarChart2}
              onClick={() => setShowDashboardMetrics(!showDashboardMetrics)}
              active={showDashboardMetrics}
            />
            <CategoryCard
              title="Performance"
              description="Métricas de performance"
              icon={TrendingUp}
              onClick={() => setShowPerformanceMetrics(!showPerformanceMetrics)}
              active={showPerformanceMetrics}
            />
            <CategoryCard
              title="Tendências"
              description="Análise de tendências"
              icon={TrendingUp}
              onClick={() => setShowTrendAnalysis(!showTrendAnalysis)}
              active={showTrendAnalysis}
            />
            <CategoryCard
              title="Análise Preditiva - IA"
              description="Análise inteligente de solicitações"
              icon={Brain}
              onClick={() => setShowAIPredictiveAnalysis(!showAIPredictiveAnalysis)}
              active={showAIPredictiveAnalysis}
            />
          </div>

          {showDashboardMetrics && (
            <RequestDashboardMetrics
              requests={modalFilteredRequests}
              startDate={modalStartDate}
              endDate={modalEndDate}
            />
          )}

          {showRequestAnalysis && (
            <RequestAnalysis
              requests={modalFilteredRequests}
              onClose={() => setShowRequestAnalysis(false)}
              startDate={modalStartDate}
              endDate={modalEndDate}
            />
          )}

          {showCategoryAnalysis && (
            <RequestCategoryAnalysis
              requests={modalFilteredRequests}
              onClose={() => setShowCategoryAnalysis(false)}
              startDate={modalStartDate}
              endDate={modalEndDate}
            />
          )}

          {showPriorityAnalysis && (
            <RequestPriorityAnalysis
              requests={modalFilteredRequests}
              onClose={() => setShowPriorityAnalysis(false)}
              startDate={modalStartDate}
              endDate={modalEndDate}
            />
          )}

          {showHistoryAnalysis && (
            <RequestHistoryAnalysis
              requests={modalFilteredRequests}
              onClose={() => setShowHistoryAnalysis(false)}
              startDate={modalStartDate}
              endDate={modalEndDate}
            />
          )}

          {showSLAAnalysis && (
            <RequestSLAAnalysis
              requests={modalFilteredRequests}
              onClose={() => setShowSLAAnalysis(false)}
              startDate={modalStartDate}
              endDate={modalEndDate}
            />
          )}

          {showPerformanceMetrics && (
            <RequestPerformanceMetrics
              requests={modalFilteredRequests}
              onClose={() => setShowPerformanceMetrics(false)}
              startDate={modalStartDate}
              endDate={modalEndDate}
            />
          )}

          {showTrendAnalysis && (
            <RequestTrendAnalysis
              requests={modalFilteredRequests}
              onClose={() => setShowTrendAnalysis(false)}
              startDate={modalStartDate}
              endDate={modalEndDate}
            />
          )}

          {showAIPredictiveAnalysis && (
            <AIPredictiveAnalysis
              requests={modalFilteredRequests}
              onClose={() => setShowAIPredictiveAnalysis(false)}
            />
          )}

          {showUserAnalysis && (
            <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Principais Usuários</h2>
                <button
                  onClick={() => setShowUserAnalysis(false)}
                  className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-white" />
                </button>
              </div>
              <RequestUserAnalysis
                requests={modalFilteredRequests}
                startDate={modalStartDate}
                endDate={modalEndDate}
              />
            </div>
          )}

          {showLocationAnalysis && (
            <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Análise por Localidade</h2>
                <button
                  onClick={() => setShowLocationAnalysis(false)}
                  className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-white" />
                </button>
              </div>
              <RequestLocationAnalysis
                requests={modalFilteredRequests}
                startDate={modalStartDate}
                endDate={modalEndDate}
              />
            </div>
          )}

          {showInProgressRequests && (
            <InProgressRequestsModal
              requests={requests}
              onClose={() => setShowInProgressRequests(false)}
            />
          )}

          {showOnHoldRequests && (
            <OnHoldRequestsModal
              requests={requests}
              onClose={() => setShowOnHoldRequests(false)}
            />
          )}

          {showHighPriorityModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
              <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
                <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Chamados de Alta Prioridade</h2>
                  <button onClick={() => setShowHighPriorityModal(false)} className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors">
                    <X className="h-5 w-5 text-gray-400 hover:text-white" />
                  </button>
                </div>
                <div className="p-6">
                  {highPriorityRequests.length === 0 ? (
                    <p className="text-gray-400">Nenhum chamado de alta prioridade encontrado.</p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-gray-400 px-4 py-2">Número</th>
                          <th className="text-left text-gray-400 px-4 py-2">Descrição</th>
                          <th className="text-left text-gray-400 px-4 py-2">Solicitante</th>
                          <th className="text-left text-gray-400 px-4 py-2">Data</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {highPriorityRequests.map(request => (
                          <tr key={request.Number} className="hover:bg-[#1C2333] transition-colors">
                            <td className="px-4 py-2 text-white">{request.Number}</td>
                            <td className="px-4 py-2 text-gray-300">{request.ShortDescription}</td>
                            <td className="px-4 py-2 text-gray-300">{request.RequestedForName}</td>
                            <td className="px-4 py-2 text-gray-300">{request.Opened}</td>
                            <td className="px-4 py-2">
                              <button onClick={() => { setShowHighPriorityModal(false); setSelectedRequest(request); }} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                <ExternalLink className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedRequest && (
            <RequestDetails request={selectedRequest} onClose={() => setSelectedRequest(null)} />
          )}
        </div>
      </main>
    </div>
  );
}

// Component for User Analysis
function RequestUserAnalysis({ requests, startDate, endDate }: { requests: Request[], startDate?: string, endDate?: string }) {
  const userStats = React.useMemo(() => {
    // Filter by date range if provided
    const filteredRequests = requests.filter(request => {
      if (!startDate || !endDate) return true;
      
      try {
        const requestDate = parseISO(request.Opened);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        return isWithinInterval(requestDate, { start, end });
      } catch (error) {
        return false;
      }
    });

    // Group by user using the "Request item [Catalog Task] Requested for Name" field
    const userMap = filteredRequests.reduce((acc, request) => {
      // Use the correct field for user identification
      const user = request["Request item [Catalog Task] Requested for Name"] || request.RequestedForName || 'Não identificado';
      
      if (!acc[user]) {
        acc[user] = {
          name: user,
          total: 0,
          completed: 0,
          inProgress: 0,
          onHold: 0,
          highPriority: 0,
          categories: new Set<string>()
        };
      }
      
      acc[user].total++;
      
      // Count by status
      const state = request.State?.toLowerCase() || '';
      if (state.includes('complete') || state.includes('closed complete')) {
        acc[user].completed++;
      } else if (state.includes('hold') || state.includes('pending') || state.includes('aguardando')) {
        acc[user].onHold++;
      } else if (state.includes('progress') || state.includes('assigned')) {
        acc[user].inProgress++;
      }
      
      // Count high priority
      if (request.Priority?.toLowerCase().includes('high') || 
          request.Priority?.toLowerCase().includes('p1') || 
          request.Priority?.toLowerCase().includes('1')) {
        acc[user].highPriority++;
      }
      
      // Track categories
      if (request.RequestItem) {
        acc[user].categories.add(request.RequestItem);
      }
      
      return acc;
    }, {} as Record<string, {
      name: string;
      total: number;
      completed: number;
      inProgress: number;
      onHold: number;
      highPriority: number;
      categories: Set<string>;
    }>);
    
    return Object.values(userMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20); // Top 20 users
  }, [requests, startDate, endDate]);

  if (userStats.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Nenhum dado de usuário encontrado no período selecionado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userStats.slice(0, 6).map(user => (
          <div 
            key={user.name}
            className="bg-[#1C2333] p-4 rounded-lg cursor-pointer hover:bg-[#1F2937] transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-indigo-400" />
                  <h4 className="text-lg font-medium text-white truncate">{user.name}</h4>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {user.categories.size} {user.categories.size === 1 ? 'categoria' : 'categorias'} solicitadas
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">{user.total}</span>
                <p className="text-sm text-gray-400">solicitações</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="text-center">
                  <span className="text-blue-400">{user.inProgress}</span>
                  <p className="text-gray-400 text-xs">Em Andamento</p>
                </div>
                <div className="text-center">
                  <span className="text-orange-400">{user.onHold}</span>
                  <p className="text-gray-400 text-xs">Em Espera</p>
                </div>
                <div className="text-center">
                  <span className="text-green-400">{user.completed}</span>
                  <p className="text-gray-400 text-xs">Concluídos</p>
                </div>
                <div className="text-center">
                  <span className="text-red-400">{user.highPriority}</span>
                  <p className="text-gray-400 text-xs">Alta Prioridade</p>
                </div>
              </div>

              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 float-left"
                  style={{ width: `${(user.inProgress / user.total) * 100}%` }}
                />
                <div
                  className="h-full bg-orange-500 float-left"
                  style={{ width: `${(user.onHold / user.total) * 100}%` }}
                />
                <div
                  className="h-full bg-green-500 float-left"
                  style={{ width: `${(user.completed / user.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1C2333] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#151B2B]">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-400">Usuário</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Total</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Em Andamento</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Em Espera</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Concluídos</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Alta Prioridade</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Categorias</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {userStats.map((user) => (
              <tr 
                key={user.name}
                className="hover:bg-[#151B2B] transition-colors"
              >
                <td className="px-6 py-4 text-sm text-white">{user.name}</td>
                <td className="px-6 py-4 text-sm text-center text-white">{user.total}</td>
                <td className="px-6 py-4 text-sm text-center text-blue-400">{user.inProgress}</td>
                <td className="px-6 py-4 text-sm text-center text-orange-400">{user.onHold}</td>
                <td className="px-6 py-4 text-sm text-center text-green-400">{user.completed}</td>
                <td className="px-6 py-4 text-sm text-center text-red-400">{user.highPriority}</td>
                <td className="px-6 py-4 text-sm text-center text-gray-400">{user.categories.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Component for Location Analysis
function RequestLocationAnalysis({ requests, startDate, endDate }: { requests: Request[], startDate?: string, endDate?: string }) {
  const locationStats = useMemo(() => {
    // Filter by date range if provided
    const filteredRequests = requests.filter(request => {
      if (!startDate || !endDate) return true;
      
      try {
        const requestDate = parseISO(request.Opened);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        return isWithinInterval(requestDate, { start, end });
      } catch (error) {
        return false;
      }
    });

    // Group by location (using AssignmentGroup as proxy for location)
    const locationMap = filteredRequests.reduce((acc, request) => {
      const location = normalizeLocationName(request.AssignmentGroup) || 'Não especificado';
      
      if (!acc[location]) {
        acc[location] = {
          name: location,
          total: 0,
          completed: 0,
          inProgress: 0,
          onHold: 0,
          highPriority: 0,
          users: new Set<string>()
        };
      }
      
      acc[location].total++;
      
      // Count by status
      const state = request.State?.toLowerCase() || '';
      if (state.includes('complete') || state.includes('closed complete')) {
        acc[location].completed++;
      } else if (state.includes('hold') || state.includes('pending') || state.includes('aguardando')) {
        acc[location].onHold++;
      } else if (state.includes('progress') || state.includes('assigned')) {
        acc[location].inProgress++;
      }
      
      // Count high priority
      if (request.Priority?.toLowerCase().includes('high') || 
          request.Priority?.toLowerCase().includes('p1') || 
          request.Priority?.toLowerCase().includes('1')) {
        acc[location].highPriority++;
      }
      
      // Track unique users - use the correct field for user identification
      if (request["Request item [Catalog Task] Requested for Name"]) {
        acc[location].users.add(request["Request item [Catalog Task] Requested for Name"]);
      } else if (request.RequestedForName) {
        acc[location].users.add(request.RequestedForName);
      }
      
      return acc;
    }, {} as Record<string, {
      name: string;
      total: number;
      completed: number;
      inProgress: number;
      onHold: number;
      highPriority: number;
      users: Set<string>;
    }>);
    
    return Object.values(locationMap)
      .sort((a, b) => b.total - a.total);
  }, [requests, startDate, endDate]);

  if (locationStats.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Nenhum dado de localidade encontrado no período selecionado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locationStats.slice(0, 6).map(location => (
          <div 
            key={location.name}
            className="bg-[#1C2333] p-4 rounded-lg hover:bg-[#1F2937] transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-400" />
                  <h4 className="text-lg font-medium text-white truncate">{location.name}</h4>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {location.users.size} {location.users.size === 1 ? 'usuário' : 'usuários'} ativos
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">{location.total}</span>
                <p className="text-sm text-gray-400">solicitações</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="text-center">
                  <span className="text-blue-400">{location.inProgress}</span>
                  <p className="text-gray-400 text-xs">Em Andamento</p>
                </div>
                <div className="text-center">
                  <span className="text-orange-400">{location.onHold}</span>
                  <p className="text-gray-400 text-xs">Em Espera</p>
                </div>
                <div className="text-center">
                  <span className="text-green-400">{location.completed}</span>
                  <p className="text-gray-400 text-xs">Concluídos</p>
                </div>
                <div className="text-center">
                  <span className="text-red-400">{location.highPriority}</span>
                  <p className="text-gray-400 text-xs">Alta Prioridade</p>
                </div>
              </div>

              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 float-left"
                  style={{ width: `${(location.inProgress / location.total) * 100}%` }}
                />
                <div
                  className="h-full bg-orange-500 float-left"
                  style={{ width: `${(location.onHold / location.total) * 100}%` }}
                />
                <div
                  className="h-full bg-green-500 float-left"
                  style={{ width: `${(location.completed / location.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1C2333] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#151B2B]">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-400">Localidade</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Total</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Em Andamento</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Em Espera</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Concluídos</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Alta Prioridade</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-400">Usuários</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {locationStats.map((location) => (
              <tr 
                key={location.name}
                className="hover:bg-[#151B2B] transition-colors"
              >
                <td className="px-6 py-4 text-sm text-white">{location.name}</td>
                <td className="px-6 py-4 text-sm text-center text-white">{location.total}</td>
                <td className="px-6 py-4 text-sm text-center text-blue-400">{location.inProgress}</td>
                <td className="px-6 py-4 text-sm text-center text-orange-400">{location.onHold}</td>
                <td className="px-6 py-4 text-sm text-center text-green-400">{location.completed}</td>
                <td className="px-6 py-4 text-sm text-center text-red-400">{location.highPriority}</td>
                <td className="px-6 py-4 text-sm text-center text-gray-400">{location.users.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}