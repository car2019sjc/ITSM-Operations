import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

interface TemplateGeneratorProps {
  type: 'incidents' | 'requests';
  onGenerated?: () => void;
}

export function TemplateGenerator({ type, onGenerated }: TemplateGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Only generate if not already generating
    if (isGenerating) return;
    
    const generateTemplate = async () => {
      try {
        setIsGenerating(true);
        
        // Define headers based on type
        const headers = type === 'incidents' 
          ? [
              'Number',
              'Opened',
              'Short description',
              'Caller',
              'Priority',
              'State',
              'Category',
              'Subcategory',
              'Assignment group',
              'Assigned to',
              'Updated',
              'Updated by',
              'Business impact'
            ]
          : [
              'Number',
              'Opened',
              'Short description',
              'Request item [Catalog Task]',
              'Requested for Name',
              'Priority',
              'State',
              'Assignment group',
              'Assigned to',
              'Updated',
              'Updated by',
              'Comments and Work notes',
              'Business impact'
            ];
        
        // Create sample data
        const sampleData = type === 'incidents'
          ? [
              {
                'Number': 'INC0001234',
                'Opened': '2025-04-01T08:30:00',
                'Short description': 'Computador não liga',
                'Caller': 'João Silva',
                'Priority': 'P3',
                'State': 'Em Andamento',
                'Category': 'Hardware',
                'Subcategory': 'Desktop',
                'Assignment group': 'Brazil-Santo Andre-Local Support',
                'Assigned to': 'Maria Oliveira',
                'Updated': '2025-04-01T10:15:00',
                'Updated by': 'Maria Oliveira',
                'Business impact': 'Medium'
              },
              {
                'Number': 'INC0001235',
                'Opened': '2025-04-01T09:15:00',
                'Short description': 'Erro ao acessar sistema ERP',
                'Caller': 'Carlos Mendes',
                'Priority': 'P2',
                'State': 'Aberto',
                'Category': 'Software',
                'Subcategory': 'ERP',
                'Assignment group': 'Brazil-Bahia-Network/Telecom',
                'Assigned to': 'Pedro Santos',
                'Updated': '',
                'Updated by': '',
                'Business impact': 'High'
              }
            ]
          : [
              {
                'Number': 'REQ0001234',
                'Opened': '2025-04-01T08:30:00',
                'Short description': 'Solicitação de novo laptop',
                'Request item [Catalog Task]': 'Hardware Request',
                'Requested for Name': 'João Silva',
                'Priority': 'Medium',
                'State': 'Em Andamento',
                'Assignment group': 'Brazil-Santo Andre-Local Support',
                'Assigned to': 'Maria Oliveira',
                'Updated': '2025-04-01T10:15:00',
                'Updated by': 'Maria Oliveira',
                'Comments and Work notes': 'Usuário solicitou novo laptop para substituir equipamento antigo.',
                'Business impact': 'Medium'
              },
              {
                'Number': 'REQ0001235',
                'Opened': '2025-04-01T09:15:00',
                'Short description': 'Acesso ao sistema financeiro',
                'Request item [Catalog Task]': 'Access Request',
                'Requested for Name': 'Carlos Mendes',
                'Priority': 'High',
                'State': 'Aberto',
                'Assignment group': 'Brazil-Bahia-Network/Telecom',
                'Assigned to': 'Pedro Santos',
                'Updated': '',
                'Updated by': '',
                'Comments and Work notes': 'Usuário precisa de acesso ao sistema financeiro para novo cargo.',
                'Business impact': 'High'
              }
            ];
        
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        
        // First create a blank worksheet with just headers
        const headerRow = [];
        headers.forEach(header => headerRow.push(header));
        
        // Create the worksheet with headers
        const ws = XLSX.utils.aoa_to_sheet([headerRow]);
        
        // Add sample data rows
        XLSX.utils.sheet_add_json(ws, sampleData, { 
          skipHeader: true, 
          origin: 'A2' 
        });
        
        // Add column widths
        const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
        ws['!cols'] = colWidths;
        
        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(wb, ws, type === 'incidents' ? 'Incidents' : 'Requests');
        
        // Add a documentation sheet
        const docTitle = type === 'incidents' ? 'Incidentes' : 'Requests';
        const docWs = XLSX.utils.aoa_to_sheet([
          [`Documentação do Modelo de ${docTitle}`],
          [''],
          [`Este arquivo serve como modelo para importação de dados de ${type === 'incidents' ? 'incidentes' : 'solicitações'} no IT Operations Dashboard.`],
          [''],
          ['Instruções:'],
          ['1. Mantenha os cabeçalhos na primeira linha'],
          ['2. Preencha os dados a partir da segunda linha'],
          ['3. Salve o arquivo no formato .xlsx ou .xls'],
          ['4. Importe o arquivo no dashboard'],
          [''],
          ['Descrição dos campos:'],
          ...(type === 'incidents' 
            ? [
                ['Number', 'Número único do incidente (obrigatório)'],
                ['Opened', 'Data e hora de abertura do incidente (obrigatório, formato: YYYY-MM-DDTHH:MM:SS)'],
                ['Short description', 'Descrição resumida do incidente'],
                ['Caller', 'Nome do solicitante'],
                ['Priority', 'Prioridade do incidente (P1, P2, P3, P4)'],
                ['State', 'Estado do incidente (Aberto, Em Andamento, Fechado, etc.)'],
                ['Category', 'Categoria do incidente'],
                ['Subcategory', 'Subcategoria do incidente'],
                ['Assignment group', 'Grupo responsável pelo atendimento'],
                ['Assigned to', 'Pessoa responsável pelo atendimento'],
                ['Updated', 'Data e hora da última atualização (formato: YYYY-MM-DDTHH:MM:SS)'],
                ['Updated by', 'Pessoa que realizou a última atualização'],
                ['Business impact', 'Impacto no negócio']
              ]
            : [
                ['Number', 'Número único da solicitação (obrigatório)'],
                ['Opened', 'Data e hora de abertura da solicitação (obrigatório, formato: YYYY-MM-DDTHH:MM:SS)'],
                ['Short description', 'Descrição resumida da solicitação'],
                ['Request item [Catalog Task]', 'Tipo de solicitação ou item do catálogo'],
                ['Requested for Name', 'Nome do solicitante'],
                ['Priority', 'Prioridade da solicitação (High, Medium, Low)'],
                ['State', 'Estado da solicitação (Aberto, Em Andamento, Concluído, etc.)'],
                ['Assignment group', 'Grupo responsável pelo atendimento'],
                ['Assigned to', 'Pessoa responsável pelo atendimento'],
                ['Updated', 'Data e hora da última atualização (formato: YYYY-MM-DDTHH:MM:SS)'],
                ['Updated by', 'Pessoa que realizou a última atualização'],
                ['Comments and Work notes', 'Comentários e notas de trabalho'],
                ['Business impact', 'Impacto no negócio']
              ]
          )
        ]);
        
        // Add column widths for documentation
        docWs['!cols'] = [{ wch: 25 }, { wch: 70 }];
        
        // Add the documentation worksheet to the workbook
        XLSX.utils.book_append_sheet(wb, docWs, 'Documentação');
        
        // Generate buffer
        const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        
        // Create blob and download
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = type === 'incidents' ? 'modelo-incidentes.xlsx' : 'modelo-requests.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        // Small delay to ensure download starts before component unmounts
        setTimeout(() => {
          if (onGenerated) {
            onGenerated();
          }
        }, 500);
      } catch (error) {
        console.error('Error generating template:', error);
      } finally {
        setIsGenerating(false);
      }
    };
    
    generateTemplate();
  }, [type, onGenerated, isGenerating]);
  
  return null;
}