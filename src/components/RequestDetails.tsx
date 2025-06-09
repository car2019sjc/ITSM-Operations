import React from 'react';
import { X } from 'lucide-react';
import { Request, normalizeRequestPriority, normalizeRequestStatus, REQUEST_PRIORITIES, REQUEST_STATUSES } from '../types/request';

interface RequestDetailsProps {
  request: Request;
  onClose: () => void;
}

export function RequestDetails({ request, onClose }: RequestDetailsProps) {
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
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Descrição</h3>
              <p className="text-gray-400">{request.ShortDescription}</p>
              {request.Description && (
                <div className="mt-4">
                  <h4 className="text-md font-medium text-white mb-2">Descrição Detalhada</h4>
                  <p className="text-gray-400 whitespace-pre-wrap">{request.Description}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Informações Gerais</h3>
                <div className="space-y-3">
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
                    <p className="text-white">{REQUEST_PRIORITIES[normalizeRequestPriority(request.Priority)]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Categoria</p>
                    <p className="text-white">{request.RequestItem || 'Não categorizado'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-4">Atribuição</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Solicitante</p>
                    <p className="text-white">{request.RequestedForName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Grupo Responsável</p>
                    <p className="text-white">{request.AssignmentGroup || 'Não atribuído'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Atribuído para</p>
                    <p className="text-white">{request.AssignedTo || 'Não atribuído'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Datas</h3>
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

            {request.CommentsAndWorkNotes && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Comentários e Notas de Trabalho</h3>
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