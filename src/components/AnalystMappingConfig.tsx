import React, { useMemo, useRef, useState } from 'react';
import { Save, X, Plus, Trash2, Upload, Download, RotateCcw, MoreVertical } from 'lucide-react';
import type { AnalystMapping, AnalystMappingEntry } from '../types/analystMapping';
import { loadAnalystMapping, saveAnalystMapping, clearAnalystMapping } from '../utils/analystMappingStore';
import * as XLSX from 'xlsx';

interface AnalystMappingConfigProps {
  onClose: () => void;
}

export function AnalystMappingConfig({ onClose }: AnalystMappingConfigProps) {
  const [rows, setRows] = useState<AnalystMapping>(() => loadAnalystMapping());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<AnalystMappingEntry>({ group: '', level: '', analyst: '' });
  const [confirmClear, setConfirmClear] = useState(false);
  const [sortKey, setSortKey] = useState<keyof AnalystMappingEntry | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const analystCount = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => {
      const a = (r.analyst || '').trim().toLowerCase();
      if (a) set.add(a);
    });
    return set.size;
  }, [rows]);

  const sortedEntries = useMemo(() => {
    const indexed = rows.map((r, idx) => ({ row: r, idx }));
    if (!sortKey) return indexed;
    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
    return indexed.slice().sort((a, b) => {
      const av = String(a.row[sortKey] || '');
      const bv = String(b.row[sortKey] || '');
      const cmp = collator.compare(av, bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: keyof AnalystMappingEntry) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const addRow = () => {
    setRows(prev => {
      const newRows = [...prev, { group: '', level: '', analyst: '' }];
      const newIndex = newRows.length - 1;
      setHighlightIndex(newIndex);
      // Abrir editor imediatamente para a nova linha
      setEditIndex(newIndex);
      setEditDraft({ group: '', level: '', analyst: '' });
      // Scroll para o final após inserir
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 0);
      // Remover destaque após alguns segundos
      setTimeout(() => setHighlightIndex(current => (current === newIndex ? null : current)), 3000);
      return newRows;
    });
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof AnalystMappingEntry, value: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    setError(null);
  };

  const handleSave = () => {
    // Validação simples: nenhum campo vazio
    const invalid = rows.some(r => !r.group.trim() || !r.level.trim() || !r.analyst.trim());
    if (invalid) {
      setError('Preencha todos os campos (Grupo, Nível e Analista).');
      return;
    }
    saveAnalystMapping(rows);
    onClose();
  };

  const handleExport = () => {
    // Converte as linhas para planilha Excel (colunas fixas: Group, Nível de Atendimento, Analista)
    const worksheetData = rows.length > 0
      ? rows.map(r => ({
          'Group': r.group,
          'Nível de Atendimento': r.level,
          'Analista': r.analyst,
        }))
      : [{ 'Group': '', 'Nível de Atendimento': '', 'Analista': '' }];

    const ws = XLSX.utils.json_to_sheet(worksheetData, { header: ['Group', 'Nível de Atendimento', 'Analista'] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mapping');
    XLSX.writeFile(wb, 'analyst-mapping.xlsx');
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        // 1) Tentativa com cabeçalhos
        const rowsJson: Array<Record<string, any>> = XLSX.utils.sheet_to_json(ws, { defval: '' });
        // Normalizador de chaves para cobrir variações (acentos, espaçamento, maiúsculas)
        const normalizeKey = (k: string) => String(k || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();

        const getByAliases = (row: Record<string, any>, aliases: string[]) => {
          // Mapa de chaves normalizadas -> valor
          const map: Record<string, any> = {};
          for (const [key, val] of Object.entries(row)) {
            map[normalizeKey(key)] = val;
          }
          for (const a of aliases) {
            const v = map[normalizeKey(a)];
            if (v !== undefined && v !== null && String(v).trim() !== '') return v;
          }
          return '';
        };

        let sanitized: AnalystMapping = rowsJson.map((row) => {
          const group = String(getByAliases(row, [
            'Group', 'Grupo', 'Assignment Group', 'AssignmentGroup', 'Grupo de Atribuição', 'Grupo de Atribuicao'
          ])).trim();
          let level = String(getByAliases(row, [
            'Nível de Atendimento', 'Nivel de Atendimento', 'Nível', 'Nivel',
            'Função Associada', 'Funcao Associada', 'FuncaoAssociada', 'Funcao', 'Função',
            'Nível de Suporte', 'Nivel de Suporte', 'Support Level', 'SupportLevel', 'Level', 'level'
          ])).trim();
          const analyst = String(getByAliases(row, [
            'Analista', 'AssignedTo', 'Atribuído para', 'Atribuido'
          ])).trim();

          // Se o nível vier como número (ex.: 1, 2, 3) transformar em N1, N2, N3
          if (level && /^\d+$/.test(level)) level = `N${level}`;
          // Espaços extras / formatações comuns
          if (/^n\s*\d$/i.test(level)) level = level.replace(/\s+/g, '');

          return { group, level, analyst } as AnalystMappingEntry;
        }).filter(r => r.group || r.level || r.analyst);

        // 2) Sem cabeçalho: detecção automática por coluna (ex.: Grupo na coluna 2)
        if (sanitized.length === 0) {
          const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
          // Remover linhas totalmente vazias
          const rowsArr = matrix.filter(r => Array.isArray(r) && r.some(v => String(v).trim() !== ''));
          if (rowsArr.length === 0) {
            setError('Planilha vazia.');
            return;
          }
          // Se a primeira linha parecer cabeçalho, remova-a
          const first = rowsArr[0].map((v: any) => String(v).toLowerCase());
          const looksLikeHeader = first.some((c: string) => ['group','grupo','analista','assignedto','nível','nivel','nivel de atendimento','nível de atendimento'].includes(c));
          const dataRows = looksLikeHeader ? rowsArr.slice(1) : rowsArr;

          // Analisar até 10 linhas para detectar colunas
          const sample = dataRows.slice(0, 10);
          const colCount = Math.max(...sample.map(r => r.length));
          const scores = Array.from({ length: colCount }, () => ({ group: 0, level: 0, analyst: 0 }));
          const isLevel = (val: string) => /^(n\s*\d|n[1-9]|nível|nivel|support\s*level|level)/i.test(val.trim());
          const isLikelyGroup = (val: string) => /(-|local|sup|net|tel|support|grupo|group)/i.test(val.trim());
          const isLikelyAnalyst = (val: string) => /\s/.test(val.trim()) && !isLevel(val) && !isLikelyGroup(val);
          sample.forEach(row => {
            for (let i = 0; i < colCount; i++) {
              const v = String(row[i] ?? '').trim();
              if (!v) continue;
              if (isLevel(v)) scores[i].level++;
              if (isLikelyGroup(v)) scores[i].group++;
              if (isLikelyAnalyst(v)) scores[i].analyst++;
            }
          });
          const groupIdx = scores.map(s => s.group).reduce((best, cur, i, arr) => (cur > arr[best] ? i : best), 0);
          const levelIdx = scores.map(s => s.level).reduce((best, cur, i, arr) => (cur > arr[best] ? i : best), 0);
          const analystIdx = scores.map(s => s.analyst).reduce((best, cur, i, arr) => (cur > arr[best] ? i : best), 0);

          sanitized = dataRows.map(r => ({
            group: String(r[groupIdx] ?? '').trim(),
            level: String(r[levelIdx] ?? '').trim(),
            analyst: String(r[analystIdx] ?? '').trim(),
          })).filter(r => r.group || r.level || r.analyst);
        }

        if (sanitized.length === 0) {
          setError('Não foi possível identificar as colunas. Informe um Excel com colunas: Group, Nível de Atendimento, Analista.');
          return;
        }

        setRows(sanitized);
        setError(null);
      } catch (e) {
        setError('Falha ao importar Excel. Verifique o arquivo (.xls/.xlsx).');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const openImportDialog = () => {
    if (fileInputRef.current) {
      // Permitir reimportar o mesmo arquivo limpando o valor antes de abrir
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleReset = () => {
    setConfirmClear(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80]">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-4xl">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Configurar Mapeamento: Grupo × Nível × Analista</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">{error}</div>
          )}

          <div className="flex items-center gap-2">
            <button onClick={addRow} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm">
              <Plus className="h-4 w-4" /> Adicionar Linha
            </button>
            <button onClick={openImportDialog} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">
              <Upload className="h-4 w-4" /> Importar Excel
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
              }}
            />
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm">
              <Download className="h-4 w-4" /> Exportar Excel
            </button>
            <button onClick={handleReset} className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm">
              <RotateCcw className="h-4 w-4" /> Limpar Mapeamento
            </button>
            <span className="ml-2 text-sm text-gray-300">Analistas registrados: <span className="text-white font-medium">{analystCount}</span></span>
          </div>

          <div ref={containerRef} className="overflow-auto max-h-[60vh] border border-gray-700 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-[#1C2333] text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left w-1/3">
                    <button onClick={() => toggleSort('group')} className="flex items-center gap-2 hover:text-white text-gray-300">
                      <span>Group</span>
                      {sortKey === 'group' && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left w-1/3">
                    <button onClick={() => toggleSort('level')} className="flex items-center gap-2 hover:text-white text-gray-300">
                      <span>Nível de Atendimento</span>
                      {sortKey === 'level' && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left w-1/3">
                    <button onClick={() => toggleSort('analyst')} className="flex items-center gap-2 hover:text-white text-gray-300">
                      <span>Analista</span>
                      {sortKey === 'analyst' && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  </th>
                  <th className="px-3 py-2 w-14"></th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map(({ row, idx }) => (
                  <tr key={idx} className={`border-t border-gray-700 ${highlightIndex === idx ? 'bg-emerald-500/10' : ''}`}>
                    <td className="px-3 py-2 align-top">
                      <div className="px-3 py-2 bg-[#0F172A] border border-gray-700 rounded text-white min-h-[40px] flex items-center">
                        {row.group || <span className="text-gray-500">Ex.: SA-Local Sup</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="px-3 py-2 bg-[#0F172A] border border-gray-700 rounded text-white min-h-[40px] flex items-center">
                        {row.level || <span className="text-gray-500">Ex.: N1 / N2 / N3</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="px-3 py-2 bg-[#0F172A] border border-gray-700 rounded text-white min-h-[40px] flex items-center">
                        {row.analyst || <span className="text-gray-500">Nome do Analista (AssignedTo)</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setConfirmIndex(idx)}
                        className="p-2 hover:bg-[#2A334A] rounded text-gray-300 hover:text-white"
                        title="Ações (Editar/Excluir)"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                      Nenhum mapeamento cadastrado. Clique em "Adicionar Linha" ou importe um Excel.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
            <Save className="h-4 w-4" /> Salvar
          </button>
        </div>
      </div>
      {/* Modal de confirmação com opções Editar ou Excluir */}
      {confirmIndex !== null && rows[confirmIndex] && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90]">
          <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Ação para a linha selecionada</h3>
              <button onClick={() => setConfirmIndex(null)} className="p-2 hover:bg-[#1C2333] rounded">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="p-4 text-gray-300 space-y-2">
              <div><span className="text-gray-400">Group:</span> {rows[confirmIndex].group || '—'}</div>
              <div><span className="text-gray-400">Nível:</span> {rows[confirmIndex].level || '—'}</div>
              <div><span className="text-gray-400">Analista:</span> {rows[confirmIndex].analyst || '—'}</div>
            </div>
            <div className="p-4 border-t border-gray-700 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setEditIndex(confirmIndex);
                  setEditDraft(rows[confirmIndex]);
                  setConfirmIndex(null);
                }}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
              >
                Editar
              </button>
              <button
                onClick={() => {
                  removeRow(confirmIndex);
                  setConfirmIndex(null);
                }}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Excluir
              </button>
              <button onClick={() => setConfirmIndex(null)} className="px-3 py-2 text-gray-300 hover:text-white">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição */}
      {editIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[95]">
          <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Editar Mapeamento</h3>
              <button onClick={() => setEditIndex(null)} className="p-2 hover:bg-[#1C2333] rounded">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Group</label>
                <input
                  value={editDraft.group}
                  onChange={e => setEditDraft(prev => ({ ...prev, group: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-gray-700 rounded text-white"
                  placeholder="Ex.: SA-Local Sup"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nível de Atendimento</label>
                <input
                  value={editDraft.level}
                  onChange={e => setEditDraft(prev => ({ ...prev, level: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-gray-700 rounded text-white"
                  placeholder="Ex.: N1 / N2 / N3"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Analista</label>
                <input
                  value={editDraft.analyst}
                  onChange={e => setEditDraft(prev => ({ ...prev, analyst: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-gray-700 rounded text-white"
                  placeholder="Nome do Analista (AssignedTo)"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 flex items-center justify-end gap-2">
              <button onClick={() => setEditIndex(null)} className="px-3 py-2 text-gray-300 hover:text-white">Cancelar</button>
              <button
                onClick={() => {
                  if (editIndex === null) return;
                  setRows(prev => prev.map((r, i) => i === editIndex ? { ...editDraft } : r));
                  setEditIndex(null);
                }}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de limpeza total */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Limpar Mapeamento</h3>
              <button onClick={() => setConfirmClear(false)} className="p-2 hover:bg-[#1C2333] rounded">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="p-4 text-gray-300 space-y-3">
              <p>Ao confirmar, a tabela será zerada no app e os indicadores voltarão a usar apenas os dados dos incidentes (sem mapeamento manual).</p>
              <p>Deseja realmente limpar o mapeamento?</p>
            </div>
            <div className="p-4 border-t border-gray-700 flex items-center justify-end gap-2">
              <button onClick={() => setConfirmClear(false)} className="px-3 py-2 text-gray-300 hover:text-white">Cancelar</button>
              <button
                onClick={() => { clearAnalystMapping(); setRows([]); setConfirmClear(false); }}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


