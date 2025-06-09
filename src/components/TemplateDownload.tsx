import React from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface TemplateDownloadProps {
  type: 'incidents' | 'requests';
}

export function TemplateDownload({ type }: TemplateDownloadProps) {
  const downloadTemplate = () => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Define headers based on type
    let headers: string[] = [];
    
    if (type === 'incidents') {
      headers = [
        'Number',
        'Opened',
        'ShortDescription',
        'Caller',
        'Priority',
        'State',
        'Category',
        'Subcategory',
        'AssignmentGroup',
        'AssignedTo',
        'Updated',
        'UpdatedBy',
        'BusinessImpact'
      ];
    } else {
      headers = [
        'Number',
        'Opened',
        'ShortDescription',
        'RequestItem',
        'RequestedForName',
        'Priority',
        'State',
        'AssignmentGroup',
        'AssignedTo',
        'Updated',
        'UpdatedBy',
        'CommentsAndWorkNotes',
        'BusinessImpact'
      ];
    }
    
    // Create worksheet with headers only
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Generate filename
    const fileName = type === 'incidents' 
      ? 'incident-template.xlsx' 
      : 'request-template.xlsx';
    
    // Write the workbook and trigger download
    XLSX.writeFile(wb, fileName);
  };

  return (
    <button
      onClick={downloadTemplate}
      className={`
        flex items-center justify-center gap-2 w-full py-3 rounded-lg transition-colors
        ${type === 'incidents' 
          ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' 
          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}
      `}
    >
      <FileDown className="h-5 w-5" />
      <span>Baixar Template</span>
    </button>
  );
}