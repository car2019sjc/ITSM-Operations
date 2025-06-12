import React, { useState } from 'react';
import { X, User, Users, Briefcase, AlertTriangle, Calendar, MessageSquare } from 'lucide-react';
import { Request, normalizeRequestPriority, normalizeRequestStatus, REQUEST_PRIORITIES, REQUEST_STATUSES } from '../types/request';
import { format, startOfYear } from 'date-fns';

interface RequestDetailsProps {
  request: Request;
  onClose: () => void;
}

export function RequestDetails({ request, onClose }: RequestDetailsProps) {
  const [startDate, setStartDate] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  console.log('Description:', request.Description);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#1C2333] rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Detalhes da Solicitação</h2>
              <p className="text-gray-400 mt-1">{request.Number}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#151B2B] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Filtro de Data */}
            <div className="bg-[#151B2B] p-4 rounded-lg">
              <div className="flex items-center space-x-4">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div className="flex space-x-4">
                  <div>
                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-400">
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      id="start-date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 block w-full rounded-md bg-[#1C2333] border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="end-date" className="block text-sm font-medium text-gray-400">
                      Data Final
                    </label>
                    <input
                      type="date"
                      id="end-date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 block w-full rounded-md bg-[#1C2333] border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status e Prioridade */}
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className={`text-white px-2 py-0.5 rounded-full inline-block ${
                  (() => {
                    const status = normalizeRequestStatus(request.State);
                    switch (status) {
                      case 'COMPLETED':
                        return 'bg-green-500/20 text-green-400';
                      case 'IN_PROGRESS':
                        return 'bg-blue-500/20 text-blue-400';
                      case 'ON_HOLD':
                        return 'bg-yellow-500/20 text-yellow-400';
                      case 'CANCELLED':
                        return 'bg-red-500/20 text-red-400';
                      default:
                        return 'bg-gray-500/20 text-gray-400';
                    }
                  })()
                }`}>
                  {REQUEST_STATUSES[normalizeRequestStatus(request.State)]}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Prioridade</p>
                <p className={`text-white px-2 py-0.5 rounded-full inline-block ${
                  (() => {
                    const priority = normalizeRequestPriority(request.Priority);
                    switch (priority) {
                      case 'HIGH':
                        return 'bg-red-500/20 text-red-400';
                      case 'MEDIUM':
                        return 'bg-yellow-500/20 text-yellow-400';
                      case 'LOW':
                        return 'bg-green-500/20 text-green-400';
                      default:
                        return 'bg-gray-500/20 text-gray-400';
                    }
                  })()
                }`}>
                  {REQUEST_PRIORITIES[normalizeRequestPriority(request.Priority)]}
                </p>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                Descrição
              </h3>
              <p className="text-gray-400">{request.ShortDescription}</p>
              {request.Description && (
                <div className="mt-4">
                  <h4 className="text-md font-medium text-white mb-2">Descrição Detalhada</h4>
                  <p className="text-gray-400 whitespace-pre-wrap">{request.Description}</p>
                </div>
              )}
            </div>

            {/* Informações do Item e Impacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  Informações do Item
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Item da Requisição</p>
                    <p className="text-white">{request.RequestItem}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Impacto no Negócio</p>
                    <p className="text-white">{request.BusinessImpact}</p>
                  </div>
                </div>
              </div>

              {/* Atribuição */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-400" />
                  Atribuição
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Grupo de Atribuição</p>
                    <p className="text-white">{request.AssignmentGroup}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Atribuído para</p>
                    <p className="text-white">{request.AssignedTo}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Datas */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                Datas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Aberto em</p>
                  <p className="text-white">{formatDate(request.Opened)}</p>
                </div>
                {request.Updated && (
                  <div>
                    <p className="text-sm text-gray-400">Última atualização</p>
                    <p className="text-white">{formatDate(request.Updated)}</p>
                    <p className="text-sm text-gray-400 mt-1">por {request.UpdatedBy}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Comentários */}
            {request.CommentsAndWorkNotes && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                  Comentários e Notas de Trabalho
                </h3>
                <div className="bg-[#151B2B] p-4 rounded-lg">
                  <p className="text-gray-400 whitespace-pre-wrap">{request.CommentsAndWorkNotes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 