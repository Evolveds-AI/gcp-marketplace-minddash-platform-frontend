'use client';

import { useState, useCallback, useMemo, useId } from 'react';
import { Calendar, ChevronDown, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

export interface DateRange {
  from: Date | null;
  to: Date | null;
  preset: DatePreset;
}

export interface GlobalFiltersState {
  dateRange: DateRange;
}

interface Props {
  filters: GlobalFiltersState;
  onFiltersChange: (filters: GlobalFiltersState) => void;
  onApply: () => void;
  isApplying?: boolean;
  hasActiveFilters?: boolean;
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'last7days', label: 'Últimos 7 días' },
  { value: 'last30days', label: 'Últimos 30 días' },
  { value: 'thisMonth', label: 'Este mes' },
  { value: 'lastMonth', label: 'Mes anterior' },
  { value: 'thisYear', label: 'Este año' },
  { value: 'custom', label: 'Personalizado' },
];

function getPresetDates(preset: DatePreset): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: yesterday, to: yesterday };
    }
    case 'last7days': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: today };
    }
    case 'last30days': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from, to: today };
    }
    case 'thisMonth': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: today };
    }
    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from, to };
    }
    case 'thisYear': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: today };
    }
    default:
      return { from: today, to: today };
  }
}

function formatDateDisplay(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('es-CL', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

function formatDateInput(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

export function createInitialFilters(): GlobalFiltersState {
  return {
    dateRange: {
      from: null,
      to: null,
      preset: 'last30days',
    },
  };
}

export function filtersToParams(filters: GlobalFiltersState): Record<string, any> {
  const params: Record<string, any> = {};
  
  if (filters.dateRange.preset !== 'custom') {
    const { from, to } = getPresetDates(filters.dateRange.preset);
    params.fecha_inicio = formatDateInput(from);
    params.fecha_fin = formatDateInput(to);
    params.start_date = formatDateInput(from);
    params.end_date = formatDateInput(to);
  } else if (filters.dateRange.from && filters.dateRange.to) {
    params.fecha_inicio = formatDateInput(filters.dateRange.from);
    params.fecha_fin = formatDateInput(filters.dateRange.to);
    params.start_date = formatDateInput(filters.dateRange.from);
    params.end_date = formatDateInput(filters.dateRange.to);
  }
  
  return params;
}

export default function GlobalFilters({ 
  filters, 
  onFiltersChange, 
  onApply,
  isApplying = false,
  hasActiveFilters = false,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const fromInputId = `${baseId}-from`;
  const toInputId = `${baseId}-to`;
  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);
  
  const currentPresetLabel = useMemo(() => {
    const preset = DATE_PRESETS.find(p => p.value === filters.dateRange.preset);
    return preset?.label || 'Seleccionar período';
  }, [filters.dateRange.preset]);

  const displayRange = useMemo(() => {
    if (filters.dateRange.preset === 'custom') {
      if (filters.dateRange.from && filters.dateRange.to) {
        return `${formatDateDisplay(filters.dateRange.from)} - ${formatDateDisplay(filters.dateRange.to)}`;
      }
      return 'Seleccionar fechas';
    }
    const { from, to } = getPresetDates(filters.dateRange.preset);
    return `${formatDateDisplay(from)} - ${formatDateDisplay(to)}`;
  }, [filters.dateRange]);

  const handlePresetChange = useCallback((preset: DatePreset) => {
    if (preset === 'custom') {
      onFiltersChange({
        ...filters,
        dateRange: {
          ...filters.dateRange,
          preset,
        },
      });
    } else {
      const { from, to } = getPresetDates(preset);
      onFiltersChange({
        ...filters,
        dateRange: {
          from,
          to,
          preset,
        },
      });
    }
  }, [filters, onFiltersChange]);

  const handleCustomDateChange = useCallback((field: 'from' | 'to', value: string) => {
    const date = value ? new Date(value + 'T00:00:00') : null;
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: date,
        preset: 'custom',
      },
    });
  }, [filters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    onFiltersChange(createInitialFilters());
  }, [onFiltersChange]);

  return (
    <div className="bg-[#0c0c0c] border border-gray-800 rounded-lg">
      {/* Collapsed view */}
      <div 
        role="button"
        tabIndex={0}
        aria-label="Alternar filtros globales"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-800/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        onClick={handleToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleToggle();
          }
        }}
      >
        <div className="flex items-center gap-2">
          <Filter className={`w-4 h-4 ${hasActiveFilters ? 'text-blue-400' : 'text-gray-500'}`} />
          <span className="text-xs font-medium text-gray-300">Filtros globales</span>
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-600/20 text-blue-400 rounded">
              Activos
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end text-right">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{currentPresetLabel}</span>
            </div>
            <span className="text-[10px] text-gray-600">{displayRange}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded view */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            id={panelId}
          >
            <div className="px-3 pb-3 border-t border-gray-800 pt-3">
              {/* Date Presets */}
              <div className="mb-3">
                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                  Período de tiempo
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      aria-pressed={filters.dateRange.preset === preset.value}
                      onClick={() => handlePresetChange(preset.value)}
                      className={`px-2 py-1.5 rounded text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                        filters.dateRange.preset === preset.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Inputs */}
              {filters.dateRange.preset === 'custom' && (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor={fromInputId}
                      className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1 block"
                    >
                      Desde
                    </label>
                    <input
                      id={fromInputId}
                      type="date"
                      value={formatDateInput(filters.dateRange.from)}
                      onChange={(e) => handleCustomDateChange('from', e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={toInputId}
                      className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1 block"
                    >
                      Hasta
                    </label>
                    <input
                      id={toInputId}
                      type="date"
                      value={formatDateInput(filters.dateRange.to)}
                      onChange={(e) => handleCustomDateChange('to', e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    />
                  </div>
                </div>
              )}

              {/* Display Range */}
              <div className="mb-3 px-2 py-1.5 bg-gray-900 rounded border border-gray-800">
                <div className="text-[10px] text-gray-500 mb-0.5">Rango seleccionado</div>
                <div className="text-xs text-white font-medium">{displayRange}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar
                </button>
                <Button
                  onClick={() => {
                    onApply();
                    setIsExpanded(false);
                  }}
                  disabled={isApplying}
                  size="sm"
                  type="button"
                  className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  {isApplying ? 'Aplicando...' : 'Aplicar a todos'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
