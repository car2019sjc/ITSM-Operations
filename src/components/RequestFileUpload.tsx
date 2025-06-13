import React, { useState, useCallback } from 'react';
import { FileSpreadsheet, X, AlertCircle, Info } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Request } from '../types/request';

interface RequestFileUploadProps {
  onDataLoaded: (data: Request[]) => void;
}

interface ValidationError {
  row: number;
  column: string;
  value: string;
  reason: string;
}

export function RequestFileUpload({ onDataLoaded }: RequestFileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Column mappings for request data based on the specified structure
  const columnMappings = {
    number: ['Number', 'Request Number', 'ID', 'Reference', 'RequestNumber', 'Número', 'Numero', 'Chamado', 'Ticket'],
    opened: ['Opened', 'Open', 'Created Date', 'Open Date', 'Start Date', 'Created', 'Data Abertura', 'Data', 'Data Criação', 'Início'],
    shortDescription: ['Short description', 'Short Description', 'Summary', 'Resumo', 'Descrição Curta', 'Descricao Curta'],
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
    ]
  };

  const resetErrors = () => {
    setError(null);
    setValidationErrors([]);
    setProgress(0);
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

  const formatDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    try {
      // Remove possíveis caracteres extras
      dateStr = dateStr.trim().replace(/['"]/g, '');
      
      // Tenta diferentes formatos de data
      const formats = [
        new Date(dateStr), // formato padrão
        new Date(dateStr.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')), // dd/mm/yyyy para yyyy-mm-dd
        new Date(dateStr.replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$2-$1')), // dd-mm-yyyy para yyyy-mm-dd
      ];
      
      for (const date of formats) {
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      return null;
    } catch (e) {
      console.error('Erro ao processar data:', dateStr, e);
      return null;
    }
  };

  const validatePriority = (priority: string): string | null => {
    if (!priority) return null;

    const p = priority.toLowerCase().trim();
    if (p.includes('p1') || p.includes('1') || p.includes('critical') || p.startsWith('1 -')) {
      return 'P1';
    }
    if (p.includes('p2') || p.includes('2') || p.includes('high') || p.startsWith('2 -')) {
      return 'P2';
    }
    if (p.includes('p3') || p.includes('3') || p.includes('medium') || p.startsWith('3 -')) {
      return 'P3';
    }
    if (p.includes('p4') || p.includes('4') || p.includes('low') || p.startsWith('4 -')) {
      return 'P4';
    }

    return null;
  };

  const validateState = (state: string): string | null => {
    if (!state) return null;

    const s = state.toLowerCase().trim();
    if (s.includes('opened') || s.includes('new')) {
      return 'Opened';
    }
    if (s.includes('assigned')) {
      return 'Assigned';
    }
    if (s.includes('work in progress') || s.includes('progress')) {
      return 'Work in Progress';
    }
    if (s.includes('closed complete') || s.includes('complete')) {
      return 'Closed Complete';
    }
    if (s.includes('closed incomplete') || s.includes('incomplete')) {
      return 'Closed Incomplete';
    }
    if (s.includes('closed skipped') || s.includes('skipped')) {
      return 'Closed Skipped';
    }
    if (s.includes('on hold') || s.includes('hold')) {
      return 'On Hold';
    }

    return null;
  };

  const validateRequest = (request: Request, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Validate Number
    if (!request.Number) {
      errors.push({
        row: rowIndex,
        column: 'Number',
        value: '',
        reason: 'Número da solicitação é obrigatório'
      });
    }

    // Validate Opened date
    if (!request.Opened) {
      errors.push({
        row: rowIndex,
        column: 'Opened',
        value: '',
        reason: 'Data de abertura é obrigatória'
      });
    } else {
      const formattedDate = formatDate(request.Opened);
      if (!formattedDate) {
        errors.push({
          row: rowIndex,
          column: 'Opened',
          value: request.Opened,
          reason: 'Data de abertura inválida'
        });
      } else {
        request.Opened = formattedDate;
      }
    }

    // Validate Updated date if present
    if (request.Updated) {
      const formattedDate = formatDate(request.Updated);
      if (!formattedDate) {
        errors.push({
          row: rowIndex,
          column: 'Updated',
          value: request.Updated,
          reason: 'Data de atualização inválida'
        });
      } else {
        request.Updated = formattedDate;
      }
    }

    // Validate Request Item
    if (!request.RequestItem) {
      errors.push({
        row: rowIndex,
        column: 'RequestItem',
        value: '',
        reason: 'Tipo de solicitação é obrigatório'
      });
    }

    // Validate Requested For Name
    if (!request.RequestedForName) {
      errors.push({
        row: rowIndex,
        column: 'RequestedForName',
        value: '',
        reason: 'Nome do solicitante é obrigatório'
      });
    }

    // Validate Priority format
    if (request.Priority) {
      const validPriority = validatePriority(request.Priority);
      if (!validPriority) {
        errors.push({
          row: rowIndex,
          column: 'Priority',
          value: request.Priority,
          reason: 'Prioridade inválida (use P1, P2, P3 ou P4)'
        });
      } else {
        request.Priority = validPriority;
      }
    }

    // Validate State format
    if (request.State) {
      const validState = validateState(request.State);
      if (!validState) {
        errors.push({
          row: rowIndex,
          column: 'State',
          value: request.State,
          reason: 'Estado inválido (Opened, Assigned, Work in Progress, Closed Complete, Closed Incomplete, Closed Skipped, On Hold)'
        });
      } else {
        request.State = validState;
      }
    }

    return errors;
  };

  const processExcelData = async (data: any[]): Promise<Request[]> => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('Erro: Arquivo vazio ou formato inválido', { data });
      throw new Error('Arquivo vazio ou formato inválido');
    }

    const processedRequests: Request[] = [];
    const errors: ValidationError[] = [];
    const totalRows = data.length;
    let validRows = 0;
    
    console.log('Iniciando processamento de', totalRows, 'linhas');
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      setProgress(Math.round((i / totalRows) * 100));

      if (!row || typeof row !== 'object' || Object.keys(row).length === 0) {
        console.warn('Linha inválida encontrada:', { rowIndex: i + 2, row });
        errors.push({
          row: i + 2,
          column: 'all',
          value: '',
          reason: 'Linha vazia ou inválida'
        });
        continue;
      }

      try {
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
          BusinessImpact: ''
        };

        console.debug('Processando linha', i + 2, ':', { 
          number: request.Number,
          opened: request.Opened,
          requestItem: request.RequestItem
        });

        const rowErrors = validateRequest(request, i + 2);
        
        if (rowErrors.length === 0) {
          processedRequests.push(request);
          validRows++;
        } else {
          console.warn('Erros de validação na linha', i + 2, ':', rowErrors);
          errors.push(...rowErrors);
        }

        if (i % 100 === 0) {
          console.log('Progresso:', Math.round((i / totalRows) * 100), '%');
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } catch (error) {
        console.error('Erro ao processar linha', i + 2, ':', error);
        errors.push({
          row: i + 2,
          column: 'all',
          value: '',
          reason: `Erro ao processar linha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        });
      }
    }

    console.log('Processamento concluído:', {
      totalRows,
      validRows,
      errorCount: errors.length
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      console.warn('Erros de validação encontrados:', errors);
    }

    if (validRows === 0) {
      console.error('Nenhuma solicitação válida encontrada');
      throw new Error('Nenhuma solicitação válida encontrada no arquivo. Verifique se as colunas estão corretas.');
    }

    return processedRequests;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    resetErrors();
    setIsProcessing(true);

    if (!file) {
      setError('Nenhum arquivo selecionado');
      setIsProcessing(false);
      return;
    }

    try {
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

            // Validate required columns
            const foundColumns = headers.map(h => String(h).toLowerCase());
            const requiredColumns = ['number', 'opened', 'requestitem', 'requestedforname'];
            const missingColumns = requiredColumns.filter(col => 
              !columnMappings[col as keyof typeof columnMappings].some(mapping => 
                foundColumns.includes(mapping.toLowerCase())
              )
            );

            if (missingColumns.length > 0) {
              throw new Error(`Colunas obrigatórias não encontradas: ${missingColumns.join(', ')}`);
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

      const processedData = await processExcelData(data);
      onDataLoaded(processedData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao processar o arquivo Excel');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [onDataLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <FileSpreadsheet className="h-12 w-12 text-emerald-500" />
          <h1 className="text-3xl font-bold text-white">Carregar Solicitações</h1>
        </div>
        <div className="bg-[#151B2B] p-6 rounded-lg">
          <p className="text-gray-300 leading-relaxed">
            Importe seus dados de solicitações para análise detalhada e monitoramento.
          </p>
        </div>
      </div>

      <div className="bg-[#151B2B] p-8 rounded-lg space-y-6">
        <div className="text-center space-y-4">
          <FileSpreadsheet className="h-16 w-16 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-semibold text-white">Importar Dados</h2>
          <p className="text-gray-400">
            Arraste e solte seu arquivo Excel ou clique para selecionar
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`
            p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all
            ${isDragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 hover:border-emerald-500/50 hover:bg-[#1C2333]'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} disabled={isProcessing} />
          {isDragActive ? (
            <p className="text-emerald-400">Solte o arquivo Excel aqui...</p>
          ) : (
            <div>
              <p className="text-gray-300">
                {isProcessing ? `Processando... ${progress}%` : 'Clique ou arraste seu arquivo Excel'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Formatos suportados: .xlsx e .xls
              </p>
            </div>
          )}
        </div>

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

        {validationErrors.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-yellow-400">
                  Avisos de validação
                </h3>
                <div className="mt-2 max-h-40 overflow-auto">
                  <ul className="list-disc list-inside text-sm text-yellow-300 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>
                        Linha {error.row}: {error.reason} 
                        {error.value && ` (valor: ${error.value})`}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-400">
                Colunas esperadas
              </h3>
              <div className="mt-2 text-sm text-blue-300">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Number</strong>: Número do chamado</li>
                  <li><strong>Opened</strong>: Data em que o chamado foi registrado</li>
                  <li><strong>Short description</strong>: Descrição resumida do conteúdo</li>
                  <li><strong>Description</strong>: Descrição completa do conteúdo</li>
                  <li><strong>Request item [Catalog Task]</strong>: Tipo de solicitação</li>
                  <li><strong>Requested for Name</strong>: Nome do usuário solicitante</li>
                  <li><strong>Priority</strong>: Prioridade (P1, P2, P3, P4)</li>
                  <li><strong>State</strong>: Situação do chamado (Opened, Assigned, Work in Progress, etc.)</li>
                  <li><strong>Assignment group</strong>: Localidade/grupo responsável</li>
                  <li><strong>Assigned to</strong>: Responsável pelo tratamento</li>
                  <li><strong>Updated</strong>: Data da última atualização</li>
                  <li><strong>Updated by</strong>: Analista que fez a atualização</li>
                  <li><strong>Comments and Work notes</strong>: Descrição detalhada do tratamento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}