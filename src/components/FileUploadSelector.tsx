import React, { useState, useCallback } from 'react';
import { FileSpreadsheet, AlertCircle, Info, BarChart3, FileText, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Incident } from '../types/incident';
import { Request } from '../types/request';
import { TemplateDownload } from './TemplateDownload';

interface FileUploadSelectorProps {
  onSelectIncidents: (data: Incident[]) => void;
  onSelectRequests: (data: Request[]) => void;
}

export function FileUploadSelector({ onSelectIncidents, onSelectRequests }: FileUploadSelectorProps) {
  const [selectedType, setSelectedType] = useState<'incidents' | 'requests' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Track the loading status of both data types
  const [incidentsLoaded, setIncidentsLoaded] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [incidentsData, setIncidentsData] = useState<Incident[]>([]);
  const [requestsData, setRequestsData] = useState<Request[]>([]);

  const handleTypeSelect = (type: 'incidents' | 'requests') => {
    setSelectedType(type);
    setError(null);
    setProgress(0);
  };

  const processIncidentData = async (data: any[]): Promise<Incident[]> => {
    // Column mappings for incident data
    const columnMappings = {
      number: ['Number', 'Incident Number', 'ID', 'Reference', 'IncidentNumber', 'Número', 'Numero', 'Chamado', 'Ticket'],
      opened: ['Opened', 'Created Date', 'Open Date', 'Start Date', 'Created', 'Data Abertura', 'Data', 'Data Criação', 'Início'],
      description: ['Short description', 'Description', 'Details', 'Summary', 'Descrição', 'Descricao', 'Resumo', 'C'],
      caller: ['Request item [Catalog Task] Requested for Name', 'Requested for Name', 'Caller', 'Reported By', 'Created By', 'Requestor', 'Solicitante', 'Usuario', 'Usuário', 'D'],
      priority: ['Priority', 'Incident Priority', 'Urgency', 'Prioridade', 'Urgência'],
      state: ['State', 'Status', 'Current State', 'Estado', 'Situação'],
      category: ['Category', 'Incident Category', 'Type', 'Categoria', 'Tipo'],
      subcategory: ['Subcategory', 'Sub Category', 'Sub-Category', 'Subcategoria', 'Sub-Categoria'],
      assignmentGroup: ['Assignment group', 'Assigned Group', 'Team', 'Grupo', 'Grupo Atribuído', 'G'],
      assignedTo: ['Assigned to', 'Assigned To', 'Owner', 'Atribuído para', 'Atribuido para', 'Responsável'],
      updated: ['Updated', 'Last Modified Date', 'Modified Date', 'Data Atualização', 'Última Atualização'],
      updatedBy: ['Updated by', 'Last Modified By', 'Modified By', 'Atualizado por', 'Modificado por'],
      businessImpact: ['Business impact', 'Impact', 'Severity', 'Impacto', 'Severidade'],
      responseTime: ['Response Time', 'Resolution Time', 'Time to Resolve', 'Tempo Resposta', 'Tempo de Resolução'],
      location: ['Location', 'Site', 'Local', 'Localidade', 'Localização'],
      commentsAndWorkNotes: [
        'Comments and Work notes',
        'Work notes',
        'Additional comments',
        'Comments',
        'Work Notes',
        'Comentários',
        'Notas de Trabalho',
        'Observações',
        'Notas',
        'Comentarios',
        'Notas de trabalho'
      ]
    };

    const findColumnValue = (row: any, mappings: string[]): string => {
      // First try exact match
      for (const mapping of mappings) {
        if (row[mapping] !== undefined) {
          return String(row[mapping] || '').trim();
        }
      }
      
      // Then try case-insensitive match
      const rowKeys = Object.keys(row);
      for (const mapping of mappings) {
        const key = rowKeys.find(k => k.toLowerCase() === mapping.toLowerCase());
        if (key && row[key] !== undefined) {
          return String(row[key] || '').trim();
        }
      }
      
      return '';
    };

    const totalRows = data.length;
    const processedIncidents: Incident[] = [];
    
    for (let i = 0; i < totalRows; i++) {
      const row = data[i];
      setProgress(Math.round(((i + 1) / totalRows) * 100));
      
      if (!row || typeof row !== 'object' || Object.keys(row).length === 0) {
        continue;
      }

      // Sanitização das novas colunas
      const sanitize = (value: string) => {
        if (!value) return '';
        return String(value)
          .replace(/[\r\n\t]+/g, ' ')
          .replace(/["'`´]/g, '')
          .replace(/[^\w\sÀ-ÿ-]/g, '') // Mantém letras, números, espaços e acentuação
          .trim();
      };

      const incident: Incident = {
        Number: findColumnValue(row, columnMappings.number),
        Opened: findColumnValue(row, columnMappings.opened),
        ShortDescription: findColumnValue(row, columnMappings.description),
        Caller: findColumnValue(row, columnMappings.caller),
        Priority: findColumnValue(row, columnMappings.priority),
        State: findColumnValue(row, columnMappings.state),
        Category: findColumnValue(row, columnMappings.category),
        Subcategory: findColumnValue(row, columnMappings.subcategory),
        AssignmentGroup: findColumnValue(row, columnMappings.assignmentGroup),
        AssignedTo: findColumnValue(row, columnMappings.assignedTo),
        Updated: findColumnValue(row, columnMappings.updated),
        UpdatedBy: findColumnValue(row, columnMappings.updatedBy),
        BusinessImpact: findColumnValue(row, columnMappings.businessImpact),
        ResponseTime: findColumnValue(row, columnMappings.responseTime) || '0',
        Location: findColumnValue(row, columnMappings.location),
        CommentsAndWorkNotes: findColumnValue(row, columnMappings.commentsAndWorkNotes),
        StringAssociado: sanitize(findColumnValue(row, ['String Associado', 'StringAssociado'])),
        FuncaoAssociada: sanitize(findColumnValue(row, ['Função Associada', 'Funcao Associada', 'FuncaoAssociada']))
      };

      // Log para depuração
      if (incident.StringAssociado || incident.FuncaoAssociada) {
        console.log('Valores lidos - StringAssociado:', incident.StringAssociado, '| FuncaoAssociada:', incident.FuncaoAssociada);
      }

      // Validação dos campos essenciais
      if (!incident.Number || !incident.Opened || !incident.Priority || !incident.State) {
        console.warn('Incidente com campos essenciais ausentes:', incident);
        continue; // Pula incidentes inválidos
      }

      if (incident.Number) {
        processedIncidents.push(incident);
      }

      // Allow UI to update
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    console.log("Processed incidents:", processedIncidents.length);
    return processedIncidents;
  };

  const processRequestData = async (data: any[]): Promise<Request[]> => {
    // Column mappings for request data
    const columnMappings = {
      number: ['Number', 'Request Number', 'ID', 'Reference', 'RequestNumber', 'Número', 'Numero', 'Chamado', 'Ticket'],
      opened: ['Opened', 'Open', 'Created Date', 'Open Date', 'Start Date', 'Created', 'Data Abertura', 'Data', 'Data Criação', 'Início'],
      shortDescription: ['Short description', 'Summary', 'Resumo', 'Descrição Curta', 'Descricao Curta'],
      description: ['Description', 'Details', 'Full Description', 'Descrição', 'Descricao', 'Descrição Completa', 'Descricao Completa'],
      requestItem: ['Request item [Catalog Task]', 'Catalog Task', 'Item Catálogo', 'Item', 'Tipo de Solicitação'],
      requestedForName: ['Requested for Name', 'Requested For', 'Solicitado Para', 'Solicitante', 'Usuario', 'Usuário'],
      priority: ['Priority', 'Request Priority', 'Urgency', 'Prioridade', 'Urgência'],
      state: ['State', 'Status', 'Current State', 'Estado', 'Situação'],
      assignmentGroup: ['Assignment group', 'Assigned Group', 'Team', 'Grupo', 'Grupo Atribuído', 'Localidade'],
      assignedTo: ['Assigned to', 'Assigned To', 'Owner', 'Atribuído para', 'Atribuido para', 'Responsável'],
      updated: ['Updated', 'Last Modified Date', 'Modified Date', 'Data Atualização', 'Última Atualização'],
      updatedBy: ['Updated by', 'Last Modified By', 'Modified By', 'Atualizado por', 'Modificado por'],
      commentsAndWorkNotes: [
        'Comments and Work notes',
        'Work notes',
        'Additional comments',
        'Comments',
        'Work Notes',
        'Comentários',
        'Notas de Trabalho',
        'Observações',
        'Notas',
        'Comentarios',
        'Notas de trabalho'
      ],
      businessImpact: ['Business impact', 'Impact', 'Severity', 'Impacto', 'Severidade']
    };

    const findColumnValue = (row: any, mappings: string[]): string => {
      // First try exact match
      for (const mapping of mappings) {
        if (row[mapping] !== undefined) {
          return String(row[mapping] || '').trim();
        }
      }
      
      // Then try case-insensitive match
      const rowKeys = Object.keys(row);
      for (const mapping of mappings) {
        const key = rowKeys.find(k => k.toLowerCase() === mapping.toLowerCase());
        if (key && row[key] !== undefined) {
          return String(row[key] || '').trim();
        }
      }
      
      return '';
    };

    const totalRows = data.length;
    const processedRequests: Request[] = [];
    
    for (let i = 0; i < totalRows; i++) {
      const row = data[i];
      setProgress(Math.round(((i + 1) / totalRows) * 100));
      
      if (!row || typeof row !== 'object' || Object.keys(row).length === 0) {
        continue;
      }

      const request: Request = {
        Number: findColumnValue(row, columnMappings.number),
        Opened: findColumnValue(row, columnMappings.opened),
        ShortDescription: findColumnValue(row, columnMappings.shortDescription),
        Description: findColumnValue(row, columnMappings.description),
        RequestItem: findColumnValue(row, columnMappings.requestItem),
        RequestedForName: findColumnValue(row, columnMappings.requestedForName),
        Priority: findColumnValue(row, columnMappings.priority),
        State: findColumnValue(row, columnMappings.state),
        AssignmentGroup: findColumnValue(row, columnMappings.assignmentGroup),
        AssignedTo: findColumnValue(row, columnMappings.assignedTo),
        Updated: findColumnValue(row, columnMappings.updated),
        UpdatedBy: findColumnValue(row, columnMappings.updatedBy),
        CommentsAndWorkNotes: findColumnValue(row, columnMappings.commentsAndWorkNotes),
        BusinessImpact: findColumnValue(row, columnMappings.businessImpact)
      };

      if (request.Number) {
        processedRequests.push(request);
      }

      // Allow UI to update
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    console.log("Processed requests:", processedRequests.length);
    return processedRequests;
  };

  const processExcelFile = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      const data = await new Promise<any[]>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          try {
            const binaryStr = event.target?.result;
            const workbook = XLSX.read(binaryStr, { type: 'binary' });
            
            if (!workbook.SheetNames.length) {
              throw new Error('Arquivo Excel vazio');
            }

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            const rawData = XLSX.utils.sheet_to_json(worksheet, {
              raw: false,
              defval: '',
              header: 1
            });

            if (!rawData || !Array.isArray(rawData) || rawData.length <= 1) {
              throw new Error('Arquivo não contém dados válidos');
            }

            const headers = rawData[0];
            if (!Array.isArray(headers) || headers.length === 0) {
              throw new Error('Cabeçalhos não encontrados no arquivo');
            }

            const data = rawData.slice(1).map((row: any) => {
              const obj: any = {};
              headers.forEach((header: string, index: number) => {
                if (header) {
                  obj[header] = row[index] || '';
                }
              });
              return obj;
            });

            resolve(data);
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
        reader.readAsBinaryString(file);
      });

      if (selectedType === 'incidents') {
        const processedData = await processIncidentData(data);
        setIncidentsData(processedData);
        setIncidentsLoaded(true);
        console.log("Incidents loaded:", processedData.length);
        
        // Call onSelectIncidents immediately
        onSelectIncidents(processedData);
      } else if (selectedType === 'requests') {
        const processedData = await processRequestData(data);
        setRequestsData(processedData);
        setRequestsLoaded(true);
        console.log("Requests loaded:", processedData.length);
        
        // Call onSelectRequests immediately
        onSelectRequests(processedData);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao processar o arquivo Excel');
    } finally {
      setIsUploading(false);
      setProgress(100);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        await processExcelFile(file);
      }
    },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-6">
        <div className="flex flex-col items-center justify-center">
          <img 
            src="/onset-logo.svg" 
            alt="OnSet Logo" 
            className="h-40 w-auto mb-2" 
            style={{ height: '120px', width: 'auto' }} /* Increased size for better visibility */
          />
          <h1 className="text-3xl font-bold text-white mb-1">IT Operations Dashboard</h1>
          <p className="text-gray-400">
            Conectando Inteligência e Tecnologia
          </p>
        </div>
        <div className="bg-[#151B2B] p-6 rounded-lg">
          <p className="text-gray-300 leading-relaxed">
            Selecione o tipo de dados que deseja carregar para análise
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Incidents Upload Option */}
        <div className={`bg-[#151B2B] p-8 rounded-lg text-left ${incidentsLoaded ? 'border-2 border-green-500/50' : ''}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-lg">
              <BarChart3 className="h-8 w-8 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Incidentes</h2>
              <p className="text-gray-400">Análise de chamados e incidentes</p>
            </div>
            {incidentsLoaded && (
              <div className="ml-auto p-2 bg-green-500/20 rounded-full">
                <Check className="h-6 w-6 text-green-500" />
              </div>
            )}
          </div>

          {incidentsLoaded ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Carregamento concluído</span>
                <span className="text-green-400">100%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '100%' }} />
              </div>
              <p className="text-green-400 text-sm mt-2">
                {incidentsData.length} incidentes carregados com sucesso
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-sm text-gray-400 mb-4">
                <p>• Análise por categoria e prioridade</p>
                <p>• Monitoramento de SLA</p>
                <p>• Distribuição por equipe</p>
                <p>• Análise de impacto</p>
              </div>
              
              {selectedType === 'incidents' && isUploading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Processando...</span>
                    <span className="text-indigo-400">{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-300" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      handleTypeSelect('incidents');
                      open();
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    disabled={isUploading}
                  >
                    <FileSpreadsheet className="h-5 w-5" />
                    <span>Carregar Incidentes</span>
                  </button>
                  
                  <TemplateDownload type="incidents" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Requests Upload Option */}
        <div className={`bg-[#151B2B] p-8 rounded-lg text-left ${requestsLoaded ? 'border-2 border-green-500/50' : ''}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <FileText className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Requests</h2>
              <p className="text-gray-400">Análise de solicitações e demandas</p>
            </div>
            {requestsLoaded && (
              <div className="ml-auto p-2 bg-green-500/20 rounded-full">
                <Check className="h-6 w-6 text-green-500" />
              </div>
            )}
          </div>

          {requestsLoaded ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Carregamento concluído</span>
                <span className="text-green-400">100%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '100%' }} />
              </div>
              <p className="text-green-400 text-sm mt-2">
                {requestsData.length} requests carregados com sucesso
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-sm text-gray-400 mb-4">
                <p>• Análise por tipo e categoria</p>
                <p>• Controle de aprovações</p>
                <p>• Métricas de custo</p>
                <p>• Prazos e entregas</p>
              </div>
              
              {selectedType === 'requests' && isUploading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Processando...</span>
                    <span className="text-emerald-400">{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      handleTypeSelect('requests');
                      open();
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    disabled={isUploading}
                  >
                    <FileSpreadsheet className="h-5 w-5" />
                    <span>Carregar Requests</span>
                  </button>
                  
                  <TemplateDownload type="requests" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hidden dropzone for file selection */}
      <div {...getRootProps()} className="hidden">
        <input {...getInputProps()} />
      </div>

      {/* Status message for both files loaded */}
      {incidentsLoaded && requestsLoaded && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
          <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-green-400 mb-2">
            Carregamento Completo!
          </h3>
          <p className="text-gray-300">
            Ambos os conjuntos de dados foram carregados com sucesso. Redirecionando para os dashboards...
          </p>
          <div className="mt-4 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-white animate-spin mr-2" />
            <span className="text-white">Preparando dashboards</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-400">
                Erro ao carregar arquivo
              </h3>
              <p className="text-sm text-red-300 mt-1">
                {error}
              </p>
              <div className="mt-2">
                <p className="text-sm text-red-400">
                  Verifique se o arquivo:
                </p>
                <ul className="list-disc list-inside text-sm text-red-300 mt-1 space-y-1">
                  <li>É um arquivo Excel válido (.xlsx ou .xls)</li>
                  <li>Contém as colunas necessárias (Número, Data, Descrição, etc.)</li>
                  <li>Possui dados válidos nas linhas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-blue-400" />
          <p className="text-blue-400">
            Os arquivos devem estar no formato Excel (.xlsx ou .xls)
          </p>
        </div>
      </div>
    </div>
  );
}