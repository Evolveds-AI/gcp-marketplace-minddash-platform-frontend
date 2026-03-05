'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import {
  FiVolume2,
  FiPlus,
  FiEdit3,
  FiX,
  FiUser,
  FiMail,
  FiClock,
  FiCalendar,
  FiBellOff,
  FiCheckCircle,
  FiXCircle,
  FiTrash2,
  FiPlay,
  FiZap
} from '@/lib/icons';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { backendClient } from '@/lib/api/backend-client';
import { v4 as uuidv4 } from 'uuid';
import ModalPortal from '@/components/ui/ModalPortal';
import { useThemeMode } from '@/hooks/useThemeMode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableColumn, useSortableTable } from './SortableTableHeader';
import { StatusBadge, getLifecycleVariant } from './StatusBadge';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.9.81 2.033c.102.134 1.382 2.109 3.35 2.955.467.202.831.322 1.114.41.469.15.895.129 1.232.078.376-.056 1.17-.478 1.335-.94.165-.463.165-.859.115-.94-.05-.085-.182-.133-.38-.232" />
  </svg>
);

interface ChatbotAlertsProps {
  chatbotId: string;
  chatbotName: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface Alert {
  id: string;
  product_id: string;
  prompt_alerta: string;
  codigo_cron: string;
  user_id: string;
  user_email?: string;
  session_id: string;
  channel_product_type: 'email' | 'whatsapp';
  flg_habilitado: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  created_at?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
}

// Opciones de frecuencia amigables (sin mostrar CRON al usuario)
const FREQUENCY_OPTIONS = [
  { label: 'Cada hora', value: '0 * * * *', shortLabel: 'Cada hora', icon: '🕐' },
  { label: 'Cada 2 horas', value: '0 */2 * * *', shortLabel: 'Cada 2h', icon: '🕑' },
  { label: 'Cada 4 horas', value: '0 */4 * * *', shortLabel: 'Cada 4h', icon: '🕓' },
  { label: 'Cada 6 horas', value: '0 */6 * * *', shortLabel: 'Cada 6h', icon: '🕕' },
  { label: 'Cada 12 horas', value: '0 */12 * * *', shortLabel: 'Cada 12h', icon: '🕛' },
  { label: 'Diario a las 8:00 AM', value: '0 8 * * *', shortLabel: 'Diario 8am', icon: '☀️' },
  { label: 'Diario a las 9:00 AM', value: '0 9 * * *', shortLabel: 'Diario 9am', icon: '☀️' },
  { label: 'Diario a las 12:00 PM', value: '0 12 * * *', shortLabel: 'Diario 12pm', icon: '🌞' },
  { label: 'Diario a las 6:00 PM', value: '0 18 * * *', shortLabel: 'Diario 6pm', icon: '🌅' },
  { label: 'Lunes a Viernes 9:00 AM', value: '0 9 * * 1-5', shortLabel: 'Lun-Vie 9am', icon: '📅' },
  { label: 'Cada Lunes 9:00 AM', value: '0 9 * * 1', shortLabel: 'Semanal', icon: '📆' },
];

// Obtener descripción amigable de la frecuencia
const getFrequencyLabel = (cronValue: string): string => {
  const option = FREQUENCY_OPTIONS.find(opt => opt.value === cronValue);
  return option?.shortLabel || 'Personalizado';
};

// Calcular fecha fin basada en fecha inicio, frecuencia y cantidad máxima de ejecuciones (máximo 5)
const calculateEndDate = (startDate: string, cronExpression: string, executions: number = 5): string => {
  const start = new Date(startDate);

  const parts = cronExpression.split(' ');
  const minuteField = parts[0];
  const hourField = parts[1];

  const maxExec = Math.min(Math.max(executions, 1), 5);

  // Por defecto, asumir una ejecución por día
  let daysToAdd = maxExec;

  // Patrones basados en minutos u horas (*/N)
  if (minuteField?.includes('*/')) {
    const minutesInterval = parseInt(minuteField.replace('*/', ''));
    if (!isNaN(minutesInterval) && minutesInterval > 0) {
      const totalMinutes = minutesInterval * maxExec;
      daysToAdd = Math.ceil(totalMinutes / (60 * 24));
    }
  } else if (hourField?.includes('*/')) {
    const hoursInterval = parseInt(hourField.replace('*/', ''));
    if (!isNaN(hoursInterval) && hoursInterval > 0) {
      const totalHours = hoursInterval * maxExec;
      daysToAdd = Math.ceil(totalHours / 24);
    }
  } else if (parts[4] === '1') {
    // Semanal (ej: cada lunes)
    daysToAdd = maxExec * 7;
  } else if (parts[4] === '1-5') {
    // Lunes a viernes: aproximar a semanas laborales
    daysToAdd = Math.ceil((maxExec * 7) / 5);
  }

  const end = new Date(start);
  end.setDate(end.getDate() + daysToAdd);

  return end.toISOString();
};

const getAlertLifecycleStatus = (alert: Alert): 'PROGRAMADA' | 'ACTIVA' | 'EXPIRADA' | 'PAUSADA' => {
  const now = new Date();
  const start = alert.fecha_inicio ? new Date(alert.fecha_inicio) : null;
  const end = alert.fecha_fin ? new Date(alert.fecha_fin) : null;

  if (!alert.flg_habilitado) {
    return 'PAUSADA';
  }

  if (end && end.getTime() < now.getTime()) {
    return 'EXPIRADA';
  }

  if (start && start.getTime() > now.getTime()) {
    return 'PROGRAMADA';
  }

  return 'ACTIVA';
};

export default function ChatbotAlerts({ chatbotId, chatbotName, showNotification }: ChatbotAlertsProps) {
  const pathname = usePathname();
  const { applyThemeClass } = useThemeMode();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [saving, setSaving] = useState(false);
  const [executingAll, setExecutingAll] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const [statusFilter, setStatusFilter] = useState<'all' | 'activa' | 'pausada' | 'expirada' | 'programada'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'whatsapp'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const { sortedData: sortedAlerts, sortKey: alertSortKey, sortDirection: alertSortDir, handleSort: handleAlertSort } = useSortableTable<Alert>(alerts);

  // Form state
  const [formData, setFormData] = useState({
    user_id: '',
    prompt_alerta: '',
    codigo_cron: '0 8 * * *',
    channel_product_type: 'email' as 'email' | 'whatsapp',
    flg_habilitado: true,
    fecha_inicio: new Date().toISOString().split('T')[0],
    hora_inicio: '09:00',
    max_ejecuciones: 5,
    subject_email: '',
  });

  useEffect(() => {
    loadData();
  }, [chatbotId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }
      
      const { accessToken: token } = JSON.parse(authData);

      // Cargar alertas del producto (con token via proxy)
      try {
        const res = await fetch(`/api/backend/alerts?product_id=${encodeURIComponent(chatbotId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Error al obtener alertas');
        const alertsList = Array.isArray(json?.data) ? json.data : [];
        setAlerts(alertsList);
      } catch (error) {
        console.log('No se pudieron cargar alertas:', error);
        setAlerts([]);
      }

      // Cargar usuarios disponibles (incluye número de WhatsApp)
      const usersRes = await fetch('/api/admin-client/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        const rawUsers = Array.isArray(data.users) ? data.users : [];
        const mappedUsers: User[] = rawUsers.map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          phoneNumber: u.phone_number || '',
        }));
        setUsers(mappedUsers);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSendFromForm = async () => {
    const user = users.find((u) => u.id === formData.user_id);
    if (!user) {
      toast.error('Debes seleccionar un usuario válido para enviar la prueba');
      return;
    }

    try {
      if (formData.channel_product_type === 'email') {
        if (!user.email) {
          toast.error('El usuario seleccionado no tiene email configurado');
          return;
        }

        const subject = formData.subject_email?.trim() || `Prueba de alerta - ${chatbotName}`;
        const payload: any = {
          alert_type: 'email',
          subject,
          html_body: `<p>Esta es una prueba de la alerta configurada para <strong>${chatbotName}</strong>.</p><p><strong>Prompt:</strong></p><pre>${formData.prompt_alerta}</pre>`,
          recipients: {
            to: [user.email],
            cc: [],
            bcc: [],
          },
        };

        const res = await backendClient.sendAlert(payload);
        const status = res?.status ?? 'success';
        const message = res?.message ?? 'Alerta enviada para prueba';

        if (status === 'success') {
          toast.success(message);
        } else {
          toast.error(message);
        }
      } else if (formData.channel_product_type === 'whatsapp') {
        const phone = user.phoneNumber?.trim();
        if (!phone) {
          toast.error('El usuario seleccionado no tiene número de WhatsApp configurado');
          return;
        }

        const messageContent = `Prueba de alerta para ${chatbotName}\n\nPrompt:\n${formData.prompt_alerta}`;
        const payload: any = {
          alert_type: 'whatsapp',
          message_content_wsp: messageContent,
          message_sender_wsp: user.username || user.email,
          message_phone_number_wsp: phone,
        };

        const res = await backendClient.sendAlert(payload);
        const status = res?.status ?? 'success';
        const message = res?.message ?? 'Alerta de WhatsApp enviada para prueba';

        if (status === 'success') {
          toast.success(message);
        } else {
          toast.error(message);
        }
      } else {
        toast.info('Tipo de canal no soportado para pruebas manuales');
      }
    } catch (error: any) {
      console.error('Error al enviar prueba de alerta:', error);
      toast.error(error?.message || 'No se pudo enviar la alerta de prueba');
    }
  };

  const handleTestSend = async (alert: Alert) => {
    const user = users.find((u) => u.id === alert.user_id);
    if (!user) {
      toast.error('No se encontró el usuario asignado a esta alerta');
      return;
    }

    try {
      if (alert.channel_product_type === 'email') {
        if (!user.email) {
          toast.error('El usuario asignado no tiene email configurado');
          return;
        }

        const payload: any = {
          alert_type: 'email',
          subject: `Prueba de alerta - ${chatbotName}`,
          html_body: `<p>Esta es una prueba de la alerta configurada para <strong>${chatbotName}</strong>.</p><p><strong>Prompt:</strong></p><pre>${alert.prompt_alerta}</pre>`,
          recipients: {
            to: [user.email],
            cc: [],
            bcc: [],
          },
        };

        const res = await backendClient.sendAlert(payload);
        const status = res?.status ?? 'success';
        const message = res?.message ?? 'Alerta enviada para prueba';

        if (status === 'success') {
          toast.success(message);
        } else {
          toast.error(message);
        }
      } else if (alert.channel_product_type === 'whatsapp') {
        const phone = user.phoneNumber?.trim();
        if (!phone) {
          toast.error('El usuario asignado no tiene número de WhatsApp configurado');
          return;
        }

        const messageContent = `Prueba de alerta para ${chatbotName}\n\nPrompt:\n${alert.prompt_alerta}`;
        const payload: any = {
          alert_type: 'whatsapp',
          message_content_wsp: messageContent,
          message_sender_wsp: user.username || user.email,
          message_phone_number_wsp: phone,
        };

        const res = await backendClient.sendAlert(payload);
        const status = res?.status ?? 'success';
        const message = res?.message ?? 'Alerta de WhatsApp enviada para prueba';

        if (status === 'success') {
          toast.success(message);
        } else {
          toast.error(message);
        }
      } else {
        toast.info('Tipo de canal no soportado para pruebas manuales');
      }
    } catch (error: any) {
      console.error('Error al enviar prueba de alerta:', error);
      toast.error(error?.message || 'No se pudo enviar la alerta de prueba');
    }
  };

  const handleDuplicate = (alert: Alert) => {
    setEditingAlert(null);
    setFormData({
      user_id: alert.user_id,
      prompt_alerta: alert.prompt_alerta,
      codigo_cron: alert.codigo_cron,
      channel_product_type: alert.channel_product_type,
      flg_habilitado: alert.flg_habilitado,
      fecha_inicio: new Date().toISOString().split('T')[0],
      hora_inicio: '09:00',
      max_ejecuciones: 5,
      subject_email: '',
    });
    setShowModal(true);
  };

  const handleExecuteAllAlerts = async () => {
    try {
      setExecutingAll(true);
      const res: any = await backendClient.executeAlerts();
      const message = res?.message || 'Ejecución de alertas iniciada en segundo plano';
      toast.success(message);
    } catch (error: any) {
      console.error('Error al ejecutar alertas:', error);
      toast.error(error?.message || 'No se pudo ejecutar las alertas programadas');
    } finally {
      setExecutingAll(false);
    }
  };

  const handleOpenModal = (alert?: Alert) => {
    if (alert) {
      setEditingAlert(alert);
      let hora_inicio = '09:00';
      try {
        const dt = new Date(alert.fecha_inicio);
        const h = String(dt.getHours()).padStart(2, '0');
        const m = String(dt.getMinutes()).padStart(2, '0');
        hora_inicio = `${h}:${m}`;
      } catch {
        hora_inicio = '09:00';
      }

      setFormData({
        user_id: alert.user_id,
        prompt_alerta: alert.prompt_alerta,
        codigo_cron: alert.codigo_cron,
        channel_product_type: alert.channel_product_type,
        flg_habilitado: alert.flg_habilitado,
        fecha_inicio: alert.fecha_inicio.split('T')[0],
        hora_inicio,
        max_ejecuciones: 5,
        subject_email: '',
      });
    } else {
      setEditingAlert(null);
      setFormData({
        user_id: '',
        prompt_alerta: '',
        codigo_cron: '0 8 * * *',
        channel_product_type: 'email',
        flg_habilitado: true,
        fecha_inicio: new Date().toISOString().split('T')[0],
        hora_inicio: '09:00',
        max_ejecuciones: 5,
        subject_email: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAlert(null);
  };

  const validateForm = (): boolean => {
    if (!formData.user_id) {
      toast.error('Debes seleccionar un usuario');
      return false;
    }
    if (!formData.prompt_alerta.trim()) {
      toast.error('El prompt de alerta es requerido');
      return false;
    }
    if (formData.prompt_alerta.length > 1500) {
      toast.error('El prompt no puede exceder 1500 caracteres');
      return false;
    }

    // Validar máximo 3 alertas por usuario (solo para nuevas alertas)
    if (!editingAlert) {
      const userAlerts = alerts.filter(a => a.user_id === formData.user_id);
      if (userAlerts.length >= 3) {
        toast.error('El usuario ya tiene el máximo de 3 alertas permitidas');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }

      const { accessToken: token } = JSON.parse(authData);

      const payloadBase = {
        product_id: chatbotId,
        prompt_alerta: formData.prompt_alerta,
        codigo_cron: formData.codigo_cron,
        user_id: formData.user_id,
        channel_product_type: formData.channel_product_type,
        flg_habilitado: formData.flg_habilitado,
        fecha_inicio: new Date(`${formData.fecha_inicio}T${formData.hora_inicio}:00`).toISOString(),
        fecha_fin: calculateEndDate(
          new Date(`${formData.fecha_inicio}T${formData.hora_inicio}:00`).toISOString(),
          formData.codigo_cron,
          formData.max_ejecuciones
        ),
        subject_email: formData.subject_email?.trim() || '',
      };

      const url = '/api/backend/alerts';
      const method = editingAlert ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingAlert ? { ...payloadBase, id: editingAlert.id } : payloadBase),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'No se pudo guardar la alerta');

      toast.success(editingAlert ? 'Alerta actualizada' : 'Alerta creada');
      setShowModal(false);
      setEditingAlert(null);
      await loadData();
    } catch (error: any) {
      console.error('Error guardando alerta:', error);
      toast.error(error?.message || 'No se pudo guardar la alerta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      const confirmed = await confirm({
        title: 'Eliminar alerta',
        description: '¿Estás seguro de eliminar esta alerta? Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'destructive',
      });
      if (!confirmed) return;

      setSaving(true);

      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }

      const { accessToken: token } = JSON.parse(authData);

      const res = await fetch('/api/backend/alerts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: alertId, product_id: chatbotId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'No se pudo eliminar la alerta');

      toast.success('Alerta eliminada');
      await loadData();
    } catch (error: any) {
      console.error('Error eliminando alerta:', error);
      toast.error(error.message || 'Error al eliminar la alerta');
    }
  };

  const handleToggleEnabled = async (alert: Alert) => {
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }
      const { accessToken: token } = JSON.parse(authData);

      const res = await fetch('/api/backend/alerts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: alert.id,
          product_id: alert.product_id,
          flg_habilitado: !alert.flg_habilitado,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'No se pudo actualizar la alerta');

      toast.success('Alerta actualizada');
      await loadData();
    } catch (error: any) {
      console.error('Error al actualizar alerta:', error);
      toast.error(error?.message || 'No se pudo actualizar la alerta');
    }
  };

  const getUserEmail = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    return user?.email || userId;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  let previewStartLabel: string | null = null;
  let previewEndLabel: string | null = null;
  try {
    if (formData.fecha_inicio) {
      const startIso = new Date(`${formData.fecha_inicio}T${formData.hora_inicio || '00:00'}:00`).toISOString();
      previewStartLabel = formatDate(startIso);
      const endIso = calculateEndDate(startIso, formData.codigo_cron, formData.max_ejecuciones);
      previewEndLabel = formatDate(endIso);
    }
  } catch {
    previewStartLabel = null;
    previewEndLabel = null;
  }

  const selectedUser = users.find((u) => u.id === formData.user_id);
  const modalLifecycle = editingAlert ? getAlertLifecycleStatus(editingAlert) : null;
  const modalLifecycleLabel = modalLifecycle === 'ACTIVA'
    ? 'Activa'
    : modalLifecycle === 'PROGRAMADA'
    ? 'Programada'
    : modalLifecycle === 'PAUSADA'
    ? 'Pausada'
    : modalLifecycle === 'EXPIRADA'
    ? 'Expirada'
    : null;

  const filteredAlerts = sortedAlerts.filter((alert) => {
    if (userFilter !== 'all' && alert.user_id !== userFilter) return false;
    if (channelFilter !== 'all' && alert.channel_product_type !== channelFilter) return false;

    if (statusFilter !== 'all') {
      const lifecycle = getAlertLifecycleStatus(alert);

      if (
        (statusFilter === 'activa' && lifecycle !== 'ACTIVA') ||
        (statusFilter === 'pausada' && lifecycle !== 'PAUSADA') ||
        (statusFilter === 'expirada' && lifecycle !== 'EXPIRADA') ||
        (statusFilter === 'programada' && lifecycle !== 'PROGRAMADA')
      ) {
        return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Alertas Programadas</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Recibe notificaciones automáticas basadas en tus datos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExecuteAllAlerts}
            disabled={executingAll}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            title="Ejecutar todas las alertas programadas (usa el mismo endpoint que el scheduler)"
          >
            {executingAll ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-transparent" />
            ) : (
              <FiZap className="w-4 h-4 text-yellow-400" />
            )}
            <span>Ejecutar ahora</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-xs text-white transition-all shadow-md shadow-blue-900/30"
          >
            <FiPlus className="w-4 h-4" />
            <span>Nueva Alerta</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={(next) => setStatusFilter(next as any)}>
            <SelectTrigger className="h-8 w-[170px] bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="activa">Activas</SelectItem>
              <SelectItem value="programada">Programadas</SelectItem>
              <SelectItem value="pausada">Pausadas</SelectItem>
              <SelectItem value="expirada">Expiradas</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={channelFilter}
            onValueChange={(next) => setChannelFilter(next as 'all' | 'email' | 'whatsapp')}
          >
            <SelectTrigger className="h-8 w-[170px] bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <SelectItem value="all">Todos los canales</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>

          <Select value={userFilter} onValueChange={(next) => setUserFilter(next)}>
            <SelectTrigger className="h-8 w-[220px] bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <SelectItem value="all">Todos los usuarios</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla de alertas */}
      <div
        className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-minddash-surface"
      >
        <table className="w-full text-left text-sm text-gray-700 dark:text-gray-400">
          <thead className="bg-gray-50 dark:bg-minddash-elevated text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider">
            <tr>
              <SortableColumn label="Descripción" sortKey="prompt_alerta" currentSortKey={alertSortKey} currentDirection={alertSortDir} onSort={handleAlertSort} className="py-4" />
              <SortableColumn label="Frecuencia" sortKey="codigo_cron" currentSortKey={alertSortKey} currentDirection={alertSortDir} onSort={handleAlertSort} className="py-4" />
              <SortableColumn label="Canal" sortKey="channel_product_type" currentSortKey={alertSortKey} currentDirection={alertSortDir} onSort={handleAlertSort} className="py-4" />
              <SortableColumn label="Estado" sortKey="flg_habilitado" currentSortKey={alertSortKey} currentDirection={alertSortDir} onSort={handleAlertSort} className="py-4" />
              <SortableColumn label="Usuario" sortKey="user_email" currentSortKey={alertSortKey} currentDirection={alertSortDir} onSort={handleAlertSort} className="py-4" />
              <SortableColumn label="Vigencia" sortKey="fecha_inicio" currentSortKey={alertSortKey} currentDirection={alertSortDir} onSort={handleAlertSort} className="py-4" />
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-gray-100 dark:bg-minddash-elevated/50 rounded-full mb-4">
                      <FiBellOff className="w-12 h-12 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-300 mb-2">
                      Sin alertas configuradas
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm">
                      Configura alertas para recibir notificaciones automáticas por email o WhatsApp
                    </p>
                    <button 
                      onClick={() => handleOpenModal()}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-900/30"
                    >
                      <FiPlus className="w-4 h-4" />
                      <span>Crear primera alerta</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAlerts.map((alert, index) => {
                const lifecycle = getAlertLifecycleStatus(alert);

                const statusLabel =
                  lifecycle === 'ACTIVA' ? 'Activa'
                  : lifecycle === 'PROGRAMADA' ? 'Programada'
                  : lifecycle === 'PAUSADA' ? 'Pausada'
                  : lifecycle === 'EXPIRADA' ? 'Expirada'
                  : '';

                return (
                  <motion.tr
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-minddash-elevated transition-colors"
                  >
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {alert.prompt_alerta.length > 50 
                          ? `${alert.prompt_alerta.substring(0, 50)}...` 
                          : alert.prompt_alerta}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 border border-purple-200 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700/50 dark:text-purple-300 rounded-lg text-xs font-medium">
                      <FiClock className="w-3 h-3" />
                      {getFrequencyLabel(alert.codigo_cron)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                      alert.channel_product_type === 'email'
                        ? 'bg-blue-100 border border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300'
                        : 'bg-green-100 border border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700/50 dark:text-green-300'
                    }`}>
                      {alert.channel_product_type === 'email' ? (
                        <><FiMail className="w-3 h-3" /> Email</>
                      ) : (
                        <><WhatsAppIcon className="w-3 h-3 text-green-800 dark:text-white" /> WhatsApp</>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleEnabled(alert)}
                      className="transition-opacity hover:opacity-80"
                    >
                      <StatusBadge variant={getLifecycleVariant(lifecycle)} dot>
                        {statusLabel}
                      </StatusBadge>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700 dark:text-gray-300 text-xs">{getUserEmail(alert.user_id)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs">
                      <p className="text-gray-600 dark:text-gray-400">{formatDate(alert.fecha_inicio)}</p>
                      <p className="text-gray-500">→ {formatDate(alert.fecha_fin)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {(alert.channel_product_type === 'email' || alert.channel_product_type === 'whatsapp') && (
                        <button
                          onClick={() => handleTestSend(alert)}
                          className={
                            alert.channel_product_type === 'email'
                              ? 'p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 rounded-lg transition-colors'
                              : 'p-2 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded-lg transition-colors'
                          }
                          title={
                            alert.channel_product_type === 'email'
                              ? 'Probar ahora por Email (enviar una vez)'
                              : 'Probar ahora por WhatsApp (enviar una vez)'
                          }
                        >
                          <FiPlay className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenModal(alert)}
                        className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        title="Ver/Editar"
                      >
                        <FiEdit3 className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(alert.id)}
                        className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                        title="Eliminar"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Información sobre reglas */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FiVolume2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Reglas de Alertas</h4>
            <ul className="text-xs text-gray-700 dark:text-gray-400 space-y-1">
              <li>• Máximo 3 alertas por usuario</li>
              <li>• Frecuencia mínima: 60 minutos entre ejecuciones</li>
              <li>• Máximo 5 ejecuciones por alerta</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de creación/edición */}
      <ModalPortal>
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
              onClick={handleCloseModal}
            >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-minddash-elevated border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingAlert ? 'Editar Alerta' : 'Nueva Alerta'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido del modal */}
              <div className="p-6 space-y-5">
                {/* Usuario asignado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FiUser className="inline w-4 h-4 mr-2" />
                    Usuario asignado
                  </label>
                  <Select
                    value={formData.user_id || undefined}
                    onValueChange={(next) => setFormData({ ...formData, user_id: next })}
                  >
                    <SelectTrigger className="w-full bg-white dark:bg-minddash-elevated/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                      <SelectValue placeholder="Seleccionar usuario..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email} ({user.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.user_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Este usuario tiene {alerts.filter((a) => a.user_id === formData.user_id).length} de 3 alertas configuradas.
                    </p>
                  )}
                </div>

                {/* Prompt de alerta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prompt de alerta
                  </label>
                  <textarea
                    value={formData.prompt_alerta}
                    onChange={(e) => setFormData({ ...formData, prompt_alerta: e.target.value })}
                    placeholder="Ej: Dame el top 10 de ventas por mes cuando el total supere $10,000"
                    rows={4}
                    maxLength={1500}
                    className="w-full bg-white dark:bg-minddash-elevated/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 px-4 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.prompt_alerta.length}/1500 caracteres
                  </p>
                </div>

                {/* Frecuencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FiClock className="inline w-4 h-4 mr-2" />
                    Frecuencia
                  </label>
                  <Select
                    value={formData.codigo_cron}
                    onValueChange={(next) => setFormData({ ...formData, codigo_cron: next })}
                  >
                    <SelectTrigger className="w-full bg-white dark:bg-minddash-elevated/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                      <SelectValue placeholder="Seleccionar…" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                      {FREQUENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de alerta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Canal de notificación
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, channel_product_type: 'email' })}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        formData.channel_product_type === 'email'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-minddash-elevated/30 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        formData.channel_product_type === 'email' ? 'bg-blue-600' : 'bg-gray-700'
                      }`}>
                        <FiMail className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className={`font-medium ${
                          formData.channel_product_type === 'email' ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}>Email</p>
                        <p className="text-xs text-gray-500">Correo electrónico</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, channel_product_type: 'whatsapp' })}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        formData.channel_product_type === 'whatsapp'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-minddash-elevated/30 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        formData.channel_product_type === 'whatsapp' ? 'bg-green-600' : 'bg-gray-700'
                      }`}>
                        <WhatsAppIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className={`font-medium ${
                          formData.channel_product_type === 'whatsapp' ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}>WhatsApp</p>
                        <p className="text-xs text-gray-500">Mensaje directo</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Fecha y hora de inicio + duración */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <FiCalendar className="inline w-4 h-4 mr-2" />
                    Fecha y hora de inicio
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-white dark:bg-minddash-elevated/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors"
                    />
                    <input
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      className="w-full bg-white dark:bg-minddash-elevated/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Cantidad máxima de ejecuciones (1 a 5)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={formData.max_ejecuciones}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        const clamped = isNaN(raw) ? 1 : Math.min(5, Math.max(1, raw));
                        setFormData({ ...formData, max_ejecuciones: clamped });
                      }}
                      className="w-24 bg-white dark:bg-minddash-elevated/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 text-sm"
                    />
                  </div>
                  {previewStartLabel && previewEndLabel && (
                    <p className="text-xs text-gray-500 mt-1">
                      Esta alerta se ejecutará hasta {formData.max_ejecuciones} veces, desde {previewStartLabel} hasta {previewEndLabel} (aprox.).
                    </p>
                  )}
                </div>

                {/* Habilitado */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Habilitar alerta
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, flg_habilitado: !formData.flg_habilitado })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.flg_habilitado ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.flg_habilitado ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Resumen */}
                <div className="mt-4 border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/40 text-xs text-gray-700 dark:text-gray-300 space-y-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-200">Resumen</p>
                  <p>Usuario: {selectedUser ? selectedUser.email : 'Sin seleccionar'}</p>
                  <p>Canal: {formData.channel_product_type === 'email' ? 'Email' : 'WhatsApp'}</p>
                  <p>Frecuencia: {getFrequencyLabel(formData.codigo_cron)}</p>
                  {previewStartLabel && previewEndLabel && (
                    <p>Vigencia estimada: {previewStartLabel} → {previewEndLabel} ({formData.max_ejecuciones} ejecuciones máx.)</p>
                  )}
                </div>
              </div>

              {/* Footer del modal */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestSendFromForm}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                      formData.channel_product_type === 'email'
                        ? 'border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-900/30'
                        : 'border-green-400 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30'
                    }`}
                  >
                    {formData.channel_product_type === 'email' ? (
                      <FiMail className="w-3.5 h-3.5" />
                    ) : (
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                    )}
                    <span>
                      Probar ahora {formData.channel_product_type === 'email' ? 'por Email' : 'por WhatsApp'}
                    </span>
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
                  >
                    <FiX className="w-3.5 h-3.5" />
                    <span>Cancelar</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>{editingAlert ? 'Actualizar' : 'Crear Alerta'}</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {ConfirmDialog}
    </motion.div>
  );
}
