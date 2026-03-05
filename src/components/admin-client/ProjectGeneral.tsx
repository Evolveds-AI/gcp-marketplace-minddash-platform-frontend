'use client';

import { useState, useEffect, useRef } from 'react';
import type { ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Bot,
  Check,
  Copy,
  Globe,
  Link,
  MessageCircle,
  Plus,
  Slack,
  Users,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import ModalPortal from '@/components/ui/ModalPortal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type IconComponent = ComponentType<{ className?: string }>;

const WhatsAppIcon: IconComponent = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M16.003 3C9.373 3 4 8.373 4 15.003c0 2.395.676 4.689 1.957 6.705L4 29l7.48-1.953a12 12 0 0 0 4.523.87h.001c6.63 0 12.003-5.373 12.003-12.002C28.007 8.373 22.633 3 16.003 3Zm6.94 17.229c-.294.827-1.71 1.588-2.38 1.653-.608.059-1.37.084-2.21-.14-.508-.132-1.162-.38-2.006-.741-3.532-1.533-5.83-5.122-6.006-5.363-.176-.24-1.436-1.91-1.436-3.64 0-1.73.913-2.58 1.235-2.937.322-.357.7-.446.936-.446.235 0 .468.003.674.012.217.01.507-.082.794.606.294.71 1.002 2.457 1.09 2.637.088.18.146.39.029.63-.117.24-.176.39-.351.599-.176.21-.37.468-.53.629-.176.176-.36.368-.154.723.205.355.91 1.5 1.954 2.427 1.343 1.198 2.474 1.575 2.83 1.75.356.176.56.147.764-.088.205-.235.88-1.025 1.115-1.378.234-.352.47-.293.794-.176.322.117 2.068.974 2.427 1.15.357.176.588.264.676.41.088.147.088.849-.206 1.676Z" />
  </svg>
);

interface ProjectGeneralProps {
  projectId: string;
  projectName: string;
}

interface ChatbotStats {
  total_connections: number;
  users_assigned: number;
  messages_per_month: number;
  channel_count: number;
}

interface ChatbotChannel {
  id: string;
  channel_id?: string | null;
  channel_product_type?: string | null;
  name: string | null;
  description: string | null;
  configuration?: any | null;
}

interface ChatbotData {
  id: string;
  name: string;
  description: string | null;
  tipo: string | null;
  language: string | null;
  welcome_message: string | null;
  label?: string | null;
  label_color?: string | null;
  max_users?: number | null;
  is_active_rag?: boolean;
  is_active_alerts?: boolean;
  is_active_insight?: boolean;
  stats?: ChatbotStats;
  channels?: ChatbotChannel[];
}

const defaultStats: ChatbotStats = {
  total_connections: 0,
  users_assigned: 0,
  messages_per_month: 0,
  channel_count: 0,
};

const LABEL_COLORS = [
  { name: 'Azul', value: 'blue', hex: '#3b82f6' },
  { name: 'Verde', value: 'green', hex: '#22c55e' },
  { name: 'Rojo', value: 'red', hex: '#ef4444' },
  { name: 'Amarillo', value: 'yellow', hex: '#eab308' },
  { name: 'Morado', value: 'purple', hex: '#a855f7' },
  { name: 'Rosa', value: 'pink', hex: '#ec4899' },
  { name: 'Gris', value: 'gray', hex: '#9ca3af' },
];

const DEFAULT_WELCOME_MESSAGE = '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?';

const PRODUCT_TYPES = [
  { value: 'chatbot', label: 'Chatbot conversacional' },
  { value: 'api', label: 'Servicio API' },
  { value: 'web', label: 'Aplicación web' },
];

const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español (es)' },
];

const MAX_USERS_LIMIT = 10000;

type ChannelType = 'web' | 'whatsapp' | 'teams' | 'email' | 'slack' | 'other';

const WHATSAPP_WEBHOOK_BASE_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_WEBHOOK_BASE_URL ||
  'https://wsp-bot-bayer-dev-294493969622.us-central1.run.app/webhook/whatsapp';

const buildWhatsAppWebhookUrl = (channelProductId: string) =>
  `${WHATSAPP_WEBHOOK_BASE_URL}?channel_product_id=${encodeURIComponent(channelProductId)}`;

const maskSecretValue = (value?: string | null) => {
  if (!value) return '';
  const trimmed = String(value);
  if (trimmed.length <= 8) return '********';
  return `${trimmed.slice(0, 4)}********${trimmed.slice(-4)}`;
};

const getLabelColorClasses = (color: string) => {
  const colors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
    green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', dot: 'bg-green-500' },
    red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500' },
    pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30', dot: 'bg-pink-500' },
    gray: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', dot: 'bg-gray-500' },
  };
  return colors[color] || colors.blue;
};

export default function ProjectGeneral({ projectId, projectName }: ProjectGeneralProps) {
  const router = useRouter();
  const [chatbotData, setChatbotData] = useState<ChatbotData | null>(null);
  const [description, setDescription] = useState('');
  const [formState, setFormState] = useState({
    name: '',
    tipo: 'chatbot',
    language: 'es',
    label: '',
    labelColor: 'blue',
    welcomeMessage: DEFAULT_WELCOME_MESSAGE,
    maxUsers: '100',
    isActiveRag: false,
    isActiveAlerts: false,
    isActiveInsight: false,
  });
  const [initialFormState, setInitialFormState] = useState(formState);
  const [initialDescription, setInitialDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChatbotChannel | null>(null);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [savingChannelConfig, setSavingChannelConfig] = useState(false);
  const [channelModalStep, setChannelModalStep] = useState<1 | 2>(1);
  const [activeChannelProductId, setActiveChannelProductId] = useState<string | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const webhookCopiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<ChatbotChannel | null>(null);
  const [deletingChannel, setDeletingChannel] = useState(false);
  const [channelConfigForm, setChannelConfigForm] = useState({
    type: 'other' as ChannelType,
    is_active: true,
    webhook_url: '',
    phone_number: '',
    email: '',
    channel_id: '',
    notes: '',
    app_id: '',
    app_id_slack: '',
    app_pswd_slack: '',
    secret_pasword_id: '',
    jwtToken: '',
    numberId: '',
    verifyToken: '',
  });

  useEffect(() => {
    return () => {
      if (webhookCopiedTimeoutRef.current) {
        clearTimeout(webhookCopiedTimeoutRef.current);
        webhookCopiedTimeoutRef.current = null;
      }
    };
  }, []);

  // Detectar si hay cambios en el formulario
  const hasChanges = 
    description !== initialDescription ||
    JSON.stringify(formState) !== JSON.stringify(initialFormState);
  // Cargar datos del chatbot
  useEffect(() => {
    loadChatbotData();
  }, [projectId]);

  const loadChatbotData = async () => {
    try {
      setLoading(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }
      const { accessToken } = JSON.parse(authData);

      const response = await fetch(`/api/admin-client/chatbots/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success && data.chatbot) {
        setChatbotData(data.chatbot);
        const loadedDescription = data.chatbot.description || '';
        const loadedFormState = {
          name: data.chatbot.name || '',
          tipo: data.chatbot.tipo || 'chatbot',
          language: data.chatbot.language || 'es',
          label: data.chatbot.label || '',
          labelColor: data.chatbot.label_color || 'blue',
          welcomeMessage: data.chatbot.welcome_message || DEFAULT_WELCOME_MESSAGE,
          maxUsers:
            data.chatbot.max_users !== undefined && data.chatbot.max_users !== null
              ? String(data.chatbot.max_users)
              : '100',
          isActiveRag: Boolean(data.chatbot.is_active_rag),
          isActiveAlerts: Boolean(data.chatbot.is_active_alerts),
          isActiveInsight: Boolean(data.chatbot.is_active_insight),
        };
        setDescription(loadedDescription);
        setFormState(loadedFormState);
        setInitialDescription(loadedDescription);
        setInitialFormState(loadedFormState);
      } else {
        toast.error(data?.message || 'Error al cargar datos del chatbot');
        setChatbotData(null);
        setDescription('');
      }
    } catch (error) {
      toast.error('Error al cargar datos del chatbot');
      setChatbotData(null);
      setDescription('');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDescription = async () => {
    try {
      setSaving(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }
      const { accessToken } = JSON.parse(authData);

      let maxUsersNumber: number | undefined;
      const maxUsersTrimmed = formState.maxUsers.trim();

      if (maxUsersTrimmed) {
        const parsed = Number(maxUsersTrimmed);

        if (Number.isNaN(parsed) || parsed <= 0) {
          toast.error('Máx. usuarios debe ser un número mayor a 0');
          setSaving(false);
          return;
        }

        maxUsersNumber = Math.min(parsed, MAX_USERS_LIMIT);
      }

      const payload: Record<string, unknown> = {
        name: formState.name,
        description: description.trim(),
        tipo: formState.tipo || 'chatbot',
        language: formState.language || 'es',
        label: formState.label,
        label_color: formState.labelColor,
        welcome_message: formState.welcomeMessage,
        max_users: maxUsersNumber,
        is_active_rag: formState.isActiveRag,
        is_active_alerts: formState.isActiveAlerts,
        is_active_insight: formState.isActiveInsight,
      };

      const response = await fetch(`/api/admin-client/chatbots/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Descripción actualizada correctamente');
        await loadChatbotData();
      } else {
        toast.error(result.message || 'Error al actualizar descripción');
      }
    } catch (error) {
      toast.error('Error al guardar la descripción');
    } finally {
      setSaving(false);
    }
  };

  const getChannelType = (channelName?: string | null): ChannelType => {
    if (!channelName) return 'other';
    const normalized = channelName.toLowerCase();
    if (normalized.includes('web')) return 'web';
    if (normalized.includes('whatsapp')) return 'whatsapp';
    if (normalized.includes('teams') || normalized.includes('team')) return 'teams';
    if (normalized.includes('correo') || normalized.includes('email') || normalized.includes('mail')) return 'email';
    if (normalized.includes('slack')) return 'slack';
    return 'other';
  };

  const handleChannelClick = (channel: ChatbotChannel) => {
    const existingConfig = (channel.configuration as any) || {};
    const type = (existingConfig.type as ChannelType) || getChannelType(channel.name);

    if (type === 'web') {
      const chatbotId = chatbotData?.id;
      if (!chatbotId) {
        toast.error('No se encontró el ID del chatbot para redirigir.');
        return;
      }
      if (typeof window !== 'undefined') {
        window.open(`/chatbot/${chatbotId}`, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    setChannelConfigForm({
      type,
      is_active: existingConfig.is_active ?? true,
      webhook_url: existingConfig.webhook_url ?? '',
      phone_number: existingConfig.phone_number ?? '',
      email: existingConfig.email ?? '',
      channel_id: existingConfig.channel_id ?? channel.channel_id ?? '',
      notes: existingConfig.notes ?? '',
      app_id: existingConfig.app_id ?? '',
      app_id_slack: existingConfig.app_id_slack ?? '',
      app_pswd_slack: '',
      secret_pasword_id: '',
      jwtToken: existingConfig.jwtToken ?? '',
      numberId: existingConfig.numberId ?? '',
      verifyToken: existingConfig.verifyToken ?? '',
    });
    setSelectedChannel(channel);
    setChannelModalStep(1);
    setActiveChannelProductId(channel.id);
    setIsChannelModalOpen(true);
  };

  const handleCreateChannel = (type: ChannelType) => {
    setChannelConfigForm({
      type,
      is_active: true,
      webhook_url: '',
      phone_number: '',
      email: '',
      channel_id: '',
      notes: '',
      app_id: '',
      app_id_slack: '',
      app_pswd_slack: '',
      secret_pasword_id: '',
      jwtToken: '',
      numberId: '',
      verifyToken: '',
    });
    setSelectedChannel({
      id: 'new',
      name: type,
      description: null,
      configuration: {},
    });
    setChannelModalStep(1);
    setActiveChannelProductId(null);
    setIsChannelModalOpen(true);
  };

  const handleDeleteChannel = (channel: ChatbotChannel) => {
    setChannelToDelete(channel);
  };

  const confirmDeleteChannel = async () => {
    if (!chatbotData || !channelToDelete) {
      return;
    }

    try {
      setDeletingChannel(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }

      const { accessToken } = JSON.parse(authData);

      const response = await fetch(
        `/api/admin-client/chatbots/${chatbotData.id}/channels/${channelToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        toast.error(data?.message || 'Error al eliminar vínculo');
        return;
      }

      toast.success('Vínculo eliminado');
      if (selectedChannel?.id === channelToDelete.id) {
        setIsChannelModalOpen(false);
        setSelectedChannel(null);
      }
      setChannelToDelete(null);
      await loadChatbotData();
    } catch (error) {
      toast.error('Error al eliminar vínculo');
    } finally {
      setDeletingChannel(false);
    }
  };

  const handleCopyWebhook = async () => {
    if (!channelConfigForm.webhook_url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(channelConfigForm.webhook_url);
      setWebhookCopied(true);

      if (webhookCopiedTimeoutRef.current) {
        clearTimeout(webhookCopiedTimeoutRef.current);
      }

      webhookCopiedTimeoutRef.current = setTimeout(() => {
        setWebhookCopied(false);
      }, 1500);
    } catch {
      toast.error('No se pudo copiar el webhook');
    }
  };

  const handleSaveChannelConfig = async () => {
    if (!chatbotData || !selectedChannel) {
      return;
    }

    const selectedChannelConfig = (selectedChannel.configuration as any) || {};

    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      toast.error('Sesión expirada');
      return;
    }

    const { accessToken } = JSON.parse(authData);

    const ensureChannelProduct = async () => {
      if (selectedChannel.id !== 'new') {
        return selectedChannel.id;
      }

      const response = await fetch(`/api/admin-client/chatbots/${chatbotData.id}/channels`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: channelConfigForm.type }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || 'Error al crear vínculo');
      }

      const createdId = data?.channel?.id as string | undefined;
      if (!createdId) {
        throw new Error('No se pudo resolver el ID del vínculo');
      }

      setSelectedChannel((prev) =>
        prev
          ? {
              ...prev,
              id: createdId,
              name: data?.channel?.name ?? prev.name,
              description: data?.channel?.description ?? prev.description,
              configuration: data?.channel?.configuration ?? prev.configuration,
            }
          : prev
      );
      setActiveChannelProductId(createdId);
      return createdId;
    };

    if (channelConfigForm.type === 'whatsapp' && channelModalStep === 2) {
      const channelProductId =
        selectedChannel.id === 'new' ? activeChannelProductId : selectedChannel.id;

      if (!channelProductId) {
        toast.error('No se pudo resolver el ID del vínculo');
        return;
      }

      if (!channelConfigForm.jwtToken || !channelConfigForm.numberId || !channelConfigForm.verifyToken) {
        toast.error('Debes completar jwtToken, numberId y verifyToken');
        return;
      }

      try {
        setSavingChannelConfig(true);

        const webhookUrl = buildWhatsAppWebhookUrl(channelProductId);

        const configuration: Record<string, any> = {
          type: 'whatsapp',
          version: 'v20.0',
          jwtToken: channelConfigForm.jwtToken,
          numberId: channelConfigForm.numberId,
          verifyToken: channelConfigForm.verifyToken,
          is_active: channelConfigForm.is_active,
          phone_number: channelConfigForm.phone_number || null,
          webhook_url: webhookUrl,
          notes: channelConfigForm.notes || null,
        };

        const response = await fetch(
          `/api/admin-client/chatbots/${chatbotData.id}/channels/${channelProductId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ configuration }),
          }
        );

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) {
          toast.error(data?.message || 'Error al guardar configuración de WhatsApp');
          return;
        }

        toast.success('Configuración de WhatsApp lista. Webhook generado.');
        setIsChannelModalOpen(false);
        setSelectedChannel(null);
        setChannelModalStep(1);
        setActiveChannelProductId(null);
        await loadChatbotData();
      } catch (error) {
        toast.error('Error al guardar configuración de WhatsApp');
      } finally {
        setSavingChannelConfig(false);
      }

      return;
    }

    const slackPasswordValue = channelConfigForm.app_pswd_slack || selectedChannelConfig.app_pswd_slack;
    if (channelConfigForm.type === 'slack' && (!channelConfigForm.app_id_slack || !slackPasswordValue)) {
      toast.error('Debes completar App ID y App password de Slack');
      return;
    }

    const teamsSecretValue = channelConfigForm.secret_pasword_id || selectedChannelConfig.secret_pasword_id;
    if (channelConfigForm.type === 'teams' && (!channelConfigForm.app_id || !teamsSecretValue)) {
      toast.error('Debes completar App ID y Secret Password ID de Teams');
      return;
    }

    try {
      setSavingChannelConfig(true);

      const channelProductId = await ensureChannelProduct();

      const configuration: Record<string, any> = {
        type: channelConfigForm.type,
        is_active: channelConfigForm.is_active,
      };

      configuration.notes = channelConfigForm.notes || null;

      if (channelConfigForm.type === 'slack') {
        configuration.app_id_slack = channelConfigForm.app_id_slack;
        configuration.app_pswd_slack = slackPasswordValue;
        configuration.webhook_url = channelConfigForm.webhook_url || selectedChannelConfig.webhook_url || null;
      } else if (channelConfigForm.type === 'teams') {
        configuration.app_id = channelConfigForm.app_id;
        configuration.secret_pasword_id = teamsSecretValue;
        configuration.webhook_url = channelConfigForm.webhook_url || selectedChannelConfig.webhook_url || null;
      } else if (channelConfigForm.type === 'whatsapp') {
        configuration.version = 'v20.0';
        configuration.phone_number = channelConfigForm.phone_number || null;
        configuration.webhook_url = buildWhatsAppWebhookUrl(channelProductId);
      } else if (channelConfigForm.type === 'email') {
        configuration.email = channelConfigForm.email || null;
      } else {
        configuration.webhook_url = channelConfigForm.webhook_url || null;
        configuration.notes = channelConfigForm.notes || null;
      }

      const response = await fetch(
        `/api/admin-client/chatbots/${chatbotData.id}/channels/${channelProductId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ configuration }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        toast.error(data?.message || 'Error al guardar configuración del canal');
        return;
      }

      const returnedConfig = (data?.channel?.configuration as any) || null;
      if (returnedConfig) {
        setSelectedChannel((prev) =>
          prev
            ? {
                ...prev,
                configuration: returnedConfig,
              }
            : prev
        );
        if (returnedConfig.webhook_url) {
          setChannelConfigForm((prev) => ({ ...prev, webhook_url: returnedConfig.webhook_url }));
        }
      }

      if (channelConfigForm.type === 'whatsapp') {
        const webhookUrl = buildWhatsAppWebhookUrl(channelProductId);
        setActiveChannelProductId(channelProductId);
        setChannelConfigForm((prev) => ({ ...prev, webhook_url: webhookUrl }));
        setChannelModalStep(2);
        toast.success('Configuración guardada. Copia el webhook en el siguiente paso.');
        return;
      }

      await loadChatbotData();

      const shouldStayOpen =
        channelConfigForm.type === 'slack' ||
        channelConfigForm.type === 'teams' ||
        channelConfigForm.type === 'other';

      if (shouldStayOpen) {
        toast.success('Configuración del vínculo actualizada');
        return;
      }

      toast.success('Configuración del vínculo actualizada');
      setIsChannelModalOpen(false);
      setSelectedChannel(null);
      setChannelModalStep(1);
      setActiveChannelProductId(null);
    } catch (error) {
      toast.error('Error al guardar configuración del canal');
    } finally {
      setSavingChannelConfig(false);
    }
  };

  const stats = chatbotData?.stats ?? defaultStats;
  const channels = chatbotData?.channels ?? [];

  const hasWebChannel = channels.some((channel) => {
    const name = channel.name?.toLowerCase() || '';
    return name.includes('web');
  });

  const webChannel: ChatbotChannel = hasWebChannel
    ? (channels.find((channel) => getChannelType(channel.name) === 'web') as ChatbotChannel) || channels[0]
    : {
        id: 'web-default',
        name: 'Web',
        description: 'Canal web del chatbot',
        configuration: null,
      };

  const channelSlots: { type: ChannelType; label: string; description: string }[] = [
    { type: 'web', label: 'Web', description: 'Canal web del chatbot' },
    { type: 'whatsapp', label: 'WhatsApp', description: 'Canal de WhatsApp' },
    { type: 'email', label: 'Correo', description: 'Consultas y respuestas por correo electrónico' },
    { type: 'slack', label: 'Slack', description: 'Canal de conversación en Slack' },
    { type: 'teams', label: 'Microsoft Teams', description: 'Canal de conversación en Microsoft Teams' },
  ];

  const channelsByType: Partial<Record<ChannelType, ChatbotChannel>> = {};

  channels.forEach((channel) => {
    const type = getChannelType(channel.name);
    if (!channelsByType[type]) {
      channelsByType[type] = channel;
    }
  });

  const slotCards = channelSlots.map((slot) => {
    if (slot.type === 'web') {
      // Web channel is always considered active if it exists
      const webConfig = (webChannel.configuration as any) || {};
      return {
        key: webChannel.id,
        type: slot.type as ChannelType,
        isPlaceholder: false,
        channel: webChannel,
        label: webChannel.name ?? slot.label,
        description: webChannel.description ?? slot.description,
        isActive: webConfig.is_active !== false, // default to true for web
      };
    }

    const existing = channelsByType[slot.type];

    if (existing) {
      const existingConfig = (existing.configuration as any) || {};
      return {
        key: existing.id,
        type: slot.type as ChannelType,
        isPlaceholder: false,
        channel: existing,
        label: existing.name ?? slot.label,
        description: existing.description ?? slot.description,
        isActive: existingConfig.is_active === true,
      };
    }

    return {
      key: `slot-${slot.type}`,
      type: slot.type as ChannelType,
      isPlaceholder: true,
      channel: null as ChatbotChannel | null,
      label: slot.label,
      description: slot.description,
      isActive: false,
    };
  });

  const linkCards = slotCards;

  const formatNumber = (value: number) => value.toLocaleString('es-ES');

  const summaryCards = [
    {
      id: 'connections',
      label: 'Conexiones activas',
      value: stats.total_connections,
      caption: 'Conectores de datos disponibles',
      icon: Link,
      accent: 'text-indigo-400'
    },
    {
      id: 'users',
      label: 'Usuarios asignados',
      value: stats.users_assigned,
      caption: 'Usuarios con acceso al chatbot',
      icon: Users,
      accent: 'text-green-400'
    },
    {
      id: 'messages',
      label: 'Mensajes / mes',
      value: stats.messages_per_month,
      caption: 'Actividad mensual registrada',
      icon: MessageCircle,
      accent: 'text-emerald-400'
    },
    {
      id: 'channels',
      label: 'Canales configurados',
      value: stats.channel_count,
      caption: 'Integraciones para contactar usuarios',
      icon: Globe,
      accent: 'text-blue-400'
    },
  ];

  const getChannelIcon = (channelName?: string | null) => {
    if (!channelName) return Globe;
    const normalized = channelName.toLowerCase();
    if (normalized.includes('whatsapp')) return WhatsAppIcon;
    if (normalized.includes('slack')) return Slack;
    if (normalized.includes('teams') || normalized.includes('team')) return Users;
    return Globe;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (!chatbotData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No se encontró información del chatbot.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Resumen</h3>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Una vista rápida de uso y canales.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {summaryCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * (index + 1) }}
                className="bg-white dark:bg-minddash-elevated/50 p-6 rounded-lg border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 dark:text-gray-400">{card.label}</p>
                  <IconComponent className={`w-5 h-5 ${card.accent}`} />
                </div>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{formatNumber(card.value)}</p>
                <p className="text-xs mt-2 text-gray-500">{card.caption}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Canales y vínculos</h3>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Conecta canales para conversar con tus usuarios.
            </p>
          </div>
        </div>
        {linkCards.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-1">
            {linkCards.map((card, index) => {
              const IconComponent = card.isPlaceholder
                ? Plus
                : getChannelIcon(card.channel?.name);

              const baseClasses = 'flex-shrink-0 flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors';
              const stateClasses = card.isPlaceholder
                ? 'bg-gray-50 border border-dashed border-gray-300 hover:border-green-600/60 hover:bg-gray-100 dark:bg-gray-900/40 dark:border-gray-700 dark:hover:border-green-500/60 dark:hover:bg-gray-900/80'
                : 'bg-white border border-gray-200 hover:border-green-600/60 hover:bg-gray-50 dark:bg-minddash-elevated/50 dark:border-gray-800 dark:hover:border-green-500/60 dark:hover:bg-gray-800/80';

              return (
                <motion.div
                  key={card.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                  className={`${baseClasses} ${stateClasses}`}
                  onClick={() => {
                    if (card.isPlaceholder) {
                      handleCreateChannel(card.type);
                      return;
                    }
                    if (card.channel) {
                      handleChannelClick(card.channel);
                    }
                  }}
                >
                  <div className="relative p-2 bg-gray-100 dark:bg-gray-900/60 rounded-lg">
                    <IconComponent
                      className={card.isPlaceholder ? 'w-6 h-6 text-gray-400' : 'w-5 h-5 text-green-600 dark:text-green-400'}
                    />
                    {/* Status indicator dot */}
                    {!card.isPlaceholder && (
                      <span
                        className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-gray-200 dark:border-gray-800 ${
                          card.isActive ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                        title={card.isActive ? 'Activo' : 'Inactivo'}
                      />
                    )}
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-white">{card.label}</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {card.description}
                        </span>
                        {card.isPlaceholder && (
                          <span className="text-[11px] text-gray-500 mt-1">Agregar vínculo</span>
                        )}
                      </div>
                      {!card.isPlaceholder && card.channel && (
                        <button
                          type="button"
                          className="text-xs text-gray-500 hover:text-red-400"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteChannel(card.channel as ChatbotChannel);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-gray-50 dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
            No hay canales configurados para este chatbot.
          </div>
        )}
      </div>

      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Información general</h3>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Datos que se usan para identificar el chatbot en MindDash y definir su comportamiento base.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                Nombre del Chatbot
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-4 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                ID del Chatbot
              </label>
              <input
                type="text"
                value={chatbotData.id}
                disabled
                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-4 text-gray-500 dark:text-gray-400 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                Tipo
              </label>
              <Select
                value={formState.tipo || 'chatbot'}
                onValueChange={(next) => setFormState((prev) => ({ ...prev, tipo: next }))}
              >
                <SelectTrigger className="w-full bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                Idioma
              </label>
              <Select value={formState.language || 'es'} disabled>
                <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white disabled:opacity-70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                Etiqueta
              </label>
              <input
                type="text"
                value={formState.label}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, label: e.target.value }))
                }
                className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-4 text-gray-900 dark:text-white"
                placeholder="Ej: Chatbot, Asistente, Bot de soporte"
              />
              {/* Vista previa de la etiqueta */}
              {formState.label && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Vista previa:</span>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full border ${getLabelColorClasses(formState.labelColor || 'blue').bg} ${getLabelColorClasses(formState.labelColor || 'blue').text} ${getLabelColorClasses(formState.labelColor || 'blue').border}`}
                  >
                    {formState.label}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                Color de etiqueta
              </label>
              <div className="flex items-center gap-3">
                <Select
                  value={formState.labelColor || 'blue'}
                  onValueChange={(next) => setFormState((prev) => ({ ...prev, labelColor: next }))}
                >
                  <SelectTrigger className="flex-1 bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                    {LABEL_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        {color.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div
                  className={`w-4 h-4 rounded-full border ${getLabelColorClasses(formState.labelColor || 'blue').dot} ${getLabelColorClasses(formState.labelColor || 'blue').border}`}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Este color se usa para resaltar la etiqueta del chatbot en la interfaz.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
              Descripción
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agrega una descripción del chatbot..."
              className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-4 text-gray-900 dark:text-white resize-none focus:outline-none focus:border-green-600 dark:focus:border-green-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
              Mensaje de bienvenida
            </label>
            <textarea
              rows={3}
              value={formState.welcomeMessage}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  welcomeMessage: e.target.value,
                }))
              }
              placeholder="Mensaje inicial que verá el usuario al iniciar la conversación..."
              className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-4 text-gray-900 dark:text-white resize-none focus:outline-none focus:border-green-600 dark:focus:border-green-500 transition-colors"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveDescription}
              disabled={saving || !hasChanges}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      </div>

      {isChannelModalOpen && selectedChannel && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="glass-panel rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden border border-white/10 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Configuración de vínculo - {selectedChannel.name ?? 'Canal'}
                </h3>
                {channelConfigForm.type === 'whatsapp' ? (
                  <>
                    <p className="text-xs text-gray-300 mb-2">
                      Paso {channelModalStep} de 2 ·{' '}
                      {channelModalStep === 1 ? 'Guardar vínculo' : 'Conectar con Meta'}
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs border ${
                          channelModalStep === 1
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'bg-white/5 border-white/10 text-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-semibold ${
                            channelModalStep === 1 ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          1
                        </span>
                        <span>Guardar vínculo</span>
                      </div>

                      <div className="h-px w-6 bg-white/10" />

                      <div
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs border ${
                          channelModalStep === 2
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'bg-white/5 border-white/10 text-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-semibold ${
                            channelModalStep === 2 ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          2
                        </span>
                        <span>Conectar con Meta</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-300 mb-4">
                    Define cómo se conecta este canal con el chatbot.
                  </p>
                )}
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-gray-400 hover:text-white hover:bg-white/10"
                onClick={() => {
                  setIsChannelModalOpen(false);
                  setSelectedChannel(null);
                  setChannelModalStep(1);
                  setActiveChannelProductId(null);
                  setWebhookCopied(false);
                  if (webhookCopiedTimeoutRef.current) {
                    clearTimeout(webhookCopiedTimeoutRef.current);
                    webhookCopiedTimeoutRef.current = null;
                  }
                }}
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {channelConfigForm.type === 'whatsapp' && channelModalStep === 1 && (
                <>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Número de WhatsApp (incluye código de país)
                    </label>
                    <input
                      type="text"
                      value={channelConfigForm.phone_number}
                      onChange={(e) =>
                        setChannelConfigForm((prev) => ({
                          ...prev,
                          phone_number: e.target.value,
                        }))
                      }
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500"
                      placeholder="Ej: +56912345678"
                    />
                  </div>
                </>
              )}

              {channelConfigForm.type === 'whatsapp' && channelModalStep === 2 && (
                <>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      jwtToken
                    </label>
                    <input
                      type="text"
                      value={channelConfigForm.jwtToken}
                      onChange={(e) =>
                        setChannelConfigForm((prev) => ({
                          ...prev,
                          jwtToken: e.target.value,
                        }))
                      }
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500"
                      placeholder="Token JWT"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      numberId
                    </label>
                    <input
                      type="text"
                      value={channelConfigForm.numberId}
                      onChange={(e) =>
                        setChannelConfigForm((prev) => ({
                          ...prev,
                          numberId: e.target.value,
                        }))
                      }
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500"
                      placeholder="ID del número"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      verifyToken
                    </label>
                    <input
                      type="text"
                      value={channelConfigForm.verifyToken}
                      onChange={(e) =>
                        setChannelConfigForm((prev) => ({
                          ...prev,
                          verifyToken: e.target.value,
                        }))
                      }
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500"
                      placeholder="Token de verificación"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Webhook (colocar en Meta)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={channelConfigForm.webhook_url}
                        readOnly
                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleCopyWebhook}
                        aria-label="Copiar webhook"
                        className="bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 hover:text-white"
                      >
                        {webhookCopied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {channelConfigForm.type === 'email' && (
                <div>
                  <label className="block text-xs text-gray-700 dark:text-gray-400 mb-1">
                    Correo destino
                  </label>
                  <input
                    type="email"
                    value={channelConfigForm.email}
                    onChange={(e) =>
                      setChannelConfigForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                    placeholder="soporte@empresa.com"
                  />
                </div>
              )}

              {channelConfigForm.type === 'slack' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-700 dark:text-gray-400 mb-1">
                      App ID Slack
                    </label>
                    <input
                      type="text"
                      value={channelConfigForm.app_id_slack}
                      onChange={(e) =>
                        setChannelConfigForm((prev) => ({
                          ...prev,
                          app_id_slack: e.target.value,
                        }))
                      }
                      className="w-full bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                      placeholder="Ej: a5803bc3-296c-4ed7-a3b2-535eea82ad60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-700 dark:text-gray-400 mb-1">
                      App password Slack
                    </label>
                    <input
                      type="text"
                      value={channelConfigForm.app_pswd_slack}
                      onChange={(e) =>
                        setChannelConfigForm((prev) => ({
                          ...prev,
                          app_pswd_slack: e.target.value,
                        }))
                      }
                      className="w-full bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                      placeholder="testing_secreto_aleatorio-version2"
                    />
                  </div>
                  {selectedChannel?.configuration?.app_pswd_slack && !channelConfigForm.app_pswd_slack && (
                    <div>
                      <label className="block text-xs text-gray-700 dark:text-gray-400 mb-1">
                        App password Slack (guardado)
                      </label>
                      <input
                        type="text"
                        value={maskSecretValue(selectedChannel.configuration.app_pswd_slack)}
                        readOnly
                        className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-700 dark:text-gray-400 mb-1">
                      URL Webhook
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={channelConfigForm.webhook_url}
                        readOnly
                        className="flex-1 bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                        placeholder="Se generará al guardar"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleCopyWebhook}
                        aria-label="Copiar webhook"
                        className="bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 hover:text-white"
                        disabled={!channelConfigForm.webhook_url}
                      >
                        {webhookCopied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {channelConfigForm.type === 'teams' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-700 dark:text-gray-400 mb-1">
                      App ID (Teams)
                    </label>
                    <input
                      type="text"
                      value={channelConfigForm.app_id}
                      onChange={(e) =>
                        setChannelConfigForm((prev) => ({
                          ...prev,
                          app_id: e.target.value,
                        }))
                      }
                      className="w-full bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                      placeholder="Ej: a5803bc3-296c-4ed7-a3b2-535eea82ad60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-700 dark:text-gray-400 mb-1">
                      Secret password ID (Teams)
                    </label>
                    <input
                      type="text"
                      value={channelConfigForm.secret_pasword_id}
                      onChange={(e) =>
                        setChannelConfigForm((prev) => ({
                          ...prev,
                          secret_pasword_id: e.target.value,
                        }))
                      }
                      className="w-full bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                      placeholder="ID del secreto almacenado para Teams"
                    />
                  </div>
                  {selectedChannel?.configuration?.secret_pasword_id && !channelConfigForm.secret_pasword_id && (
                    <div>
                      <label className="block text-xs text-gray-700 dark:text-gray-400 mb-1">
                        Secret password ID (guardado)
                      </label>
                      <input
                        type="text"
                        value={maskSecretValue(selectedChannel.configuration.secret_pasword_id)}
                        readOnly
                        className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-700 dark:text-gray-400 mb-1">
                      URL Webhook
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={channelConfigForm.webhook_url}
                        readOnly
                        className="flex-1 bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                        placeholder="Se generará al guardar"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleCopyWebhook}
                        aria-label="Copiar webhook"
                        className="bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 hover:text-white"
                        disabled={!channelConfigForm.webhook_url}
                      >
                        {webhookCopied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {channelConfigForm.type === 'other' && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Canal genérico. Usa el campo &quot;Notas internas&quot; para documentar cómo se integra este vínculo.
                </p>
              )}

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={channelConfigForm.is_active}
                    onChange={(e) =>
                      setChannelConfigForm((prev) => ({
                        ...prev,
                        is_active: e.target.checked,
                      }))
                    }
                  />
                  <span>Vínculo activo</span>
                </label>
              </div>

              <div>
                <label className="block text-xs text-gray-700 dark:text-gray-400 mb-1">
                  Notas internas
                </label>
                <textarea
                  value={channelConfigForm.notes}
                  onChange={(e) =>
                    setChannelConfigForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white resize-none"
                  placeholder="Información adicional sobre cómo se usa este canal"
                />
              </div>
            </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (channelConfigForm.type === 'whatsapp' && channelModalStep === 2) {
                      setChannelModalStep(1);
                      return;
                    }
                    setIsChannelModalOpen(false);
                    setSelectedChannel(null);
                    setChannelModalStep(1);
                    setActiveChannelProductId(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-minddash-elevated dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white rounded-lg"
                >
                  {channelConfigForm.type === 'whatsapp' && channelModalStep === 2 ? 'Volver' : 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveChannelConfig}
                  disabled={savingChannelConfig}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-sm text-white rounded-lg"
                >
                  {savingChannelConfig
                    ? 'Guardando...'
                    : channelConfigForm.type === 'whatsapp' && channelModalStep === 1
                      ? 'Guardar y continuar'
                      : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {channelToDelete && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Eliminar vínculo
                </h3>
                <button
                  type="button"
                  className="rounded-md p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                  onClick={() => setChannelToDelete(null)}
                  disabled={deletingChannel}
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                ¿Seguro que quieres eliminar el vínculo de <span className="font-semibold">{channelToDelete.name ?? 'canal'}</span>? Esta acción no se puede deshacer.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setChannelToDelete(null)}
                  disabled={deletingChannel}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-minddash-elevated dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white rounded-lg disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteChannel}
                  disabled={deletingChannel}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-sm text-white rounded-lg disabled:opacity-50"
                >
                  {deletingChannel ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </motion.div>
  );
}
