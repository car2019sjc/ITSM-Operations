import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  X, 
  BarChart2,
  ChevronDown,
  ChevronRight,
  Calendar,
  ChevronLeft,
  ArrowLeft
} from 'lucide-react';
import { Incident } from '../types/incident';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval,
  eachDayOfInterval,
  isWithinInterval,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  startOfDay,
  endOfDay,
  addDays,
  subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizePriority } from '../utils/incidentUtils';

interface CategoryHistoryAnalysisProps {
  incidents: Incident[];
  onClose?: () => void;
}

const CHART_COLORS = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#10B981',
  'Não definido': '#6B7280'
};

const PRIORITIES = ['P1', 'P2', 'P3', 'P4', 'Não definido'];

const CATEGORIES = [
  'Hardware',
  'Software',
  'Network',
  'Database',
  'Security',
  'Cloud',
  'Service Support',
  'Server',
  'Backup/Restore',
  'Monitoring'
];

interface SubcategoryAnalysisProps {
  category: string;
  incidents: Incident[];
  startDate: string;
  endDate: string;
  onBack: () => void;
}

function SubcategoryAnalysis({ category, incidents, startDate, endDate, onBack }: SubcategoryAnalysisProps) {
  const subcategoryData = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const months = eachMonthOfInterval({ start, end });

    // Get all subcategories for this category
    const subcategories = Array.from(new Set(
      incidents
        .filter(i => i.Category === category)
        .map(i => i.Subcategory || 'Não especificado')
    )).sort();

    // Process data for each subcategory
    return subcategories.map(subcategory => {
      const monthlyStats = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthIncidents = incidents.filter(incident => {
          try {
            const incidentDate = parseISO(incident.Opened);
            return incident.Category === category &&
                   (incident.Subcategory || 'Não especificado') === subcategory &&
                   isWithinInterval(incidentDate, { start: monthStart, end: monthEnd });
          } catch (error) {
            return false;
          }
        });

        const data: Record<string, any> = {
          month: month.getTime(),
          monthLabel: format(month, 'MMM/yy', { locale: ptBR }),
          total: monthIncidents.length
        };

        PRIORITIES.forEach(priority => {
          data[priority] = monthIncidents.filter(i => 
            normalizePriority(i.Priority) === priority
          ).length;
        });

        return data;
      });

      const totalIncidents = monthlyStats.reduce((sum, month) => sum + month.total, 0);
      const priorityStats = PRIORITIES.reduce((acc, priority) => ({
        ...acc,
        [priority]: monthlyStats.reduce((sum, month) => sum + month[priority], 0)
      }), {});

      return {
        name: subcategory,
        data: monthlyStats,
        total: totalIncidents,
        ...priorityStats
      };
    });
  }, [incidents, category, startDate, endDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-[#1F2937] p-4 rounded-lg border border-gray-700 shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="text-white">{entry.value}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total</span>
              <span className="text-white font-bold">
                {payload.reduce((sum: number, entry: any) => sum + entry.value, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para Categorias</span>
          </button>
          <h2 className="text-xl font-semibold text-white">
            Subcategorias de {category}
          </h2>
          <p className="text-gray-400 mt-1">
            {subcategoryData.length} subcategorias encontradas
          </p>
        </div>
      </div>

      {subcategoryData.map(({ name, data, total }) => (
        <div 
          key={name}
          className="bg-[#1C2333] p-4 rounded-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-white">
                {name}
              </h3>
              <p className="text-sm text-gray-400">
                {total} chamados no período selecionado
              </p>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data}
                margin={{ 
                  top: 20, 
                  right: 30, 
                  left: 20, 
                  bottom: 40
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis 
                  dataKey="monthLabel"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  axisLine={{ stroke: '#374151' }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  axisLine={{ stroke: '#374151' }}
                />
                <Tooltip content={<CustomTooltip />} />
                {PRIORITIES.map(priority => (
                  <Bar
                    key={priority}
                    dataKey={priority}
                    name={priority}
                    fill={CHART_COLORS[priority]}
                    stackId="stack"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CategoryHistoryAnalysis({ incidents, onClose }: CategoryHistoryAnalysisProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectingStart, setSelectingStart] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1);
    return format(firstDay, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleDateClick = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    if (selectingStart) {
      setStartDate(formattedDate);
      setSelectingStart(false);
    } else {
      if (date < parseISO(startDate)) {
        setEndDate(startDate);
        setStartDate(formattedDate);
      } else {
        setEndDate(formattedDate);
      }
      setShowCalendar(false);
      setSelectingStart(true);
    }
  };

  const formatDateForDisplay = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };

  const handleInputDateChange = (date: string, isStart: boolean) => {
    try {
      const parsedDate = parseISO(date);
      if (isStart) {
        if (parsedDate > parseISO(endDate)) {
          setStartDate(date);
          setEndDate(date);
        } else {
          setStartDate(date);
        }
      } else {
        if (parsedDate < parseISO(startDate)) {
          setEndDate(startDate);
        } else {
          setEndDate(date);
        }
      }
    } catch (e) {
      // Invalid date, ignore
    }
  };

  const handleQuickDateSelect = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
    setShowCalendar(false);
  };

  const monthlyData = useMemo(() => {
    const end = parseISO(endDate);
    const start = parseISO(startDate);
    const months = eachMonthOfInterval({ start, end });

    const globalData = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthIncidents = incidents.filter(incident => {
        try {
          const incidentDate = parseISO(incident.Opened);
          return isWithinInterval(incidentDate, { start: monthStart, end: monthEnd });
        } catch (error) {
          return false;
        }
      });

      const data: Record<string, any> = {
        month: month.getTime(),
        monthLabel: format(month, 'MMM/yy', { locale: ptBR }),
        total: monthIncidents.length
      };

      PRIORITIES.forEach(priority => {
        data[priority] = monthIncidents.filter(i => 
          normalizePriority(i.Priority) === priority
        ).length;
      });

      return data;
    });

    const categoriesData = CATEGORIES.map(category => {
      const monthlyStats = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthIncidents = incidents.filter(incident => {
          try {
            const incidentDate = parseISO(incident.Opened);
            return incident.Category?.includes(category) &&
                   isWithinInterval(incidentDate, { start: monthStart, end: monthEnd });
          } catch (error) {
            return false;
          }
        });

        const data: Record<string, any> = {
          month: month.getTime(),
          monthLabel: format(month, 'MMM/yy', { locale: ptBR }),
          total: monthIncidents.length
        };

        PRIORITIES.forEach(priority => {
          data[priority] = monthIncidents.filter(i => 
            normalizePriority(i.Priority) === priority
          ).length;
        });

        return data;
      });

      const totalIncidents = monthlyStats.reduce((sum, month) => sum + month.total, 0);
      const priorityStats = PRIORITIES.reduce((acc, priority) => ({
        ...acc,
        [priority]: monthlyStats.reduce((sum, month) => sum + month[priority], 0)
      }), {});

      return {
        name: category,
        data: monthlyStats,
        total: totalIncidents,
        ...priorityStats
      };
    });

    return [
      {
        name: 'Total por Categoria',
        data: globalData,
        total: globalData.reduce((sum, month) => sum + month.total, 0)
      },
      ...categoriesData
    ];
  }, [incidents, startDate, endDate]);

  const renderCalendar = () => {
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });

    const firstDayOfMonth = daysInMonth[0].getDay();
    const paddingDays = firstDayOfMonth === 0 ? [] : Array(firstDayOfMonth).fill(null);

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
      <div 
        ref={calendarRef}
        className="absolute z-50 mt-2 p-4 bg-[#1C2333] rounded-lg shadow-xl border border-gray-700 w-[300px]"
      >
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <ChevronLeft className="h-4 w-4 text-gray-400" />
          </button>
          <span className="text-white font-medium">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button
            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs text-gray-400 py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {[...paddingDays, ...daysInMonth].map((day, index) => {
            if (!day) {
              return <div key={`padding-${index}`} className="p-2" />;
            }

            const isSelected = isSameDay(day, parseISO(selectingStart ? startDate : endDate));
            const isInRange = day >= parseISO(startDate) && day <= parseISO(endDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                className={`
                  p-2 text-sm rounded-lg transition-colors
                  ${!isCurrentMonth ? 'text-gray-600' : 'text-white'}
                  ${isSelected ? 'bg-indigo-600' : ''}
                  ${!isSelected && isInRange ? 'bg-indigo-600/20' : ''}
                  ${!isSelected && !isInRange ? 'hover:bg-gray-700' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        <div className="mt-4 border-t border-gray-700 pt-4">
          <div className="text-sm text-gray-400 mb-2">
            {selectingStart ? 'Selecione a data inicial' : 'Selecione a data final'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickDateSelect(30)}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-[#151B2B] hover:bg-gray-700 rounded-lg transition-colors"
            >
              Últimos 30 dias
            </button>
            <button
              onClick={() => handleQuickDateSelect(90)}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-[#151B2B] hover:bg-gray-700 rounded-lg transition-colors"
            >
              Últimos 90 dias
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-[#1F2937] p-4 rounded-lg border border-gray-700 shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="text-white">{entry.value}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total</span>
              <span className="text-white font-bold">
                {payload.reduce((sum: number, entry: any) => sum + entry.value, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (selectedCategory) {
    return (
      <SubcategoryAnalysis
        category={selectedCategory}
        incidents={incidents}
        startDate={startDate}
        endDate={endDate}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  return (
    <div className="bg-[#151B2B] p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Histórico por Categoria</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      <div className="relative">
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex items-center gap-2 px-3 py-2 bg-[#0B1120] border border-gray-700 rounded-lg text-white hover:bg-gray-700 transition-colors"
          >
            <Calendar className="h-5 w-5 text-gray-400" />
            <span>Selecionar Período</span>
          </button>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleInputDateChange(e.target.value, true)}
                className="w-full px-3 py-2 bg-[#0B1120] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formatDateForDisplay(startDate)}
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleInputDateChange(e.target.value, false)}
                className="w-full px-3 py-2 bg-[#0B1120] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formatDateForDisplay(endDate)}
              </p>
            </div>
          </div>
        </div>

        {showCalendar && renderCalendar()}
      </div>

      <div className="space-y-6">
        {monthlyData.map(({ name, data, total }) => {
          const isGlobal = name === 'Total por Categoria';
          const isExpanded = isGlobal || expandedCategories.includes(name);
          
          return (
            <div 
              key={name}
              className={`bg-[#1C2333] p-4 rounded-lg ${
                isGlobal ? 'border-2 border-indigo-500/50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white">
                    {name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {total} chamados no período selecionado
                  </p>
                </div>
                {!isGlobal && (
                  <div className="flex items-center gap-2">
                    {isExpanded && (
                      <button
                        onClick={() => setSelectedCategory(name)}
                        className="px-3 py-1.5 text-sm text-indigo-400 hover:text-white bg-[#151B2B] hover:bg-indigo-600/20 rounded-lg transition-colors"
                      >
                        Ver Subcategorias
                      </button>
                    )}
                    <button
                      onClick={() => toggleCategory(name)}
                      className="p-2 hover:bg-[#151B2B] rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className={`
                overflow-hidden transition-all duration-300
                ${isExpanded ? 'h-[400px]' : 'h-0'}
              `}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data}
                    margin={{ 
                      top: 20, 
                      right: 30, 
                      left: 20, 
                      bottom: 40
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                    <XAxis 
                      dataKey="monthLabel"
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      axisLine={{ stroke: '#374151' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      axisLine={{ stroke: '#374151' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {PRIORITIES.map(priority => (
                      <Bar
                        key={priority}
                        dataKey={priority}
                        name={priority}
                        fill={CHART_COLORS[priority]}
                        stackId="stack"
                        label={{
                          position: 'top',
                          content: ({ x, y, width, value, index }) => {
                            const isLastBar = priority === PRIORITIES[PRIORITIES.length - 1];
                            if (!isLastBar) return null;
                            
                            const total = data[index].total;
                            if (total === 0) return null;

                            return (
                              <text
                                x={x + width / 2}
                                y={y - 10}
                                fill="#9CA3AF"
                                textAnchor="middle"
                                fontSize={12}
                              >
                                {total}
                              </text>
                            );
                          }
                        }}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}