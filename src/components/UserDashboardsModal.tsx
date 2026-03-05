'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSearch, FiRefreshCw, FiEye, FiTrash2, FiBarChart, FiLoader, FiChevronLeft, FiChevronRight } from '@/lib/icons';
import ModalPortal from '@/components/ui/ModalPortal';
import { dashboardsClient } from '@/lib/api/dashboards-client';
import EChartsChart from '@/components/EChartsChart';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  productId?: string;
};

type DashboardItem = {
  id: string;
  name?: string;
  title?: string;
  query?: string;
  product_id?: string;
  user_id?: string;
  config?: {
    title?: string;
    type?: string;
    [key: string]: any;
  };
  values?: Record<string, any>;
  [key: string]: any;
};

export default function UserDashboardsModal({ isOpen, onClose, userId, productId }: Props) {
  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'alphabetical'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewOption, setPreviewOption] = useState<Record<string, any> | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const effectiveUserId = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('evolve-auth') : null;
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.userId || userId;
    } catch {
      return userId;
    }
  }, [userId]);

  const selected = useMemo(() => dashboards.find((d) => d.id === selectedId) || null, [dashboards, selectedId]);

  const displayTitle = (d: DashboardItem) => d?.config?.title || d?.title || d?.name || 'Gráfico';

  const filteredDashboards = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = term
      ? dashboards.filter((d) =>
          [d.name, d.title, d.id]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(term))
        )
      : dashboards;

    const sorted = [...list].sort((a, b) => {
      if (sort === 'alphabetical') {
        return (a.name || a.title || a.id).localeCompare(b.name || b.title || b.id);
      }
      // recent fallback: no timestamps yet, keep API order
      return 0;
    });
    return sorted;
  }, [dashboards, search, sort]);

  const totalPages = Math.ceil(filteredDashboards.length / itemsPerPage);
  const paginatedDashboards = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDashboards.slice(start, start + itemsPerPage);
  }, [filteredDashboards, currentPage, itemsPerPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    const fetchDashboards = async () => {
      if (!isOpen) return;
      if (!effectiveUserId || !productId) {
        setError('Faltan user_id o product_id para listar dashboards');
        setDashboards([]);
        setSelectedId(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const list = await dashboardsClient.listDashboards(effectiveUserId, productId);
        setDashboards(Array.isArray(list) ? list : []);
        setSelectedId(list?.[0]?.id || null);
      } catch (e: any) {
        setError(e?.message || 'Error al cargar dashboards');
        setDashboards([]);
        setSelectedId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboards();
  }, [isOpen, effectiveUserId, productId]);

  useEffect(() => {
    if (!isOpen) {
      setPreviewOption(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewOption(null);
    setPreviewError(null);
    setPreviewLoading(false);
  }, [isOpen, selectedId]);

  const renderDashboard = async (dashboard: DashboardItem) => {
    if (!isOpen) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewOption(null);
    try {
      console.log('UserDashboardsModal: renderDashboard payload', { dashboardId: dashboard.id, values: dashboard.values });
      const res = await dashboardsClient.renderDashboard(dashboard.id, 'json', dashboard.values);
      console.log('UserDashboardsModal: renderDashboard response', res);
      const option = (res && (res.option || res.echartsOption || res)) as any;
      if (option && typeof option === 'object') {
        setPreviewOption(option);
      } else {
        setPreviewError('No hay previsualización disponible para este gráfico aún');
      }
    } catch (e: any) {
      console.error('UserDashboardsModal: renderDashboard error', e);
      setPreviewError(e?.message || 'No se pudo generar la previsualización');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <ModalPortal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-panel border border-white/10 rounded-2xl w-full max-w-5xl mx-4 overflow-hidden shadow-2xl bg-[#0c0c0c]/90"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
            >
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <FiBarChart className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white tracking-tight">Mis gráficos</div>
                    <div className="text-xs text-gray-400">Gestiona y visualiza tus análisis guardados</div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Cerrar"
                >
                  <FiX size={20} />
                </button>
              </div>

              {!effectiveUserId || !productId ? (
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-200/80 text-sm px-6 py-4 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span>
                    Faltan <code className="text-xs bg-yellow-500/20 px-1.5 py-0.5 rounded border border-yellow-500/30">user_id</code> y/o <code className="text-xs bg-yellow-500/20 px-1.5 py-0.5 rounded border border-yellow-500/30">product_id</code>. Completa el login o selecciona el producto para habilitar el listado.
                  </span>
                </div>
              ) : null}

              <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] h-[600px]">
                {/* Sidebar list */}
                <div className="border-r border-white/10 p-5 flex flex-col bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Guardados</div>
                    <div className="text-xs text-gray-500">{filteredDashboards.length} total</div>
                  </div>

                  <div className="relative mb-4">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar gráfico..."
                      className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-500 space-y-3">
                        <FiLoader className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="text-xs">Cargando lista...</span>
                      </div>
                    ) : error ? (
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                      </div>
                    ) : filteredDashboards.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <div className="mb-3 flex justify-center">
                          <FiBarChart className="h-10 w-10 opacity-20" />
                        </div>
                        <p className="text-sm">No se encontraron gráficos</p>
                        {search && <p className="text-xs mt-1 text-gray-600">Intenta con otro término</p>}
                      </div>
                    ) : (
                      paginatedDashboards.map((d) => (
                        <div
                          key={d.id}
                          className={`group p-3 rounded-xl cursor-pointer border transition-all duration-200 ${
                            selectedId === d.id
                              ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                              : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                          }`}
                          onClick={() => {
                            setSelectedId(d.id);
                            // Preload preview if needed
                          }}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h3 className={`font-medium text-sm truncate transition-colors ${
                              selectedId === d.id ? 'text-blue-400' : 'text-gray-300 group-hover:text-white'
                            }`}>
                              {displayTitle(d)}
                            </h3>
                            {d.config?.type && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-mono flex-shrink-0">
                                {d.config.type}
                              </span>
                            )}
                          </div>
                          
                          <div className={`mt-3 flex items-center justify-end gap-2 opacity-0 transition-opacity duration-200 ${selectedId === d.id ? 'opacity-100' : 'group-hover:opacity-100'}`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(d.id);
                                renderDashboard(d);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white transition-colors border border-white/5"
                              title="Ver"
                            >
                              <FiEye className="h-3.5 w-3.5" /> Ver
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const ok = await confirm({
                                  title: 'Eliminar gráfico',
                                  description: `Se eliminará "${displayTitle(d)}". Esta acción no se puede deshacer.`,
                                  confirmText: 'Eliminar',
                                  cancelText: 'Cancelar',
                                  variant: 'destructive',
                                });
                                if (!ok) return;
                                try {
                                  await dashboardsClient.deleteDashboard(d.id);
                                  setDashboards((prev) => prev.filter((x) => x.id !== d.id));
                                  setSelectedId((prev) => (prev === d.id ? null : prev));
                                } catch (e: any) {
                                  setError(e?.message || 'No se pudo eliminar el gráfico');
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs text-red-400 hover:text-red-300 transition-colors border border-red-500/10"
                              title="Eliminar"
                            >
                              <FiTrash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-center">
                      <Pagination>
                        <PaginationContent className="gap-1">
                          <PaginationItem>
                            <button
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-white/10 bg-transparent text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <FiChevronLeft className="h-4 w-4" />
                            </button>
                          </PaginationItem>
                          <div className="flex items-center px-2 text-xs text-gray-500">
                            Página {currentPage} de {totalPages}
                          </div>
                          <PaginationItem>
                            <button
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-white/10 bg-transparent text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <FiChevronRight className="h-4 w-4" />
                            </button>
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>

                {/* Main preview */}
                <div className="p-6 bg-black/20 flex flex-col h-full overflow-hidden">
                  {!selected ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                      <div className="p-4 rounded-full bg-white/5 mb-4">
                        <FiBarChart className="h-8 w-8 opacity-40" />
                      </div>
                      <p className="text-sm font-medium text-gray-400">Selecciona un gráfico para previsualizarlo</p>
                      <p className="text-xs text-gray-600 mt-1">Los detalles aparecerán aquí</p>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="min-w-0">
                          <h2 className="text-xl font-bold text-white truncate tracking-tight">{displayTitle(selected)}</h2>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-medium">
                              {selected?.config?.type || 'Gráfico'}
                            </span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">ID: {selected.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 border border-white/10 rounded-2xl p-6 bg-[#0a0a0a]/50 backdrop-blur-md shadow-inner overflow-hidden relative">
                        <div className="flex items-center justify-between mb-4 absolute top-4 left-6 right-6 z-10">
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vista previa</div>
                          {previewLoading && (
                            <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">
                              <FiLoader className="h-3 w-3 animate-spin" />
                              <span>Generando...</span>
                            </div>
                          )}
                        </div>

                        {previewError ? (
                          <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="text-red-400 bg-red-500/10 p-3 rounded-full mb-3">
                              <FiX className="h-6 w-6" />
                            </div>
                            <h3 className="text-sm font-medium text-gray-300 mb-1">Error de previsualización</h3>
                            <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">
                              No se pudo generar la vista previa. Puede que los datos hayan cambiado.
                            </p>
                            <details className="text-left text-[10px] text-gray-500 bg-black/40 border border-white/5 rounded-lg p-3 w-full max-w-md cursor-pointer hover:bg-black/60 transition-colors">
                              <summary className="font-mono text-gray-400 mb-1 select-none">Ver detalles técnicos</summary>
                              <pre className="whitespace-pre-wrap break-words font-mono mt-2 text-red-400/80">{previewError}</pre>
                            </details>
                          </div>
                        ) : previewOption ? (
                          <div className="h-full pt-8">
                            <EChartsChart
                              option={previewOption}
                              height="100%"
                              className="w-full h-full"
                              title={displayTitle(selected)}
                              onRefresh={() => renderDashboard(selected)}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="p-4 rounded-full bg-white/5 mb-4 group-hover:bg-white/10 transition-colors">
                              <FiEye className="h-8 w-8 text-gray-600" />
                            </div>
                            <p className="text-sm text-gray-400 mb-4">La vista previa no está cargada</p>
                            <button
                              onClick={() => renderDashboard(selected)}
                              className="glass-button px-5 py-2 rounded-lg text-xs font-medium text-white hover:bg-white/10 bg-white/5 flex items-center gap-2 transition-all"
                            >
                              <FiRefreshCw className="h-3.5 w-3.5" />
                              Generar vista previa
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {ConfirmDialog}
    </ModalPortal>
  );
}
