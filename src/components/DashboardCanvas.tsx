'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { dashboardsClient } from '@/lib/api/dashboards-client';
import EChartsChart from '@/components/EChartsChart';
import { Plus, Loader2, X, RefreshCw, Search, Maximize2, Download, Check, Link, Calendar, Filter, BarChart3, Eye, EyeOff, History } from 'lucide-react';
import ExportModal from '@/components/canvas/ExportModal';
import GlobalFilters, { GlobalFiltersState, createInitialFilters, filtersToParams, DatePreset } from '@/components/canvas/GlobalFilters';
import { readUrlState, updateUrlState, copyShareableUrl, CanvasUrlState } from '@/lib/canvas-url-state';
import { KPICardGrid } from '@/components/canvas/KPICard';
import { createSummaryKPIs } from '@/lib/kpi-utils';
import SnapshotsModal from '@/components/canvas/SnapshotsModal';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type ParamType = 'str' | 'int' | 'float' | 'bool' | 'date' | 'datetime' | 'uuid';

type Dashboard = {
  id: string;
  name?: string;
  config?: {
    title?: string;
    type?: string;
  };
  params?: Record<string, ParamType>;
  values?: Record<string, any>;
  created_at?: string;
};

type SlotData = {
  dashboard: Dashboard | null;
  option: Record<string, any> | null;
  loading: boolean;
  error: string | null;
  currentValues: Record<string, any>;
  showParams: boolean;
};

type Props = {
  userId?: string;
  productId?: string;
};

const MAX_SLOTS = 4;

const createEmptySlot = (): SlotData => ({
  dashboard: null,
  option: null,
  loading: false,
  error: null,
  currentValues: {},
  showParams: false,
});

function getAuthenticatedUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('evolve-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.userId || null;
  } catch {
    return null;
  }
}

export default function DashboardCanvas({ userId, productId }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [availableDashboards, setAvailableDashboards] = useState<Dashboard[]>([]);
  const [slots, setSlots] = useState<SlotData[]>(
    Array(MAX_SLOTS).fill(null).map(() => createEmptySlot())
  );
  const [fullscreenSlot, setFullscreenSlot] = useState<number | null>(null);
  const [loadingDashboards, setLoadingDashboards] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [snapshotsModalOpen, setSnapshotsModalOpen] = useState(false);
  const [globalFilters, setGlobalFilters] = useState<GlobalFiltersState>(createInitialFilters());
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showKPIs, setShowKPIs] = useState(true);
  const [pendingSnapshot, setPendingSnapshot] = useState<any | null>(null);

  // Store URL state to restore charts after dashboards load
  const [pendingUrlState, setPendingUrlState] = useState<CanvasUrlState | null>(null);

  useEffect(() => {
    if (selectorOpen === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectorOpen(null);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectorOpen]);

  // Read URL state on mount
  useEffect(() => {
    const urlState = readUrlState();
    if (urlState) {
      // Restore filters from URL
      if (urlState.datePreset || urlState.dateFrom) {
        const restoredFilters: GlobalFiltersState = {
          dateRange: {
            preset: (urlState.datePreset as DatePreset) || 'custom',
            from: urlState.dateFrom ? new Date(urlState.dateFrom) : null,
            to: urlState.dateTo ? new Date(urlState.dateTo) : null,
          },
        };
        setGlobalFilters(restoredFilters);
        setHasActiveFilters(true);
      }
      // Store charts to restore after dashboards load
      if (urlState.charts && urlState.charts.length > 0) {
        setPendingUrlState(urlState);
      }
    }
  }, []);

  // Fetch available dashboards
  useEffect(() => {
    const fetchDashboards = async () => {
      const authenticatedUserId = getAuthenticatedUserId();
      const effectiveUserId = authenticatedUserId || userId;

      if (!effectiveUserId || !productId) {
        setError(null);
        setLoadingDashboards(true);
        return;
      }

      setLoadingDashboards(true);
      setError(null);

      try {
        const list = await dashboardsClient.listDashboards(effectiveUserId, productId);
        setAvailableDashboards(Array.isArray(list) ? list : []);
      } catch (err: any) {
        setError(err?.message || 'Error al cargar dashboards');
        setAvailableDashboards([]);
      } finally {
        setLoadingDashboards(false);
      }
    };

    fetchDashboards();
  }, [userId, productId]);

  const getDisplayTitle = (dashboard: Dashboard) => {
    return dashboard.config?.title || dashboard.name || 'Gráfico sin título';
  };

  const loadChartForSlot = useCallback(async (slotIndex: number, dashboard: Dashboard, values?: Record<string, any>) => {
    const initialValues = values ?? dashboard.values ?? {};
    
    setSlots((prev) => {
      const updated = [...prev];
      updated[slotIndex] = {
        dashboard,
        option: null,
        loading: true,
        error: null,
        currentValues: initialValues,
        showParams: false,
      };
      return updated;
    });

    try {
      const renderResult = await dashboardsClient.renderDashboard(dashboard.id, 'json', initialValues);
      setSlots((prev) => {
        const updated = [...prev];
        updated[slotIndex] = {
          ...updated[slotIndex],
          option: renderResult,
          loading: false,
          error: null,
        };
        return updated;
      });
    } catch (err: any) {
      setSlots((prev) => {
        const updated = [...prev];
        updated[slotIndex] = {
          ...updated[slotIndex],
          option: null,
          loading: false,
          error: err?.message || 'Error al renderizar',
        };
        return updated;
      });
    }
  }, []);

  // Restore charts from URL after dashboards are loaded
  useEffect(() => {
    if (!pendingUrlState?.charts || availableDashboards.length === 0 || loadingDashboards) {
      return;
    }

    const chartsToRestore = pendingUrlState.charts;
    const dashboardsMap = new Map(availableDashboards.map(d => [d.id, d]));
    
    // Load each chart into its slot
    chartsToRestore.forEach((chartId, index) => {
      if (index < MAX_SLOTS) {
        const dashboard = dashboardsMap.get(chartId);
        if (dashboard) {
          loadChartForSlot(index, dashboard);
        }
      }
    });

    // Clear pending state after restoration
    setPendingUrlState(null);
  }, [availableDashboards, loadingDashboards, pendingUrlState, loadChartForSlot]);

  const handleAddToSlot = (slotIndex: number, dashboard: Dashboard) => {
    setSelectorOpen(null);
    setSearchQuery('');
    loadChartForSlot(slotIndex, dashboard);
  };

  const handleRemoveFromSlot = (slotIndex: number) => {
    setSlots((prev) => {
      const updated = [...prev];
      updated[slotIndex] = createEmptySlot();
      return updated;
    });
  };

  const handleUpdateParamValue = (slotIndex: number, key: string, value: any) => {
    setSlots((prev) => {
      const updated = [...prev];
      updated[slotIndex] = {
        ...updated[slotIndex],
        currentValues: { ...updated[slotIndex].currentValues, [key]: value },
      };
      return updated;
    });
  };

  const handleApplyParams = (slotIndex: number) => {
    const slot = slots[slotIndex];
    if (slot.dashboard) {
      loadChartForSlot(slotIndex, slot.dashboard, slot.currentValues);
    }
  };

  const handleRefreshSlot = (slotIndex: number) => {
    const slot = slots[slotIndex];
    if (slot.dashboard) {
      loadChartForSlot(slotIndex, slot.dashboard, slot.currentValues);
    }
  };

  // Formatear nombres de parámetros para mostrar de forma amigable
  const formatParamLabel = (key: string): string => {
    const labelMap: Record<string, string> = {
      'anio_param': 'Año',
      'mes_param': 'Mes',
      'fecha_inicio': 'Fecha Inicio',
      'fecha_fin': 'Fecha Fin',
      'year_param': 'Año',
      'month_param': 'Mes',
      'start_date': 'Fecha Inicio',
      'end_date': 'Fecha Fin',
    };
    if (labelMap[key]) return labelMap[key];
    // Convertir snake_case a Title Case
    return key
      .replace(/_param$/i, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatShortDate = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getParamInput = (slotIndex: number, key: string, type: ParamType, value: any) => {
    const label = formatParamLabel(key);
    
    if (type === 'bool') {
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`param-${slotIndex}-${key}`}
            checked={Boolean(value)}
            onCheckedChange={(checked) => handleUpdateParamValue(slotIndex, key, checked)}
            className="border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <Label htmlFor={`param-${slotIndex}-${key}`} className="text-xs text-gray-300 cursor-pointer">
            {label}
          </Label>
        </div>
      );
    }

    const inputType = type === 'int' || type === 'float' ? 'number' : type === 'date' || type === 'datetime' ? 'date' : 'text';
    
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`param-${slotIndex}-${key}`} className="text-xs text-gray-400">
          {label}
        </Label>
        <Input
          id={`param-${slotIndex}-${key}`}
          type={inputType}
          value={value ?? ''}
          onChange={(e) => {
            let val: any = e.target.value;
            if (type === 'int') val = parseInt(val) || 0;
            else if (type === 'float') val = parseFloat(val) || 0;
            handleUpdateParamValue(slotIndex, key, val);
          }}
          placeholder={type}
          className="h-8 bg-gray-900 border-gray-700 text-white text-xs placeholder:text-gray-500 focus-visible:ring-blue-500"
        />
      </div>
    );
  };

  const handleRefreshAll = () => {
    slots.forEach((slot, index) => {
      if (slot.dashboard) {
        loadChartForSlot(index, slot.dashboard, slot.currentValues);
      }
    });
  };

  const handleApplyGlobalFilters = useCallback(() => {
    setIsApplyingFilters(true);
    setHasActiveFilters(true);
    const filterParams = filtersToParams(globalFilters);
    
    // Apply filter params to all slots that have dashboards
    const promises = slots.map((slot, index) => {
      if (slot.dashboard) {
        const mergedValues = { ...slot.currentValues, ...filterParams };
        return loadChartForSlot(index, slot.dashboard, mergedValues);
      }
      return Promise.resolve();
    });

    Promise.all(promises).finally(() => {
      setIsApplyingFilters(false);
      
      // Update URL with current state
      const urlState: CanvasUrlState = {
        datePreset: globalFilters.dateRange.preset,
        dateFrom: globalFilters.dateRange.from?.toISOString().split('T')[0],
        dateTo: globalFilters.dateRange.to?.toISOString().split('T')[0],
        charts: slots.filter(s => s.dashboard).map(s => s.dashboard!.id),
      };
      updateUrlState(urlState);
    });
  }, [globalFilters, slots, loadChartForSlot]);

  const getSnapshotData = useCallback(() => {
    return {
      filters: {
        datePreset: globalFilters.dateRange.preset,
        dateFrom: globalFilters.dateRange.from?.toISOString() || null,
        dateTo: globalFilters.dateRange.to?.toISOString() || null,
      },
      slots: slots.map((s) => ({
        dashboardId: s.dashboard?.id || null,
        values: s.currentValues || {},
      })),
    };
  }, [globalFilters, slots]);

  const applySnapshot = useCallback(
    async (data: any) => {
      try {
        const f = data?.filters;
        const restoredFilters: GlobalFiltersState = f?.datePreset || f?.dateFrom || f?.dateTo
          ? {
              dateRange: {
                preset: (f.datePreset as DatePreset) || 'custom',
                from: f.dateFrom ? new Date(f.dateFrom) : null,
                to: f.dateTo ? new Date(f.dateTo) : null,
              },
            }
          : globalFilters;

        if (f?.datePreset || f?.dateFrom || f?.dateTo) {
          setGlobalFilters(restoredFilters);
          setHasActiveFilters(Boolean(f.datePreset || f.dateFrom || f.dateTo));
        }

        const filterParams = filtersToParams(restoredFilters);
        const slotsData: any[] = Array.isArray(data?.slots) ? data.slots : [];
        const dashboardsMap = new Map(availableDashboards.map((d) => [d.id, d]));

        for (let i = 0; i < MAX_SLOTS; i++) {
          const entry = slotsData[i];
          const dashId = entry?.dashboardId;
          if (!dashId) {
            handleRemoveFromSlot(i);
            continue;
          }

          let dash = dashboardsMap.get(dashId);
          if (!dash) {
            try {
              dash = await dashboardsClient.getDashboard(dashId);
              if (dash) dashboardsMap.set(dashId, dash);
            } catch {
              dash = undefined;
            }
          }

          if (!dash) {
            handleRemoveFromSlot(i);
            continue;
          }

          const baseValues = entry?.values || {};
          const mergedValues = { ...baseValues, ...filterParams };
          const hasValues = Object.keys(mergedValues).length > 0;
          await loadChartForSlot(i, dash, hasValues ? mergedValues : undefined);
        }

        const urlState: CanvasUrlState = {
          datePreset: restoredFilters.dateRange.preset,
          dateFrom: restoredFilters.dateRange.from?.toISOString().split('T')[0],
          dateTo: restoredFilters.dateRange.to?.toISOString().split('T')[0],
          charts: slotsData.map((slot) => slot?.dashboardId).filter(Boolean),
        };
        updateUrlState(urlState);
      } catch {
        // ignore
      }
    },
    [availableDashboards, globalFilters, handleRemoveFromSlot, loadChartForSlot]
  );

  const restoreFromSnapshot = useCallback(
    (data: any) => {
      if (loadingDashboards || availableDashboards.length === 0) {
        setPendingSnapshot(data);
        return;
      }
      void applySnapshot(data);
    },
    [applySnapshot, availableDashboards.length, loadingDashboards]
  );

  useEffect(() => {
    if (!pendingSnapshot || loadingDashboards || availableDashboards.length === 0) return;
    void applySnapshot(pendingSnapshot);
    setPendingSnapshot(null);
  }, [pendingSnapshot, loadingDashboards, availableDashboards.length, applySnapshot]);

  const handleCopyShareLink = useCallback(async () => {
    const urlState: CanvasUrlState = {
      datePreset: globalFilters.dateRange.preset,
      dateFrom: globalFilters.dateRange.from?.toISOString().split('T')[0],
      dateTo: globalFilters.dateRange.to?.toISOString().split('T')[0],
      charts: slots.filter(s => s.dashboard).map(s => s.dashboard!.id),
    };
    
    const success = await copyShareableUrl(urlState);
    if (success) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [globalFilters, slots]);

  const filledSlotsCount = slots.filter((s) => s.dashboard !== null).length;
  const activeDateParams = useMemo(() => filtersToParams(globalFilters), [globalFilters]);
  const activeDateRangeLabel = useMemo(() => {
    if (!activeDateParams) return 'Sin rango';
    const start = activeDateParams.fecha_inicio || activeDateParams.start_date;
    const end = activeDateParams.fecha_fin || activeDateParams.end_date;
    if (!start || !end) return 'Sin rango aplicado';
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  }, [activeDateParams]);
  const filterStatusLabel = hasActiveFilters ? 'Filtros activos' : 'Sin filtros aplicados';

  const chartsForExport = slots
    .filter((s) => s.dashboard && s.option)
    .map((s, idx) => ({
      id: s.dashboard!.id,
      name: getDisplayTitle(s.dashboard!),
      option: s.option!,
    }));

  const summaryKPIs = useMemo(() => {
    if (!showKPIs || chartsForExport.length === 0) return [];
    return createSummaryKPIs(chartsForExport);
  }, [chartsForExport, showKPIs]);

  const filteredDashboards = availableDashboards.filter((d) => {
    const title = getDisplayTitle(d).toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

  // Dashboards already in slots
  const usedDashboardIds = new Set(slots.filter((s) => s.dashboard).map((s) => s.dashboard!.id));

  if (loadingDashboards) {
    return (
      <div className="flex items-center justify-center h-full" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Cargando gráficos disponibles...</span>
        </div>
      </div>
    );
  }

  if (error && availableDashboards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" role="status" aria-live="polite">
        <div className="text-center">
          <div className="text-gray-400 mb-2">No se pudieron cargar los gráficos</div>
          <div className="text-sm text-gray-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={canvasRef} className="p-3 md:p-4 h-full">
      {/* Global Filters */}
      {availableDashboards.length > 0 && (
        <div className="mb-3">
          <GlobalFilters
            filters={globalFilters}
            onFiltersChange={setGlobalFilters}
            onApply={handleApplyGlobalFilters}
            isApplying={isApplyingFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      )}

      {/* Toolbar - Floating Island Style */}
      <div className="flex items-center justify-between mb-6 p-4 floating-island">
        <div className="text-xs text-gray-400 font-medium tracking-wide">
          <span className="text-blue-400 font-bold">{filledSlotsCount}</span> de {MAX_SLOTS} ESPACIOS USADOS
          {availableDashboards.length > 0 && (
            <span className="ml-3 border-l border-white/10 pl-3 text-gray-500">
              {availableDashboards.length} gráficos disponibles
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {productId && (
            <button
              type="button"
              onClick={() => setSnapshotsModalOpen(true)}
              className="glass-button flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-300 hover:text-white transition-all"
              title="Versiones guardadas del canvas"
            >
              <History className="w-4 h-4 text-blue-400" />
              Versiones
            </button>
          )}

          {filledSlotsCount > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-medium border ${
                  linkCopied 
                    ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                    : 'glass-button text-gray-300 hover:text-white'
                }`}
                title="Copiar enlace con filtros actuales"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 text-blue-400" />
                    Compartir
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setExportModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20 transition-all text-xs font-medium"
                title="Exportar datos o imagen"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
              <button
                type="button"
                onClick={handleRefreshAll}
                className="glass-button p-2 rounded-lg text-gray-400 hover:text-white hover:rotate-180 transition-all duration-500"
                title="Actualizar todos los gráficos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {filledSlotsCount > 0 && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="glass-panel rounded-xl px-4 py-3 flex items-center justify-between group hover:border-blue-500/30 transition-colors">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Rango actual</div>
              <div className="text-sm font-medium text-white group-hover:text-blue-200 transition-colors">{activeDateRangeLabel}</div>
            </div>
            <Calendar className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="glass-panel rounded-xl px-4 py-3 flex items-center justify-between group hover:border-blue-500/30 transition-colors">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Gráficos activos</div>
              <div className="text-sm font-medium text-white group-hover:text-blue-200 transition-colors">{filledSlotsCount} / {MAX_SLOTS}</div>
            </div>
            <BarChart3 className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="glass-panel rounded-xl px-4 py-3 flex items-center justify-between group hover:border-blue-500/30 transition-colors">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Estado de filtros</div>
              <div className={`text-sm font-medium transition-colors ${hasActiveFilters ? 'text-blue-400' : 'text-gray-400'}`}>
                {filterStatusLabel}
              </div>
            </div>
            <Filter className={`w-5 h-5 transition-colors ${hasActiveFilters ? 'text-blue-400' : 'text-gray-600'}`} />
          </div>
        </div>
      )}

      {/* KPI Summary Section */}
      {summaryKPIs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-bold text-gray-200 tracking-wide">RESUMEN DE MÉTRICAS</span>
            </div>
            <button
              type="button"
              onClick={() => setShowKPIs(!showKPIs)}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-blue-400 transition-colors px-2 py-1 rounded-md hover:bg-white/5"
            >
              {showKPIs ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showKPIs ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <AnimatePresence>
            {showKPIs && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <KPICardGrid kpis={summaryKPIs} columns={4} size="sm" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Grid 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100%-40px)]">
        {slots.map((slot, index) => (
          <div
            key={index}
            className={`rounded-2xl overflow-hidden flex flex-col min-h-[380px] transition-all duration-300 ${
              slot.dashboard 
                ? 'modern-card border-white/5 bg-[#0c0c0c]/80 backdrop-blur-md' 
                : 'border-2 border-dashed border-white/5 hover:border-white/10 bg-white/[0.02]'
            }`}
          >
            {slot.dashboard ? (
              <>
                {/* Slot header with chart */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                    <div className="text-sm font-semibold text-gray-200 truncate tracking-tight">
                      {getDisplayTitle(slot.dashboard)}
                    </div>
                    {hasActiveFilters && (
                      <div 
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex-shrink-0"
                        title="Filtros globales aplicados"
                      >
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase">Filtrado</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFullscreenSlot(index)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-blue-400 transition-colors"
                      title="Pantalla completa"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRefreshSlot(index)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                      title="Actualizar"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromSlot(index)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors"
                      title="Quitar del lienzo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Params panel - inline horizontal */}
                {slot.dashboard.params && Object.keys(slot.dashboard.params).length > 0 && (
                  <div className="flex items-end gap-3 px-4 py-3 border-b border-white/5 bg-black/20 flex-wrap backdrop-blur-sm">
                    {Object.entries(slot.dashboard.params).map(([key, type]) => (
                      <div key={key} className="flex-shrink-0">
                        {getParamInput(index, key, type, slot.currentValues[key])}
                      </div>
                    ))}
                    <Button
                      onClick={() => handleApplyParams(index)}
                      disabled={slot.loading}
                      size="sm"
                      type="button"
                      className="h-8 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-blue-900/20"
                    >
                      {slot.loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'Aplicar'
                      )}
                    </Button>
                  </div>
                )}

                {/* Chart content */}
                <div className="flex-1 p-4 min-h-[250px] relative">
                  {slot.loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-xs text-gray-400 font-medium">Cargando datos...</span>
                      </div>
                    </div>
                  ) : null}
                  
                  {slot.error ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center px-6 py-8 rounded-xl bg-red-500/5 border border-red-500/10">
                        <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Error de carga</div>
                        <div className="text-sm text-gray-400 line-clamp-3 max-w-[250px]">{slot.error}</div>
                      </div>
                    </div>
                  ) : slot.option ? (
                    <EChartsChart
                      option={slot.option}
                      height="100%"
                      className="h-full w-full"
                      title={getDisplayTitle(slot.dashboard)}
                      showToolbar={true}
                      onRefresh={() => handleRefreshSlot(index)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full opacity-0">
                      <div className="text-xs text-gray-600">Sin datos</div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Empty slot */
              <div className="flex-1 flex items-center justify-center relative p-6">
                <button
                  type="button"
                  onClick={() => setSelectorOpen(index)}
                  aria-disabled={availableDashboards.length === 0}
                  className={`group flex flex-col items-center gap-4 p-8 rounded-2xl border border-dashed border-gray-800 transition-all duration-300 w-full h-full justify-center ${
                    availableDashboards.length === 0
                      ? 'cursor-not-allowed opacity-60'
                      : 'hover:border-blue-500/50 hover:bg-blue-500/5'
                  } ${selectorOpen === index ? 'pointer-events-none' : ''}`}
                >
                  <div className="w-16 h-16 rounded-full bg-gray-900/50 group-hover:bg-blue-500/10 flex items-center justify-center transition-colors border border-gray-800 group-hover:border-blue-500/30">
                    <Plus className="w-6 h-6 text-gray-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-400 group-hover:text-gray-200 block mb-1">Agregar gráfico</span>
                    <span className="text-xs text-gray-600 group-hover:text-gray-500">Haz clic para seleccionar</span>
                  </div>
                </button>

                {/* Selector dropdown */}
                <AnimatePresence>
                  {selectorOpen === index && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute inset-4 glass-panel rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden border border-white/10 pointer-events-auto"
                      role="dialog"
                      aria-label="Seleccionar gráfico"
                    >
                      <div className="p-3 border-b border-white/10 bg-white/5">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="text"
                            placeholder="Buscar gráfico..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        {filteredDashboards.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
                            <Search className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs">No se encontraron gráficos</p>
                          </div>
                        ) : (
                          filteredDashboards.map((d) => {
                            const isUsed = usedDashboardIds.has(d.id);
                            return (
                              <button
                                type="button"
                                key={d.id}
                                onClick={() => handleAddToSlot(index, d)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors mb-1 ${
                                  isUsed
                                    ? 'text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white'
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <div className="truncate font-medium">{getDisplayTitle(d)}</div>
                                {isUsed && <div className="text-[10px] text-gray-500 mt-0.5">Ya en el lienzo</div>}
                              </button>
                            );
                          })
                        )}
                      </div>
                      <div className="p-2 border-t border-white/10 bg-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectorOpen(null);
                            setSearchQuery('');
                          }}
                          className="w-full py-1.5 text-xs text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {fullscreenSlot !== null && slots[fullscreenSlot]?.option && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setFullscreenSlot(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-7xl h-[90vh] glass-panel rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <div className="text-lg font-semibold text-white tracking-tight">
                  {slots[fullscreenSlot]?.dashboard && getDisplayTitle(slots[fullscreenSlot].dashboard!)}
                </div>
                <button
                  onClick={() => setFullscreenSlot(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 p-6 bg-[#0c0c0c]/80">
                <EChartsChart
                  option={slots[fullscreenSlot].option!}
                  height="100%"
                  className="h-full"
                  title={slots[fullscreenSlot]?.dashboard ? getDisplayTitle(slots[fullscreenSlot].dashboard!) : ''}
                  showToolbar={true}
                  onRefresh={() => {
                    if (fullscreenSlot !== null) handleRefreshSlot(fullscreenSlot);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        charts={chartsForExport}
        canvasRef={canvasRef as React.RefObject<HTMLElement>}
      />

      {/* Snapshots Modal */}
      {productId && (
        <SnapshotsModal
          isOpen={snapshotsModalOpen}
          onClose={() => setSnapshotsModalOpen(false)}
          productId={productId}
          getSnapshotData={getSnapshotData}
          onRestore={restoreFromSnapshot}
        />
      )}
    </div>
  );
}
