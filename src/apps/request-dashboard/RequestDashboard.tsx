import React, { useState } from 'react';
import { FileUpload } from '../../components/FileUpload';
import { DashboardHeader } from '../../components/DashboardHeader';
import { SearchBar } from '../../components/SearchBar';
import { StatsCard } from '../../components/StatsCard';
import { CategoryCard } from '../../components/CategoryCard';
import { RequestAnalysis } from '../../components/RequestAnalysis';
import { RequestCategoryAnalysis } from '../../components/RequestCategoryAnalysis';
import { RequestPriorityAnalysis } from '../../components/RequestPriorityAnalysis';
import { RequestHistoryAnalysis } from '../../components/RequestHistoryAnalysis';
import { Request } from '../../types/request';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '@tanstack/react-router';
import { 
  BarChart2, 
  FileText, 
  Clock, 
  Users, 
  History,
  AlertTriangle
} from 'lucide-react';
import { format, startOfYear } from 'date-fns';
import environment from '../../config/environment';

export function RequestDashboard() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showRequestAnalysis, setShowRequestAnalysis] = useState(false);
  const [showCategoryAnalysis, setShowCategoryAnalysis] = useState(false);
  const [showPriorityAnalysis, setShowPriorityAnalysis] = useState(false);
  const [showHistoryAnalysis, setShowHistoryAnalysis] = useState(false);

  const handleDataLoaded = (data: Request[]) => {
    setRequests(data);
    setSearchQuery('');
    setStartDate(format(startOfYear(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedCategory('');
    setSelectedStatus('');
  };

  const handleLogout = () => {
    logout();
    navigate({ to: '/' });
  };

  const handleReload = () => {
    setRequests([]);
    setSearchQuery('');
    setStartDate(format(startOfYear(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedCategory('');
    setSelectedStatus('');
  };

  const stats = {
    total: requests.length,
    inProgress: requests.filter(r => r.State?.toLowerCase().includes('progress')).length,
    completed: requests.filter(r => r.State?.toLowerCase().includes('completed')).length,
    highPriority: requests.filter(r => r.Priority?.toLowerCase().includes('high')).length
  };

  if (!isAuthenticated) {
    navigate({ to: '/' });
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <DashboardHeader 
        title={environment.appTitle}
        onLogout={handleLogout}
        onReload={requests.length > 0 ? handleReload : undefined}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!requests.length ? (
          <div className="max-w-xl mx-auto">
            <FileUpload onDataLoaded={handleDataLoaded} />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              />
              <StatsCard
                title="Concluídos"
                value={stats.completed}
                icon={AlertTriangle}
                className="bg-[#151B2B] border-2 border-green-500/50"
                valueColor="text-green-500"
              />
              <StatsCard
                title="Alta Prioridade"
                value={stats.highPriority}
                icon={AlertTriangle}
                className="bg-[#151B2B] border-2 border-red-500/50"
                valueColor="text-red-500"
              />
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
              categories={[]}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              incidents={[]}
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
            </div>

            {showRequestAnalysis && (
              <RequestAnalysis
                requests={requests}
                onClose={() => setShowRequestAnalysis(false)}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {showCategoryAnalysis && (
              <RequestCategoryAnalysis
                requests={requests}
                onClose={() => setShowCategoryAnalysis(false)}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {showPriorityAnalysis && (
              <RequestPriorityAnalysis
                requests={requests}
                onClose={() => setShowPriorityAnalysis(false)}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {showHistoryAnalysis && (
              <RequestHistoryAnalysis
                requests={requests}
                onClose={() => setShowHistoryAnalysis(false)}
                startDate={startDate}
                endDate={endDate}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}