import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Calendar, Filter, X, AlertCircle, Clock, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Request, normalizeRequestPriority, normalizeRequestStatus, REQUEST_PRIORITIES, REQUEST_STATUSES } from '../types/request';
import { CalendarSelector } from './CalendarSelector';
import { RequestDetails } from './RequestDetails';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  requests: Request[];
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
}

const CHART_COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
  NEW: '#3b82f6',
  IN_PROGRESS: '#8b5cf6',
  COMPLETED: '#10b981',
  CANCELLED: '#6b7280'
} as const;

export function SearchBar({
  value,
  onChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  selectedCategory,
  onCategoryChange,
  categories,
  requests,
  selectedStatus,
  onStatusChange
}: SearchBarProps) {
  const [searchResults, setSearchResults] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Log quando selectedRequest mudar
  useEffect(() => {
    if (selectedRequest) {
      console.log('Request selecionada:', selectedRequest);
    }
  }, [selectedRequest]);

  // Handle click outside search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search results when value changes
  useEffect(() => {
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    const query = value.toLowerCase().trim();
    const results = requests.filter(request => {
      const searchFields = [
        request.Number?.toLowerCase() || '',
        request.ShortDescription?.toLowerCase() || '',
        request.RequestedForName?.toLowerCase() || '',
        request.RequestItem?.toLowerCase() || '',
        request.AssignmentGroup?.toLowerCase() || '',
        request.AssignedTo?.toLowerCase() || ''
      ];

      // Check if any field contains the search query
      const matchesSearch = searchFields.some(field => field.includes(query));

      // Special handling for request numbers
      const normalizedNumber = request.Number?.toLowerCase().replace(/^0+/, '') || '';
      const normalizedQuery = query.replace(/^0+/, '');
      const matchesNumber = normalizedNumber === normalizedQuery || 
                          normalizedNumber.includes(normalizedQuery);

      return matchesSearch || matchesNumber;
    });

    setSearchResults(results.slice(0, 10)); // Limit to 10 results for better performance
  }, [value, requests]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const clearSearch = useCallback(() => {
    onChange('');
    setSearchResults([]);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      clearSearch();
    }
  }, [clearSearch]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCategoryChange(e.target.value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onStatusChange) {
      onStatusChange(e.target.value);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const formatDateForDisplay = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const getStatusColor = (state: string) => {
    const normalizedState = normalizeRequestStatus(state);
    switch (normalizedState) {
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-400';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  return (
    <div style={{ display: 'none' }}>
      {/* Todo o conteúdo visual está oculto, mas a lógica permanece ativa */}
    </div>
  );
}