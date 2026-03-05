'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiBellOff, FiCheckCircle, FiTrash2, FiPlus, FiEdit3, FiClock, FiMail } from '@/lib/icons';
import { toast } from 'sonner';
import ModalPortal from '@/components/ui/ModalPortal';

interface Alert {
  id: string;
  product_id: string;
  prompt_alerta: string;
  codigo_cron: string;
  user_id: string;
  session_id: string;
  channel_product_type: 'email' | 'whatsapp';
  flg_habilitado: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  created_at?: string;
}

interface UserAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  chatbotName?: string;
}

const FREQUENCY_OPTIONS = [
  { label: 'Cada hora', value: '0 * * * *', shortLabel: 'Cada hora' },
  { label: 'Cada 2 horas', value: '0 */2 * * *', shortLabel: 'Cada 2h' },
  { label: 'Cada 4 horas', value: '0 */4 * * *', shortLabel: 'Cada 4h' },
  { label: 'Cada 6 horas', value: '0 */6 * * *', shortLabel: 'Cada 6h' },
  { label: 'Cada 12 horas', value: '0 */12 * * *', shortLabel: 'Cada 12h' },
  { label: 'Diario a las 8:00 AM', value: '0 8 * * *', shortLabel: 'Diario 8am' },
  { label: 'Diario a las 9:00 AM', value: '0 9 * * *', shortLabel: 'Diario 9am' },
  { label: 'Diario a las 12:00 PM', value: '0 12 * * *', shortLabel: 'Diario 12pm' },
  { label: 'Diario a las 6:00 PM', value: '0 18 * * *', shortLabel: 'Diario 6pm' },
  { label: 'Lunes a Viernes 9:00 AM', value: '0 9 * * 1-5', shortLabel: 'Lun-Vie 9am' },
  { label: 'Cada Lunes 9:00 AM', value: '0 9 * * 1', shortLabel: 'Semanal' },
];

const getFrequencyLabel = (cronValue: string): string => {
  const option = FREQUENCY_OPTIONS.find(opt => opt.value === cronValue);
  return option?.shortLabel || 'Personalizado';
};

function toLocalInputValue(d: Date) {
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function UserAlertsModal({ isOpen, onClose, productId, chatbotName }: UserAlertsModalProps) {
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    return toLocalInputValue(d);
  }, []);

  const [formData, setFormData] = useState({
    prompt_alerta: '',
    codigo_cron: FREQUENCY_OPTIONS[0].value,
    channel_product_type: 'email' as 'email' | 'whatsapp',
    flg_habilitado: true,
    fecha_inicio_local: defaultStart,
  });

  const loadAlerts = async () => {
    try {
      setLoading(true);

      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }

      const { accessToken } = JSON.parse(authData);

      const res = await fetch(`/api/backend/user-alerts?product_id=${encodeURIComponent(productId)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Error al cargar alertas');
      }

      const list = Array.isArray(json?.data) ? json.data : [];
      setAlerts(list);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Error al cargar alertas');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen]);

  const openCreate = () => {
    setEditingAlert(null);
    setFormData({
      prompt_alerta: '',
      codigo_cron: FREQUENCY_OPTIONS[0].value,
      channel_product_type: 'email',
      flg_habilitado: true,
      fecha_inicio_local: defaultStart,
    });
    setFormOpen(true);
  };

  const openEdit = (a: Alert) => {
    setEditingAlert(a);
    setFormData({
      prompt_alerta: a.prompt_alerta || '',
      codigo_cron: a.codigo_cron || FREQUENCY_OPTIONS[0].value,
      channel_product_type: (a.channel_product_type || 'email') as any,
      flg_habilitado: !!a.flg_habilitado,
      fecha_inicio_local: a.fecha_inicio ? toLocalInputValue(new Date(a.fecha_inicio)) : defaultStart,
    });
    setFormOpen(true);
  };

  const validateForm = () => {
    if (!formData.prompt_alerta.trim()) {
      toast.error('El prompt de alerta es requerido');
      return false;
    }
    if (formData.prompt_alerta.length > 1500) {
      toast.error('El prompt no puede exceder 1500 caracteres');
      return false;
    }

    if (!editingAlert) {
      if (alerts.length >= 3) {
        toast.error('Ya tienes el máximo de 3 alertas permitidas');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }

      const { accessToken } = JSON.parse(authData);

      const bodyBase = {
        product_id: productId,
        prompt_alerta: formData.prompt_alerta,
        codigo_cron: formData.codigo_cron,
        channel_product_type: formData.channel_product_type,
        flg_habilitado: formData.flg_habilitado,
        fecha_inicio: new Date(formData.fecha_inicio_local).toISOString(),
      };

      if (!editingAlert) {
        const res = await fetch('/api/backend/user-alerts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(bodyBase),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Error al crear alerta');
        toast.success('Alerta creada');
      } else {
        const res = await fetch('/api/backend/user-alerts', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            ...bodyBase,
            id: editingAlert.id,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Error al actualizar alerta');
        toast.success('Alerta actualizada');
      }

      setFormOpen(false);
      setEditingAlert(null);
      await loadAlerts();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Error al guardar alerta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (a: Alert) => {
    try {
      setLoading(true);

      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }

      const { accessToken } = JSON.parse(authData);

      const res = await fetch('/api/backend/user-alerts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ id: a.id, product_id: productId })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Error al eliminar alerta');

      toast.success('Alerta eliminada');
      await loadAlerts();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Error al eliminar alerta');
    } finally {
      setLoading(false);
    }
  };

  const title = chatbotName ? `Mis alertas - ${chatbotName}` : 'Mis alertas';

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
            className="glass-panel w-full max-w-3xl mx-4 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FiMail className="text-blue-400" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
                  <p className="text-xs text-gray-400">Gestiona tus notificaciones automáticas</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFormOpen(false);
                  setEditingAlert(null);
                  onClose();
                }}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Máximo 3 alertas activas</div>
                <button
                  onClick={openCreate}
                  disabled={loading}
                  className="glass-button flex items-center text-sm px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                >
                  <FiPlus className="mr-2" size={14} />
                  Nueva alerta
                </button>
              </div>

              {loading ? (
                <div className="text-sm text-gray-400 py-12 text-center flex flex-col items-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  Cargando tus alertas...
                </div>
              ) : alerts.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
                  <FiMail className="w-10 h-10 text-gray-600 mx-auto mb-3 opacity-50" />
                  <p className="text-gray-300 font-medium">No tienes alertas configuradas</p>
                  <p className="text-xs text-gray-500 mt-1">Crea una nueva para recibir notificaciones periódicas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map(a => (
                    <motion.div 
                      key={a.id} 
                      className="border border-white/5 rounded-xl p-4 bg-[#0a0a0a]/50 hover:bg-[#0a0a0a]/80 transition-colors group"
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {a.flg_habilitado ? (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                                <FiCheckCircle size={12} />
                                <span className="text-[10px] font-bold uppercase">Activa</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
                                <FiBellOff size={12} />
                                <span className="text-[10px] font-bold uppercase">Inactiva</span>
                              </div>
                            )}
                            <div className="text-sm text-blue-300 font-medium truncate flex items-center gap-2">
                              {getFrequencyLabel(a.codigo_cron)}
                              <span className="text-gray-600">•</span>
                              <span className="text-gray-400 text-xs font-normal capitalize">{a.channel_product_type}</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-300 mt-2 line-clamp-2 leading-relaxed">
                            {a.prompt_alerta}
                          </div>
                          <div className="flex items-center gap-2 mt-3 text-xs text-gray-500 font-mono bg-black/20 w-fit px-2 py-1 rounded">
                            <FiClock size={12} />
                            <span>
                              Inicio: {a.fecha_inicio ? new Date(a.fecha_inicio).toLocaleString() : '-'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(a)}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
                            title="Editar"
                          >
                            <FiEdit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(a)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20"
                            title="Eliminar"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <AnimatePresence>
              {formOpen && (
                <motion.div
                  className="border-t border-white/10 p-6 bg-[#0a0a0a]"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Frecuencia</label>
                      <select
                        value={formData.codigo_cron}
                        onChange={(e) => setFormData({ ...formData, codigo_cron: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                      >
                        {FREQUENCY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Canal</label>
                      <select
                        value={formData.channel_product_type}
                        onChange={(e) => setFormData({ ...formData, channel_product_type: e.target.value as any })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                      >
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Inicio (Fecha/Hora)</label>
                      <input
                        type="datetime-local"
                        value={formData.fecha_inicio_local}
                        onChange={(e) => setFormData({ ...formData, fecha_inicio_local: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all [color-scheme:dark]"
                      />
                    </div>

                    <div className="flex items-end pb-3">
                      <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer p-2 rounded-lg hover:bg-white/5 w-full transition-colors">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/20 bg-white/5 checked:border-blue-500 checked:bg-blue-600 transition-all"
                            checked={formData.flg_habilitado}
                            onChange={() => setFormData({ ...formData, flg_habilitado: !formData.flg_habilitado })}
                          />
                          <FiCheckCircle className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                        </div>
                        <span className="font-medium">Habilitar alerta inmediatamente</span>
                      </label>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Prompt de la alerta</label>
                      <textarea
                        rows={4}
                        value={formData.prompt_alerta}
                        onChange={(e) => setFormData({ ...formData, prompt_alerta: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none placeholder-gray-600"
                        placeholder="Describe qué información quieres monitorear..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                    <button
                      onClick={() => {
                        setFormOpen(false);
                        setEditingAlert(null);
                      }}
                      className="px-4 py-2 border border-white/10 text-gray-300 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-900/20 transition-all"
                    >
                      {loading ? 'Guardando...' : 'Guardar Alerta'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
