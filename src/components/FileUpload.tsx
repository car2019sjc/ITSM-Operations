import React, { useState, useCallback } from 'react';
import { Search, Calendar, Filter, ChevronLeft, ChevronRight, X, AlertCircle, Info, BarChart3, FileSpreadsheet, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Incident } from '../types/incident';
import { Request } from '../types/request';
import Fuse from 'fuse.js';
import { TemplateGenerator } from './TemplateGenerator';

interface FileUploadProps {
  onDataLoaded: (data: Incident[] | Request[]) => void;
}

interface ValidationError {
  row: number;
  column: string;
  value: string;
  reason: string;
}

export function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTemplateGenerator, setShowTemplateGenerator] = useState(false);

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

  const validateItem = (item: Incident | Request, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Validate Number
    if (!item.Number) {
      errors.push({
        row: rowIndex,
        column: 'Number',
        value: '',
        reason: 'Número do chamado é obrigatório'
      });
    }

    // Validate Opened date
    if (!item.Opened) {
      errors.push({
        row: rowIndex,
        column: 'Opened',
        value: '',
        reason: 'Data de abertura é obrigatória'
      });
    } else {
      try {
        const date = new Date(item.Opened);
        if (isNaN(date.getTime())) {
          errors.push({
            row: rowIndex,
            column: 'Opened',
            value: item.Opened,
            reason: 'Data de abertura inválida'
          });
        }
      } catch (e) {
        errors.push({
          row: rowIndex,
          column: 'Opened',
          value: item.Opened,
          reason: 'Data de abertura inválida'
        });
      }
    }

    // Validate Priority format
    if (item.Priority) {
      const validPriority = validatePriority(item.Priority);
      if (!validPriority) {
        errors.push({
          row: rowIndex,
          column: 'Priority',
          value: item.Priority,
          reason: 'Prioridade inválida (use P1, P2, P3 ou P4)'
        });
      } else {
        item.Priority = validPriority;
      }
    }

    // Validate State format
    if (item.State) {
      const normalizedState = item.State.toLowerCase().trim();
      if (['closed', 'resolved', 'cancelled', 'fechado', 'resolvido', 'cancelado'].includes(normalizedState)) {
        item.State = normalizedState.charAt(0).toUpperCase() + normalizedState.slice(1);
      }
    }

    return errors;
  };

  const processExcelData = async (data: any[]): Promise<Incident[] | Request[]> => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('Arquivo vazio ou formato inválido');
    }

    const processedItems: (Incident | Request)[] = [];
    const errors: ValidationError[] = [];
    const totalRows = data.length;
    let validRows = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      setProgress(Math.round((i / totalRows) * 100));

      if (!row || typeof row !== 'object' || Object.keys(row).length === 0) {
        errors.push({
          row: i + 2,
          column: 'all',
          value: '',
          reason: 'Linha vazia ou inválida'
        });
        continue;
      }

      const item = {
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
        CommentsAndWorkNotes: findColumnValue(row, columnMappings.commentsAndWorkNotes)
      };

      const rowErrors = validateItem(item, i + 2);
      
      if (rowErrors.length === 0) {
        processedItems.push(item);
        validRows++;
      } else {
        errors.push(...rowErrors);
      }

      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
    }

    if (validRows === 0) {
      throw new Error('Nenhum chamado válido encontrado no arquivo. Verifique se as colunas estão corretas.');
    }

    return processedItems;
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
            const requiredColumns = ['number', 'opened'];
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

  const handleDownloadTemplate = () => {
    setShowTemplateGenerator(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-6">
        <div className="flex flex-col items-center justify-center">
          <img 
            src="/onset-logo.svg" 
            alt="OnSet Logo" 
            className="h-40 w-auto mb-2" 
          />
          <h1 className="text-3xl font-bold text-white mb-1">IT Operations Dashboard</h1>
          <p className="text-gray-400">
            Conectando Inteligência e Tecnologia
          </p>
        </div>
        <div className="bg-[#151B2B] p-6 rounded-lg">
          <p className="text-gray-300 leading-relaxed">
            Plataforma para análise e monitoramento operacional de TI, baseado em dados estruturados.
          </p>
        </div>
      </div>

      <div className="bg-[#151B2B] p-8 rounded-lg space-y-6">
        <div className="text-center space-y-4">
          <FileSpreadsheet className="h-16 w-16 text-indigo-500 mx-auto" />
          <h2 className="text-xl font-semibold text-white">
            Importar Chamados
          </h2>
          <p className="text-gray-400">
            Arraste e solte seu arquivo Excel ou clique para selecionar
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`
            p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all
            ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 hover:border-indigo-500/50 hover:bg-[#1C2333]'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} disabled={isProcessing} />
          {isDragActive ? (
            <p className="text-indigo-400">Solte o arquivo Excel aqui...</p>
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

        <div className="flex justify-center">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
          >
            <Download className="h-5 w-5 text-gray-600" />
            <span>Baixar Modelo de Planilha</span>
          </button>
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
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-blue-400" />
          <p className="text-blue-400">
            Os arquivos devem estar no formato Excel (.xlsx ou .xls)
          </p>
        </div>
      </div>

      {/* Template Generator */}
      {showTemplateGenerator && (
        <TemplateGenerator 
          type="incidents" 
          onGenerated={() => setShowTemplateGenerator(false)} 
        />
      )}
    </div>
  );
}