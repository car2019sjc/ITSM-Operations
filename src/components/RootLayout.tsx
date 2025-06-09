import React from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import { BarChart3, FileText, BookOpen } from 'lucide-react';

export function RootLayout() {
  return (
    <div className="min-h-screen bg-[#0B1120]">
      {/* Top Navigation Bar */}
      <nav className="bg-[#151B2B] border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-white" />
              </Link>
              <div className="ml-10 flex items-center space-x-4">
                <Link
                  to="/"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-black text-orange-500'
                        : 'bg-black text-orange-500 hover:text-orange-400'
                    }`
                  }
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Incidents Dashboard</span>
                  </div>
                </Link>

                <Link
                  to="/requests"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-black text-amber-500'
                        : 'bg-black text-amber-500 hover:text-amber-400'
                    }`
                  }
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <span>Requests Dashboard</span>
                  </div>
                </Link>

                <Link
                  to="/knowledge-base"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-black text-blue-500'
                        : 'bg-black text-blue-500 hover:text-blue-400'
                    }`
                  }
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <span>Knowledge Base</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}