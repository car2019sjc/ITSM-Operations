import React from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import environment from '../config/environment';

interface DashboardHeaderProps {
  onLogout?: () => void;
  onReload?: () => void;
  title?: string;
  onShowRequestDashboard?: () => void;
  onShowExecutiveDashboard?: () => void;
}

export function DashboardHeader({ 
  onLogout, 
  onReload, 
  title,
  onShowRequestDashboard,
  onShowExecutiveDashboard 
}: DashboardHeaderProps) {
  return (
    <header className="bg-[#151B2B] py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center logo-container">
            <img 
              src="/onset-logo.svg" 
              alt="OnSet Logo" 
              className="h-20 w-auto mr-3" 
              style={{ height: '160px', width: 'auto' }} /* Increased to 160px for better visibility */
            />
            <div className="ml-3">
              <h1 className="text-2xl font-bold text-white">
                {title || "IT Operations Dashboard"}
                {environment.isDevelopment && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full">
                    Development
                  </span>
                )}
              </h1>
              <p className="text-orange-500 text-sm mt-1">
                Conectando Inteligência e Tecnologia
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onReload && (
              <button
                onClick={onReload}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-colors"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Recarregar
              </button>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-medium transition-colors"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Sair
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}