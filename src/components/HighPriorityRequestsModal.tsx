import React from 'react';
import { X } from 'lucide-react';
import { Request } from '../types/request';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HighPriorityRequestsModalProps {
  requests: Request[];
  onClose: () => void;
}

export function HighPriorityRequestsModal({ requests, onClose }: HighPriorityRequestsModalProps) {
  const highPriorityRequests = requests.filter(request => 
    request.Priority?.toLowerCase().includes('high') || 
    request.Priority?.toLowerCase().includes('p1') || 
    request.Priority?.toLowerCase().includes('1')
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Requests de Alta Prioridade</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(80vh-8rem)]">
          {highPriorityRequests.length > 0 ? (
            <div className="space-y-4">
              {highPriorityRequests.map((request) => (
                <div
                  key={request.Number}
                  className="bg-[#1C2333] p-4 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-400">
                      {request.Number}
                    </span>
                    <span className="text-sm text-red-400 font-medium">
                      {request.Priority}
                    </span>
                  </div>
                  
                  <h3 className="text-white font-medium">
                    {request.ShortDescription}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Solicitante</p>
                      <p className="text-white">{request.RequestedForName || 'Não especificado'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Grupo</p>
                      <p className="text-white">{request.AssignmentGroup || 'Não atribuído'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Status</p>
                      <p className="text-white">{request.State || 'Não definido'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Aberto em</p>
                      <p className="text-white">
                        {request.Opened
                          ? format(parseISO(request.Opened), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                          : 'Data não disponível'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">Não há requests de alta prioridade no momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 