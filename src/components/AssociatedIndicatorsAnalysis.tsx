import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StringAnalysisModal } from './StringAnalysisModal';

// Função para parsear datas em diferentes formatos
const parseDateFlexible = (dateStr: string) => {
  if (!dateStr) return undefined;
  // Tenta ISO
  let d = parseISO(dateStr);
  if (!isNaN(d.getTime())) return d;
  // Tenta formato brasileiro dd/MM/yyyy HH:mm:ss
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [_, dia, mes, ano, hora, min, seg] = match;
    d = new Date(`${ano}-${mes}-${dia}T${hora}:${min}:${seg}`);
    if (!isNaN(d.getTime())) return d;
  }
  // Tenta formato brasileiro dd/MM/yyyy HH:mm
  const match2 = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})/);
  if (match2) {
    const [_, dia, mes, ano, hora, min] = match2;
    d = new Date(`${ano}-${mes}-${dia}T${hora}:${min}`);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
};

interface AssociatedIndicatorsAnalysisProps {
  data: any[];
  dateRange: { start: Date; end: Date };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const SHIFT_TIMES = {
  morning: { start: 6, end: 14 },
  afternoon: { start: 14, end: 22 },
  night: { start: 22, end: 6 }
};

// Função utilitária para normalizar nomes de campos
function getField(item: any, keys: string[]): string {
  for (const key of keys) {
    if (item[key] && typeof item[key] === 'string' && item[key].trim() !== '') {
      return item[key].trim();
    }
  }
  return 'Não Definido';
}

// Tooltip customizado para fundo escuro e percentual
const CustomDarkPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
    // Tenta pegar o nome do grupo/localidade
    const groupName = payload[0]?.payload?.group;
    return (
      <div style={{ background: '#23263a', color: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px #0008', border: '1px solid #333', minWidth: 120, fontSize: 13 }}>
        {groupName && (
          <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: 6 }}>{groupName}</div>
        )}
        {payload.map((entry: any, idx: number) => (
          <div key={idx} style={{ color: entry.color, fontWeight: 500, marginBottom: 2 }}>
            {entry.name}: {entry.value} ({((entry.value / total) * 100).toFixed(1)}%)
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Definir tipo para shiftData
interface ShiftDataItem {
  name: string;
  value: number;
  items?: any[];
}

// Label customizado para o gráfico de pizza de turnos
const CustomPieLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, value } = props;
  const RADIAN = Math.PI / 180;
  // Calcular posição central da fatia
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const percentValue = (percent * 100).toFixed(1);
  if (percent < 0.05) {
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={500}>
        {percentValue}%
      </text>
    );
  }
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      <tspan x={x} dy="-0.2em">{name}: {value}</tspan>
      <tspan x={x} dy="1.2em">{percentValue}%</tspan>
    </text>
  );
};

// Label customizado para barras de turnos
const BarValuePercentLabel = (props: any) => {
  const { x, y, width, value, index, data } = props;
  const total = data.reduce((sum: number, item: any) => sum + Number(item.value), 0);
  const percent = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0.0';
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      fill="#fff"
      textAnchor="middle"
      fontSize={13}
      fontWeight={600}
      style={{ pointerEvents: 'none' }}
    >
      {value} ({percent}%)
    </text>
  );
};

export function AssociatedIndicatorsAnalysis({ data, dateRange }: AssociatedIndicatorsAnalysisProps) {
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [selectedString, setSelectedString] = useState<string | null>(null);
  const [showStringAnalysis, setShowStringAnalysis] = useState(false);

  const processedData = useMemo(() => {
    const filteredData = data.filter(item => {
      const openedDate = parseDateFlexible(item.Opened);
      if (!openedDate) {
        console.warn(`Data inválida para o incidente: ${item.Number}, Opened: ${item.Opened}`);
        return false;
      }
      return isWithinInterval(openedDate, {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end)
      });
    });

    // Processamento por turno
    const shiftData = filteredData.reduce((acc, item) => {
      const openedDate = parseDateFlexible(item.Opened);
      if (!openedDate) return acc;
      
      const hour = openedDate.getHours();
      let shift = 'night';
      
      if (hour >= SHIFT_TIMES.morning.start && hour < SHIFT_TIMES.morning.end) {
        shift = 'morning';
      } else if (hour >= SHIFT_TIMES.afternoon.start && hour < SHIFT_TIMES.afternoon.end) {
        shift = 'afternoon';
      }

      if (!acc[shift]) {
        acc[shift] = {
          name: shift === 'morning' ? 'Manhã' : shift === 'afternoon' ? 'Tarde' : 'Noite',
          value: 0,
          items: []
        };
      }
      
      acc[shift].value++;
      acc[shift].items.push(item);
      
      return acc;
    }, {});

    // Processamento por função associada
    const functionData = filteredData.reduce((acc, item) => {
      const functionName = getField(item, [
        'Função Associada', 'FuncaoAssociada', 'Funcao', 'Função', 'Nível', 'Nivel', 'NivelFuncao', 'NívelFunção', 'Nivel de Suporte', 'Nível de Suporte', 'SupportLevel', 'Support Level', 'Level', 'level', 'n1', 'n2', 'n3', 'N1', 'N2', 'N3'
      ]);
      if (!acc[functionName]) {
        acc[functionName] = 0;
      }
      acc[functionName]++;
      return acc;
    }, {});

    // Processamento por grupo de atribuição
    const groupData = filteredData.reduce((acc, item) => {
      const group = getField(item, [
        'AssignmentGroup', 'Assignment Group', 'Grupo de Atribuição', 'Grupo', 'Group', 'GrupoAtribuicao', 'Grupo_Associado', 'Equipe', 'Team'
      ]);
      if (!acc[group]) {
        acc[group] = 0;
      }
      acc[group]++;
      return acc;
    }, {});

    // Processamento por string associado
    const stringData = filteredData.reduce((acc, item) => {
      const string = getField(item, [
        'StringAssociado', 'String Associado', 'String', 'Associado', 'String_Associado', 'Vinculo', 'Vínculo'
      ]);
      if (!acc[string]) {
        acc[string] = 0;
      }
      acc[string]++;
      return acc;
    }, {});

    return {
      shiftData: Object.values(shiftData) as ShiftDataItem[],
      functionData: Object.entries(functionData).map(([name, value]) => ({ name, value })),
      groupData: Object.entries(groupData).map(([name, value]) => ({ name, value })),
      stringData: Object.entries(stringData).map(([name, value]) => ({ name, value }))
    };
  }, [data, dateRange]);

  // Função para filtrar dados por função selecionada
  const filteredByFunction = selectedFunction
    ? data.filter(item => {
        const functionName = getField(item, [
          'Função Associada', 'FuncaoAssociada', 'Funcao', 'Função', 'Nível', 'Nivel', 'NivelFuncao', 'NívelFunção', 'Nivel de Suporte', 'Nível de Suporte', 'SupportLevel', 'Support Level', 'Level', 'level', 'n1', 'n2', 'n3', 'N1', 'N2', 'N3'
        ]);
        return functionName === selectedFunction;
      })
    : [];

  // Processar distribuição por turno para a função selecionada
  const shiftDataByFunction = useMemo(() => {
    if (!selectedFunction) return [];
    const filtered = filteredByFunction.filter(item => {
      const openedDate = parseDateFlexible(item.Opened);
      return isWithinInterval(openedDate, {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end)
      });
    });
    return filtered.reduce((acc, item) => {
      const hour = parseDateFlexible(item.Opened)?.getHours() || 0;
      let shift = 'night';
      if (hour >= SHIFT_TIMES.morning.start && hour < SHIFT_TIMES.morning.end) {
        shift = 'morning';
      } else if (hour >= SHIFT_TIMES.afternoon.start && hour < SHIFT_TIMES.afternoon.end) {
        shift = 'afternoon';
      }
      if (!acc[shift]) {
        acc[shift] = {
          name: shift === 'morning' ? 'Manhã' : shift === 'afternoon' ? 'Tarde' : 'Noite',
          value: 0
        };
      }
      acc[shift].value++;
      return acc;
    }, {});
  }, [filteredByFunction, dateRange, selectedFunction]);

  // Filtrar chamados pela string selecionada
  const incidentsByString = useMemo(() => {
    if (!selectedString) return [];
    return data.filter(item => {
      const string = getField(item, [
        'StringAssociado', 'String Associado', 'String', 'Associado', 'String_Associado', 'Vinculo', 'Vínculo'
      ]);
      return string === selectedString;
    });
  }, [data, selectedString]);

  // Função para capturar o clique na barra do gráfico de funções
  const handleBarClick = (data: any, index: number) => {
    if (data && data.activePayload && data.activePayload[0] && data.activePayload[0].payload) {
      setSelectedFunction(data.activePayload[0].payload.name);
    }
  };

  // Processar dados para gráfico de barras empilhadas Grupo x Função
  const groupFunctionMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    const groupSet = new Set<string>();
    const functionSet = new Set<string>();
    const filteredData = data.filter(item => {
      const openedDate = parseDateFlexible(item.Opened);
      if (!openedDate) return false;
      const group = getField(item, [
        'AssignmentGroup', 'Assignment Group', 'Grupo de Atribuição', 'Grupo', 'Group', 'GrupoAtribuicao', 'Grupo_Associado', 'Equipe', 'Team'
      ]);
      const func = getField(item, [
        'Função Associada', 'FuncaoAssociada', 'Funcao', 'Função', 'Nível', 'Nivel', 'NivelFuncao', 'NívelFunção', 'Nivel de Suporte', 'Nível de Suporte', 'SupportLevel', 'Support Level', 'Level', 'level', 'n1', 'n2', 'n3', 'N1', 'N2', 'N3'
      ]);
      groupSet.add(group);
      functionSet.add(func);
      if (!matrix[group]) matrix[group] = {};
      if (!matrix[group][func]) matrix[group][func] = 0;
      matrix[group][func]++;
      return true;
    });
    // Montar array para o gráfico
    const groupArray = Array.from(groupSet);
    const functionArray = Array.from(functionSet);
    const chartData = groupArray.map(group => {
      const entry: any = { group };
      functionArray.forEach(func => {
        entry[func] = matrix[group]?.[func] || 0;
      });
      return entry;
    });
    return { chartData, functionArray, groupArray, matrix };
  }, [data, dateRange]);

  // Top 5 para o gráfico de string
  const top5StringData = useMemo(() => {
    return [...processedData.stringData]
      .sort((a, b) => Number(b.value) - Number(a.value))
      .slice(0, 5);
  }, [processedData.stringData]);

  return (
    <div className="space-y-8 p-6 bg-[#151B2B] rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-6">Análise de Indicadores Associados</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/*
          ===================== DOCUMENTAÇÃO DO BLOCO =====================
          Bloco: Distribuição por Turno
          - Exibe um gráfico de barras com a quantidade de chamados por turno (Manhã, Tarde, Noite).
          - Cada barra representa um turno, com cor distinta (mantendo o padrão do app).
          - Acima de cada barra é exibido o valor absoluto e o percentual correspondente ao total de chamados.
          - O label customizado é implementado na função BarValuePercentLabel.
          - Para customizar cores, altere o array COLORS.
          - Para alterar o formato do label, edite BarValuePercentLabel.
          - Tooltip, legenda e observação são mantidos para facilitar a interpretação.
          - Para adicionar mais turnos, ajuste o processamento em processedData.shiftData.
          ================================================================
        */}
        <div className="bg-[#1E293B] p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Distribuição por Turno</h3>
          <div className="flex flex-col items-center justify-center h-[400px]">
            <ResponsiveContainer width={400} height={320}>
              <BarChart data={processedData.shiftData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: '#fff', fontSize: 14 }} />
                <YAxis tick={{ fill: '#fff', fontSize: 14 }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ background: '#23263a', color: '#fff', borderRadius: 8, fontSize: 13 }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} label={<BarValuePercentLabel data={processedData.shiftData} />}>
                  {processedData.shiftData.map((entry, idx) => (
                    <Cell key={`cell-bar-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-gray-400 text-sm mt-4">
            <strong>Observação:</strong> Este gráfico apresenta a distribuição dos chamados por turno de atendimento. Os percentuais e totais ajudam a identificar em quais períodos há maior demanda, auxiliando no planejamento de equipes e recursos.
          </div>
          {/* Legenda customizada */}
          <div className="flex gap-6 mt-6 justify-center">
            {processedData.shiftData.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span style={{ width: 16, height: 16, background: COLORS[idx % COLORS.length], display: 'inline-block', borderRadius: 4 }}></span>
                <span className="text-sm text-white">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de Funções */}
        <div className="bg-[#1E293B] p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Distribuição por Função</h3>
          <div className="mb-2 text-sm text-blue-300 font-medium">Clique na barra para Análise por IA</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData.functionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: '#fff', fontSize: 12 }} angle={-35} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip content={<CustomDarkPieTooltip />} />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" cursor="pointer" onClick={(_, index) => {
                  const item = processedData.functionData[index];
                  if (item && item.name) {
                    setSelectedFunction(item.name);
                  }
                }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Lista detalhada de funções */}
          <div className="mt-4">
            <h4 className="text-white font-semibold mb-2 text-sm">Lista de Funções e Quantidade de Chamados</h4>
            <ul className="text-gray-300 text-sm space-y-1 max-h-40 overflow-y-auto pr-2">
              {processedData.functionData
                .sort((a, b) => Number(b.value) - Number(a.value))
                .map((item, idx) => (
                  <li key={item.name + idx} className="flex justify-between border-b border-gray-700 pb-1">
                    <span>{String(item.name)}</span>
                    <span className="font-bold text-indigo-400">{String(item.value)}</span>
                  </li>
                ))}
            </ul>
          </div>
          {/* Modal de distribuição por turno para a função selecionada */}
          {selectedFunction && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-[#151B2B] rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Distribuição por Turno - {selectedFunction}</h2>
                  <button
                    onClick={() => setSelectedFunction(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.values(shiftDataByFunction)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {Object.values(shiftDataByFunction).map((entry, index) => (
                          <Cell key={`cell-modal-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2 text-sm">Chamados por Turno</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    {Object.values(shiftDataByFunction)
                      .sort((a: any, b: any) => Number(b.value) - Number(a.value))
                      .map((item: any, idx: number) => (
                        <li key={item.name + idx} className="flex justify-between border-b border-gray-700 pb-1">
                          <span>{item.name}</span>
                          <span className="font-bold text-indigo-400">{item.value}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gráfico de Grupos */}
        <div className="bg-[#1E293B] p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Distribuição por Grupo/Localidade (por Função)</h3>
          <p className="text-xs text-green-300 mb-2">Cada barra representa um grupo e as cores mostram a quantidade de chamados por função (N1, N2, N3, etc.).</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupFunctionMatrix.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="group" hide={true} />
                <YAxis />
                <Tooltip content={<CustomDarkPieTooltip />} />
                <Legend />
                {groupFunctionMatrix.functionArray.map((func, idx) => (
                  <Bar key={func} dataKey={func} stackId="a" fill={COLORS[idx % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Lista detalhada de grupos por função */}
          <div className="mt-4">
            <h4 className="text-white font-semibold mb-2 text-sm">Lista de Grupos e Quantidade de Chamados por Função</h4>
            <ul className="text-gray-300 text-sm space-y-2 max-h-40 overflow-y-auto pr-2">
              {groupFunctionMatrix.groupArray.map((group, idx) => (
                <li key={group + idx} className="border-b border-gray-700 pb-1">
                  <span className="font-bold text-green-400">{group}</span>
                  <ul className="ml-4">
                    {groupFunctionMatrix.functionArray.map((func, fidx) => (
                      <li key={func + fidx} className="flex justify-between">
                        <span>{func}</span>
                        <span className="font-bold text-white">{String(groupFunctionMatrix.matrix[group]?.[func] || 0)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Gráfico de Strings */}
        {/*
          ===================== DOCUMENTAÇÃO DO BLOCO =====================
          Bloco: Distribuição por String
          - Exibe um gráfico de barras com as 5 strings mais recorrentes nos chamados.
          - Mensagem orienta o usuário a clicar na barra para acionar a análise por IA.
          - Ao clicar em uma barra OU em um item da lista, o modal de análise por IA é aberto diretamente (StringAnalysisModal).
          - O modal recebe todos os incidentes e a string selecionada para análise detalhada.
          - Não há mais botão extra para análise: a interação é feita apenas pelo clique na barra ou item.
          - Para alterar o comportamento de abertura do modal, ajuste o onClick do Bar e da lista.
          - Para mudar a mensagem de orientação, altere o conteúdo do div azul acima do gráfico.
          - Para mudar o número de strings exibidas, altere o slice(0, 5) em top5StringData.
          - O modal pode ser customizado em src/components/StringAnalysisModal.tsx.
          ================================================================
        */}
        <div className="bg-[#1E293B] rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Distribuição por String</h3>
          </div>
          <div className="mb-2 text-sm text-blue-300 font-medium">Clique na barra para Análise por IA</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5StringData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={60} tick={{ fill: '#fff', fontSize: 12 }} />
                <YAxis />
                <Tooltip content={<CustomDarkPieTooltip />} />
                <Legend formatter={() => null} />
                <Bar dataKey="value" fill="#ef4444" cursor="pointer" onClick={(_, index) => {
                  const item = top5StringData[index];
                  if (item && item.name) {
                    setSelectedString(item.name);
                    setShowStringAnalysis(true);
                  }
                }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Lista detalhada de strings */}
          <div className="mt-4">
            <h4 className="text-white font-semibold mb-2 text-sm">Lista de Strings e Quantidade de Chamados</h4>
            <ul className="text-gray-300 text-sm space-y-1 max-h-40 overflow-y-auto pr-2">
              {processedData.stringData
                .sort((a, b) => Number(b.value) - Number(a.value))
                .map((item, idx) => (
                  <li 
                    key={item.name + idx} 
                    className="flex justify-between border-b border-gray-700 pb-1 cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
                    onClick={() => {
                      setSelectedString(item.name);
                      setShowStringAnalysis(true);
                    }}
                  >
                    <span>{item.name}</span>
                    <span className="font-bold text-white">{String(item.value)}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de Análise de String */}
      {showStringAnalysis && selectedString && (
        <StringAnalysisModal
          incidents={data}
          selectedString={selectedString}
          onClose={() => setShowStringAnalysis(false)}
        />
      )}
    </div>
  );
} 