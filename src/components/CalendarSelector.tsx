import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  X
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameMonth, 
  isSameDay, 
  parseISO,
  addDays,
  subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarSelectorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

export function CalendarSelector({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange,
  onClose,
  position = 'bottom'
}: CalendarSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectingStart, setSelectingStart] = useState(true);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  
  // Format dates for display
  const formatDateForDisplay = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    if (selectingStart) {
      onStartDateChange(formattedDate);
      setSelectingStart(false);
    } else {
      if (date < parseISO(startDate)) {
        onEndDateChange(startDate);
        onStartDateChange(formattedDate);
      } else {
        onEndDateChange(formattedDate);
      }
      setSelectingStart(true);
    }
  };

  // Handle quick date select
  const handleQuickDateSelect = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    onStartDateChange(format(start, 'yyyy-MM-dd'));
    onEndDateChange(format(end, 'yyyy-MM-dd'));
  };

  // Handle month navigation
  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  // Get days in current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Get padding days
  const firstDayOfMonth = daysInMonth[0].getDay();
  const paddingDays = firstDayOfMonth === 0 ? [] : Array(firstDayOfMonth).fill(null);

  // Week days
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Check if a date is in the selected range
  const isInRange = (date: Date) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    // If selecting end date and hovering, show preview of range
    if (!selectingStart && hoverDate && date >= start && date <= hoverDate) {
      return true;
    }
    
    return date >= start && date <= end;
  };

  return (
    <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 p-4 bg-[#1C2333] rounded-lg shadow-xl border border-gray-700 w-[320px]`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        </button>
        <span className="text-white font-medium">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700 rounded-full transition-colors ml-1"
            aria-label="Close calendar"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Selected Range Display */}
      <div className="bg-[#151B2B] p-2 rounded-lg mb-4 flex items-center justify-between">
        <div className="text-xs">
          <div className="text-gray-400">Início</div>
          <div className="text-white font-medium">{formatDateForDisplay(startDate)}</div>
        </div>
        <div className="text-gray-500">→</div>
        <div className="text-xs text-right">
          <div className="text-gray-400">Fim</div>
          <div className="text-white font-medium">{formatDateForDisplay(endDate)}</div>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs text-gray-400 py-1 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((_, index) => (
          <div key={`padding-${index}`} className="p-2" />
        ))}
        {daysInMonth.map(day => {
          const isSelected = isSameDay(day, parseISO(selectingStart ? startDate : endDate));
          const inRange = isInRange(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              onMouseEnter={() => !selectingStart && setHoverDate(day)}
              onMouseLeave={() => setHoverDate(null)}
              className={`
                p-2 text-sm rounded-lg transition-colors relative
                ${!isCurrentMonth ? 'text-gray-600' : 'text-white'}
                ${isSelected ? 'bg-indigo-600 hover:bg-indigo-700 z-10' : ''}
                ${!isSelected && inRange ? 'bg-indigo-600/20 hover:bg-indigo-600/30' : ''}
                ${!isSelected && !inRange ? 'hover:bg-gray-700' : ''}
              `}
              disabled={!isCurrentMonth}
            >
              {format(day, 'd')}
              {isSelected && (
                <span className="absolute inset-0 animate-ping bg-indigo-600 rounded-lg opacity-75" style={{animationDuration: '1s', animationIterationCount: '1'}}></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection Status */}
      <div className="mt-4 text-sm text-center text-indigo-400">
        {selectingStart ? 'Selecione a data inicial' : 'Selecione a data final'}
      </div>

      {/* Quick Selectors */}
      <div className="mt-4 border-t border-gray-700 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleQuickDateSelect(7)}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-[#151B2B] hover:bg-gray-700 rounded-lg transition-colors"
          >
            7 dias
          </button>
          <button
            onClick={() => handleQuickDateSelect(30)}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-[#151B2B] hover:bg-gray-700 rounded-lg transition-colors"
          >
            30 dias
          </button>
          <button
            onClick={() => handleQuickDateSelect(90)}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-[#151B2B] hover:bg-gray-700 rounded-lg transition-colors"
          >
            90 dias
          </button>
        </div>
      </div>
    </div>
  );
}