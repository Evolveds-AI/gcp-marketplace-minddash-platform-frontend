'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, RotateCcw, Save, Loader2, ArrowDown10, ArrowUp10, Search, History } from 'lucide-react';
import { toast } from 'sonner';

type StoredSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  data: any;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  getSnapshotData: () => any;
  onRestore: (data: any) => void;
};

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('evolve-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.accessToken || null;
  } catch {
    return null;
  }
}

export default function SnapshotsModal({ isOpen, onClose, productId, getSnapshotData, onRestore }: Props) {
  const [snapshots, setSnapshots] = useState<StoredSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  const syncAuthState = useCallback(() => {
    const token = getAccessToken();
    setAuthToken(token);
    if (!token) {
      setAuthError('Sesión expirada. Inicia sesión nuevamente para ver tus versiones guardadas.');
    } else {
      setAuthError(null);
    }
    return token;
  }, []);

  const loadSnapshots = useCallback(async () => {
    const token = syncAuthState();
    if (!token) {
      setSnapshots([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/canvas-snapshots?product_id=${encodeURIComponent(productId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401) {
        setAuthError('Sesión expirada. Inicia sesión nuevamente para ver tus versiones guardadas.');
        setSnapshots([]);
        return;
      }
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'No se pudieron cargar las versiones');
      }
      setSnapshots(json.data?.snapshots || []);
      setAuthError(null);
    } catch (e: any) {
      toast.error(e?.message || 'Error al cargar las versiones');
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, [productId, syncAuthState]);

  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
    }
  }, [isOpen, loadSnapshots]);

  const normalizedName = newName.trim();
  const duplicateName = useMemo(() => {
    const value = normalizedName.toLowerCase();
    if (!value) return false;
    return snapshots.some((s) => (s.name || '').trim().toLowerCase() === value);
  }, [normalizedName, snapshots]);

  const canSave = Boolean(authToken && normalizedName && !duplicateName && !saving);
  const saveTooltip = !authToken
    ? 'Inicia sesión para guardar'
    : !normalizedName
      ? 'Ingresa un nombre para guardar'
      : duplicateName
        ? 'El nombre ya existe'
        : saving
          ? 'Guardando versión'
          : 'Guardar versión';

  const filteredSnapshots = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? snapshots.filter((s) => (s.name || '').toLowerCase().includes(q))
      : snapshots;

    return [...base].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return sortDirection === 'desc' ? tb - ta : ta - tb;
    });
  }, [query, snapshots, sortDirection]);

  const formatSnapshotMeta = useCallback((s: StoredSnapshot): string => {
    try {
      const data = s.data || {};
      const slots: any[] = Array.isArray(data?.slots) ? data.slots : [];
      const chartsCount = slots.filter((x) => x?.dashboardId).length;

      const f = data?.filters || {};
      const preset = f?.datePreset;
      const from = f?.dateFrom ? new Date(f.dateFrom) : null;
      const to = f?.dateTo ? new Date(f.dateTo) : null;
      const range = from || to ? `${from ? from.toLocaleDateString('es-CL') : '—'} → ${to ? to.toLocaleDateString('es-CL') : '—'}` : null;

      const parts = [`${chartsCount} gráfico${chartsCount !== 1 ? 's' : ''}`];
      if (preset) parts.push(String(preset));
      if (range) parts.push(range);
      return parts.join(' • ');
    } catch {
      return '';
    }
  }, []);

  const handleSave = useCallback(async () => {
    const token = syncAuthState();
    if (!token) return;
    if (!normalizedName) {
      toast.error('Escribe un nombre para guardar la versión');
      return;
    }
    if (duplicateName) {
      toast.error('Ya existe una versión con ese nombre');
      return;
    }

    setSaving(true);
    try {
      const data = getSnapshotData();
      const res = await fetch('/api/canvas-snapshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: productId,
          snapshot: {
            name: normalizedName,
            data,
          },
        }),
      });
      if (res.status === 401) {
        setAuthError('Sesión expirada. Inicia sesión nuevamente para guardar versiones.');
        return;
      }
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'No se pudo guardar la versión');
      }
      toast.success('Versión guardada');
      setNewName('');
      await loadSnapshots();
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar la versión');
    } finally {
      setSaving(false);
    }
  }, [duplicateName, getSnapshotData, loadSnapshots, normalizedName, productId, syncAuthState]);

  const handleDelete = useCallback(async (snapshotId: string) => {
    const token = syncAuthState();
    if (!token) return;

    setDeletingId(snapshotId);
    try {
      const res = await fetch(
        `/api/canvas-snapshots?product_id=${encodeURIComponent(productId)}&snapshot_id=${encodeURIComponent(snapshotId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.status === 401) {
        setAuthError('Sesión expirada. Inicia sesión nuevamente para eliminar versiones.');
        return;
      }
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'No se pudo eliminar la versión');
      }
      toast.success('Versión eliminada');
      await loadSnapshots();
    } catch (e: any) {
      toast.error(e?.message || 'Error al eliminar la versión');
    } finally {
      setDeletingId(null);
    }
  }, [loadSnapshots, productId, syncAuthState]);

  const handleRestore = useCallback((snapshot: StoredSnapshot) => {
    try {
      onRestore(snapshot.data);
      toast.success('Versión restaurada');
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo restaurar la versión');
    }
  }, [onClose, onRestore]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="glass-panel border border-white/10 rounded-2xl p-0 max-w-2xl w-full mx-4 shadow-2xl bg-[#0c0c0c]/90 overflow-hidden">
            <TooltipProvider>
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <History className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-white tracking-tight">Versiones guardadas</DialogTitle>
                    <DialogDescription className="text-xs text-gray-400 mt-0.5">
                      Gestiona el historial de cambios de tu canvas
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="p-6">
              {authError ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-4 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  {authError}
                </div>
              ) : !authToken ? (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 mb-4 text-center">
                  Inicia sesión para guardar y restaurar versiones.
                </div>
              ) : null}

              {/* Create New Snapshot Section */}
              <div className="space-y-3 mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Crear nueva versión</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nombre de la versión (ej: Cierre Q3)"
                      className="h-11 bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-blue-500/40 rounded-lg"
                      aria-invalid={duplicateName}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canSave) handleSave();
                      }}
                    />
                    {duplicateName && (
                      <div className="absolute -bottom-5 left-0 text-[10px] text-red-400 font-medium">Ya existe una versión con ese nombre</div>
                    )}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleSave}
                        disabled={!canSave}
                        className="h-11 px-4 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 rounded-lg disabled:opacity-50 disabled:bg-white/10 transition-all font-medium"
                        aria-label={saveTooltip}
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {saving ? 'Guardando' : 'Guardar'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black/90 text-white border border-white/10" side="top">
                      {saveTooltip}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Historial</div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar..."
                        className="h-8 pl-9 pr-3 bg-white/5 border-white/10 text-white text-xs w-[180px] focus-visible:ring-blue-500/40 rounded-lg placeholder:text-gray-600"
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSortDirection((p) => (p === 'desc' ? 'asc' : 'desc'))}
                          className="h-8 w-8 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg"
                        >
                          {sortDirection === 'desc' ? <ArrowDown10 className="w-4 h-4" /> : <ArrowUp10 className="w-4 h-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-black/90 text-white border border-white/10" side="top">
                        {sortDirection === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20 h-[300px] overflow-y-auto custom-scrollbar">
                  {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="text-xs font-medium">Cargando versiones...</span>
                    </div>
                  ) : filteredSnapshots.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <History className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="text-sm text-gray-300 font-medium">No hay versiones guardadas</div>
                      <div className="text-xs text-gray-500 mt-1 max-w-[200px]">Guarda una versión nueva para verla aquí.</div>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {filteredSnapshots.map((s) => (
                        <div key={s.id} className="group flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-200 truncate max-w-[200px]">
                                {s.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                              <span className="font-mono">{new Date(s.createdAt).toLocaleString('es-CL', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                              <span className="truncate max-w-[250px] text-gray-400">{formatSnapshotMeta(s)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRestore(s)}
                                  className="h-8 px-3 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg gap-1.5"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Restaurar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-black/90 text-white border border-white/10" side="top">
                                Restaurar esta versión
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(s.id)}
                                  disabled={deletingId === s.id}
                                  className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  {deletingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-black/90 text-white border border-white/10" side="top">
                                Eliminar esta versión
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

              <div className="flex justify-end p-5 border-t border-white/10 bg-[#0a0a0a]/50">
                <Button 
                  variant="outline" 
                  onClick={onClose} 
                  className="border-white/10 text-gray-400 hover:text-white hover:bg-white/5 h-10 px-6 rounded-lg font-medium"
                >
                  Cerrar
                </Button>
              </div>
            </TooltipProvider>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
