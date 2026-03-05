'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity as FiActivity,
  ChevronRight,
  ExternalLink,
  BotMessageSquare,
  Globe,
  Link2,
  Book,
  Slack as FiSlack,
  Hash,
  Mail,
  Loader2,
  Pencil,
  Trash2,
  RefreshCw as FiRefreshCw,
  Search as FiSearch,
  TrendingUp as FiTrendingUp,
  Users as FiUsers,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import { getBayerClasses } from '@/lib/utils/bayer-theme';
import { useChatbotHistory } from '@/hooks/useChatbotHistory';
import { CreateChatbotWizardDialog } from '@/components/admin/ChatbotWizard/CreateChatbotWizardDialog';
import { cn } from '@/lib/utils';

type IconComponent = React.ComponentType<{ className?: string }>;

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

interface Chatbot {
  id: string;
  name: string;
  description: string | null;
  channels?: Array<{ id: string; name: string | null; description?: string | null; configuration?: unknown }>;
  organizationId: string;
  organizationName: string;
  projectId: string;
  projectName: string;
  mensajesMes: number;
  totalMensajes: number;
  usuariosAsignados: number;
  isActive: boolean;
  tipo?: string;
  label?: string | null;
  labelColor?: string | null;
  createdAt?: string;
  updatedAt?: string;
  maxUsers?: number | null;
  isActiveRag?: boolean;
  isActiveAlerts?: boolean;
  isActiveInsight?: boolean;
}

export default function ChatbotsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = '/dashboard/admin';
  const { applyThemeClass } = useThemeMode();
  const { getHistory } = useChatbotHistory();
  const activeItemNodeRef = useRef<HTMLDivElement | null>(null);
  
  const enableWizardV2 = process.env.NEXT_PUBLIC_CHATBOT_WIZARD_V2 === 'true';
  const [chatbotsUiMode, setChatbotsUiMode] = useState<'v1' | 'v2'>('v1');
  
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<Chatbot | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<{ name: string; description: string | null }>({
    name: '',
    description: null,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [navigatingGeneral, setNavigatingGeneral] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOrg, setFilterOrg] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'messages' | 'recent'>('recent');

  const resolveTargetChatbot = useCallback(() => {
    if (activeItem && activeItem.organizationId && activeItem.projectId) {
      return {
        id: activeItem.id,
        name: activeItem.name,
        organizationId: activeItem.organizationId,
        projectId: activeItem.projectId,
      };
    }

    const history = getHistory();
    const candidate = history.find((item) => item.organizationId && item.projectId);
    if (!candidate) return null;

    return {
      id: candidate.id,
      name: candidate.name,
      organizationId: candidate.organizationId,
      projectId: candidate.projectId,
    };
  }, [activeItem, getHistory]);

  const navigateToChatbotSection = useCallback((section: 'general' | 'fuentes') => {
    const target = resolveTargetChatbot();
    if (!target) {
      toast.info('Selecciona un chatbot para continuar');
      return;
    }

    router.push(`${basePath}/organizations/${target.organizationId}/projects/${target.projectId}/chatbots/${target.id}?section=${section}`);
  }, [basePath, resolveTargetChatbot, router]);

  useEffect(() => {
    if (!activeItem) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveItem(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeItem]);

  useEffect(() => {
    if (!activeItem) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const node = activeItemNodeRef.current;
      if (!node) return;
      if (node.contains(target)) return;
      setActiveItem(null);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [activeItem]);

  useEffect(() => {
    if (!activeItem) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeItem]);

  useEffect(() => {
    if (!activeItem) {
      setIsEditing(false);
      setConfirmDelete(false);
      setNavigatingGeneral(false);
    } else {
      setEditValues({ name: activeItem.name, description: activeItem.description });
      setIsEditing(false);
      setConfirmDelete(false);
      setNavigatingGeneral(false);
    }
  }, [activeItem]);

  // Cargar chatbots
  const loadChatbots = useCallback(async () => {
    try {
      setLoading(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('No se encontró token de autenticación');
        return;
      }

      const auth = JSON.parse(authData);
      const response = await fetch('/api/admin-client/products/stats', {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar chatbots');
      }

      const result = await response.json();
      
      if (result.stats && Array.isArray(result.stats.topProducts)) {
        const formattedChatbots: Chatbot[] = result.stats.topProducts.map((product: any) => ({
          id: product.id,
          name: product.nombre || 'Chatbot sin nombre',
          description: product.description ?? product.descripcion ?? null,
          channels: Array.isArray(product.channels) ? product.channels : [],
          organizationId: product.organization_id || '',
          organizationName: product.organization_name || 'Sin organización',
          projectId: product.project_id || '',
          projectName: product.project_name || 'Sin proyecto',
          mensajesMes: product.mensajes_mes || 0,
          totalMensajes: product.total_mensajes || 0,
          usuariosAsignados: product.usuarios_asignados || 0,
          isActive: product.is_active !== false,
          tipo: product.tipo || undefined,
          label: product.label ?? null,
          labelColor: product.label_color ?? null,
          createdAt: typeof product.created_at === 'string' ? product.created_at : undefined,
          updatedAt: typeof product.updated_at === 'string' ? product.updated_at : undefined,
          maxUsers: product.max_users ?? null,
          isActiveRag: Boolean(product.is_active_rag),
          isActiveAlerts: Boolean(product.is_active_alerts),
          isActiveInsight: Boolean(product.is_active_insight),
        }));
        
        setChatbots(formattedChatbots);
      }
    } catch (error) {
      console.error('Error cargando chatbots:', error);
      toast.error('Error al cargar los chatbots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChatbots();
  }, [loadChatbots]);

  useEffect(() => {
    if (!enableWizardV2) return;
    try {
      const saved = localStorage.getItem('admin-chatbots-ui');
      if (saved === 'v2') {
        setChatbotsUiMode('v2');
      }
    } catch {
      // noop
    }
  }, [enableWizardV2]);

  // Obtener organizaciones únicas para filtro
  const organizations = useMemo(() => {
    const orgs = new Set(chatbots.map(c => c.organizationName).filter(Boolean));
    return Array.from(orgs).sort();
  }, [chatbots]);

  // Filtrar y ordenar chatbots
  const filteredChatbots = useMemo(() => {
    let filtered = chatbots;

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) ||
        (c.description ? c.description.toLowerCase().includes(query) : false) ||
        c.organizationName.toLowerCase().includes(query) ||
        c.projectName.toLowerCase().includes(query)
      );
    }

    // Filtro por organización
    if (filterOrg !== 'all') {
      filtered = filtered.filter(c => c.organizationName === filterOrg);
    }

    // Filtro por estado
    if (filterStatus === 'active') {
      filtered = filtered.filter(c => c.isActive);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(c => !c.isActive);
    }

    // Ordenar
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'messages') {
      filtered.sort((a, b) => b.mensajesMes - a.mensajesMes);
    } else if (sortBy === 'recent') {
      const history = getHistory();
      const historyMap = new Map(history.map((h, idx) => [h.id, idx]));
      filtered.sort((a, b) => {
        const aIdx = historyMap.get(a.id) ?? 999;
        const bIdx = historyMap.get(b.id) ?? 999;
        return aIdx - bIdx;
      });
    }

    return filtered;
  }, [chatbots, searchQuery, filterOrg, filterStatus, sortBy, getHistory]);

  const handleNavigateToChatbot = (chatbot: Chatbot) => {
    if (!chatbot.organizationId || !chatbot.projectId) {
      toast.info('Navegando a través de Organizaciones');
      router.push(`${basePath}/organizations`);
      return;
    }

    router.push(`${basePath}/organizations/${chatbot.organizationId}/projects/${chatbot.projectId}/chatbots/${chatbot.id}`);
  };

  const handleNavigateToChatbotGeneral = (chatbot: Chatbot) => {
    setNavigatingGeneral(true);
    if (!chatbot.organizationId || !chatbot.projectId) {
      toast.info('Navegando a través de Organizaciones');
    }
    setActiveItem(null);
    router.push(`${basePath}/organizations/${chatbot.organizationId}/projects/${chatbot.projectId}/chatbots/${chatbot.id}?section=general`);
  };

  const handleSaveInlineEdit = async () => {
    if (!activeItem) return;
    try {
      setSavingEdit(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('No se encontró token de autenticación');
        return;
      }
      const auth = JSON.parse(authData);
      const response = await fetch(`/api/admin-client/chatbots/${activeItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editValues.name,
          description: editValues.description ?? '',
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || 'Error al actualizar chatbot');
        return;
      }
      const updated = {
        ...activeItem,
        name: editValues.name,
        description: editValues.description,
      };
      setActiveItem(updated);
      setChatbots((prev) => prev.map((c) => (c.id === activeItem.id ? { ...c, name: updated.name, description: updated.description } : c)));
      toast.success('Chatbot actualizado');
      setIsEditing(false);
    } catch (error) {
      toast.error('Error al actualizar chatbot');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelInlineEdit = () => {
    if (!activeItem) return;
    setEditValues({ name: activeItem.name, description: activeItem.description });
    setIsEditing(false);
  };

  const handleDeleteChatbot = async () => {
    if (!activeItem) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      setDeleting(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('No se encontró token de autenticación');
        return;
      }
      const auth = JSON.parse(authData);
      const response = await fetch(`/api/admin-client/chatbots/${activeItem.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || 'Error al eliminar chatbot');
        return;
      }
      toast.success('Chatbot eliminado');
      setChatbots((prev) => prev.filter((c) => c.id !== activeItem.id));
      setActiveItem(null);
    } catch (error) {
      toast.error('Error al eliminar chatbot');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const normalizeChannelName = (name: string | null | undefined) => {
    const value = (name || '').trim();
    if (!value) return '';
    const lower = value.toLowerCase();
    if (lower.includes('whatsapp')) return 'WhatsApp';
    if (lower.includes('web')) return 'Web';
    return value;
  };

  const truncateDescription = (value: string | null | undefined, maxChars = 96) => {
    const normalized = (value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    if (normalized.length <= maxChars) return normalized;
    return `${normalized.slice(0, Math.max(0, maxChars - 3))}...`;
  };

  type ChannelType = 'web' | 'whatsapp' | 'teams' | 'email' | 'slack' | 'other';

  const getChannelType = (name: string | null | undefined): ChannelType => {
    const value = (name || '').toLowerCase();
    if (value.includes('whatsapp')) return 'whatsapp';
    if (value.includes('web')) return 'web';
    if (value.includes('teams') || value.includes('team')) return 'teams';
    if (value.includes('correo') || value.includes('email') || value.includes('mail')) return 'email';
    if (value.includes('slack')) return 'slack';
    return 'other';
  };

  const getWhatsAppPhoneNumber = (configuration: unknown) => {
    if (!configuration || typeof configuration !== 'object') return '';
    if (!('phone_number' in configuration)) return '';
    const raw = String((configuration as Record<string, unknown>).phone_number || '');
    return raw.replace(/[^0-9]/g, '');
  };

  const handleOpenChannel = (chatbot: Chatbot, channel: { type: ChannelType; configuration?: unknown }) => {
    if (channel.type === 'web') {
      setActiveItem(null);
      window.open(`/chatbot/${chatbot.id}`, '_blank', 'noopener,noreferrer');
      return;
    }

    if (channel.type === 'whatsapp') {
      const phone = getWhatsAppPhoneNumber(channel.configuration);
      if (!phone) {
        toast.info('Este canal todavía no tiene número configurado');
        return;
      }
      setActiveItem(null);
      window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
      return;
    }

    toast.info('Canal próximamente');
  };

  type ChannelButton = {
    key: string;
    label: string;
    type: ChannelType;
    configuration?: unknown;
  };

  const hasWhatsAppPhone = (configuration: unknown) => Boolean(getWhatsAppPhoneNumber(configuration));

  const buildChannelButtons = (chatbot: Chatbot): ChannelButton[] => {
    const mapped: ChannelButton[] = (chatbot.channels || [])
      .map((c) => ({
        key: c.id,
        label: normalizeChannelName(c.name),
        type: getChannelType(c.name),
        configuration: c.configuration,
      }))
      .filter((c) => Boolean(c.label));

    const candidates: ChannelButton[] = [
      {
        key: `web-${chatbot.id}`,
        label: 'Web',
        type: 'web',
        configuration: null,
      },
      ...mapped,
    ];

    const byType = new Map<ChannelType, ChannelButton>();

    for (const candidate of candidates) {
      const current = byType.get(candidate.type);
      if (!current) {
        byType.set(candidate.type, candidate);
        continue;
      }

      if (candidate.type === 'whatsapp') {
        const currentHasPhone = hasWhatsAppPhone(current.configuration);
        const nextHasPhone = hasWhatsAppPhone(candidate.configuration);
        if (!currentHasPhone && nextHasPhone) {
          byType.set(candidate.type, candidate);
        }
      }
    }

    const order: ChannelType[] = ['web', 'whatsapp', 'teams', 'slack', 'email', 'other'];
    return order.flatMap((type) => {
      const item = byType.get(type);
      return item ? [item] : [];
    });
  };

  const getChannelIcon = (type: ChannelType): IconComponent => {
    switch (type) {
      case 'web':
        return Globe;
      case 'whatsapp':
        return WhatsAppIcon;
      case 'email':
        return Mail;
      case 'teams':
        return FiUsers;
      case 'slack':
        return FiSlack;
      default:
        return ExternalLink;
    }
  };

  return (
    <div className={applyThemeClass('min-h-screen', 'min-h-screen bg-white')}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`px-8 py-6 shadow-sm border-b ${applyThemeClass(
                'bg-minddash-surface border-minddash-border',
                'bg-white border-gray-200 text-gray-900'
              )}`
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={getBayerClasses(
                applyThemeClass('bg-minddash-celeste-500/20 p-2 rounded-lg', 'bg-minddash-celeste-100 p-2 rounded-lg'),
                'bayer-primary-bg/20 p-2 rounded-lg'
              )}>
                <BotMessageSquare className="h-6 w-6 text-minddash-celeste-300" />
              </div>
              <h1 className={`text-3xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>
                Mis Chatbots
              </h1>
            </div>
            <p className={`mt-2 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
              Vista consolidada de todos tus chatbots
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            {enableWizardV2 ? (
              <div className={applyThemeClass('rounded-lg border border-minddash-border bg-minddash-card p-1', 'rounded-lg border border-gray-200 bg-white p-1')}>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setChatbotsUiMode('v1');
                      try {
                        localStorage.setItem('admin-chatbots-ui', 'v1');
                      } catch {
                        // noop
                      }
                    }}
                    className={applyThemeClass(
                      `px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${chatbotsUiMode === 'v1' ? 'bg-minddash-celeste-600 text-white' : 'text-gray-300 hover:bg-minddash-elevated'}`,
                      `px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${chatbotsUiMode === 'v1' ? 'bg-minddash-celeste-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`
                    )}
                  >
                    Actual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChatbotsUiMode('v2');
                      try {
                        localStorage.setItem('chatbots-ui-mode', 'v2');
                      } catch {
                        // noop
                      }
                      router.push(`${basePath}/chatbots/new-v2`);
                    }}
                    className={applyThemeClass(
                      `px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${chatbotsUiMode === 'v2' ? 'bg-minddash-celeste-600 text-white' : 'text-gray-300 hover:bg-minddash-elevated'}`,
                      `px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${chatbotsUiMode === 'v2' ? 'bg-minddash-celeste-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`
                    )}
                  >
                    Wizard v2
                  </button>
                </div>
              </div>
            ) : null}
            <CreateChatbotWizardDialog
              triggerClassName={applyThemeClass(
                      'bg-minddash-celeste-600 hover:bg-minddash-celeste-700 text-white',
                      'bg-minddash-celeste-600 hover:bg-minddash-celeste-700 text-white'
                    )
              }
            />
            <Button
              onClick={loadChatbots}
              variant="outline"
              className={applyThemeClass('border-gray-700 text-gray-200 hover:bg-minddash-elevated', 'border-gray-300 text-gray-800 hover:bg-white')
              }
            >
              <FiRefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Contenido */}
      <div className={`flex-1 px-8 py-6 overflow-y-auto ${applyThemeClass('', 'bg-white')}`}>
        {/* Filtros y búsqueda */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card
            className={getBayerClasses(
                    applyThemeClass('border border-minddash-border bg-minddash-card text-white shadow-sm', 'border border-gray-200 bg-white text-gray-900 shadow-sm'),
                    'bayer-card shadow-sm'
                  )
            }
          >
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Búsqueda */}
                <div className="relative">
                  <FiSearch className={applyThemeClass('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400', 'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500')} />
                  <Input
                    placeholder="Buscar chatbot..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={applyThemeClass(
                            'pl-10 bg-minddash-elevated border-gray-700 text-white placeholder:text-gray-500',
                            'pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                          )
                    }
                  />
                </div>

                {/* Filtro por organización */}
                <Select value={filterOrg} onValueChange={setFilterOrg}>
                  <SelectTrigger className={applyThemeClass('bg-minddash-elevated border-gray-700 text-white', 'bg-white border-gray-300 text-gray-900')}>
                    <SelectValue placeholder="Organización" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las organizaciones</SelectItem>
                    {organizations.map(org => (
                      <SelectItem key={org} value={org}>{org}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filtro por estado */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className={applyThemeClass('bg-minddash-elevated border-gray-700 text-white', 'bg-white border-gray-300 text-gray-900')}>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>

                {/* Ordenar */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className={applyThemeClass('bg-minddash-elevated border-gray-700 text-white', 'bg-white border-gray-300 text-gray-900')}>
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Más recientes</SelectItem>
                    <SelectItem value="name">Nombre (A-Z)</SelectItem>
                    <SelectItem value="messages">Más mensajes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Acciones rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card
            className={getBayerClasses(
                    applyThemeClass(
                      'border border-minddash-border bg-minddash-card text-white shadow-sm',
                      'border border-gray-200 bg-white text-gray-900 shadow-sm'
                    ),
                    'bayer-card shadow-sm'
                  )
            }
          >
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className={applyThemeClass('text-white font-semibold', 'text-gray-900 font-semibold')}>
                    Acciones rápidas
                  </div>
                  <div className={applyThemeClass('text-gray-400 text-sm', 'text-gray-600 text-sm')}>
                    Atajos para configurar y mejorar tus chatbots.
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToChatbotSection('general')}
                    className={cn(
                      'justify-start',
                      applyThemeClass(
                        'border-gray-700 text-gray-200 hover:bg-minddash-elevated',
                        'border-gray-300 text-gray-800 hover:bg-white'
                      )
                    )}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Conectar canal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToChatbotSection('fuentes')}
                    className={cn(
                      'justify-start',
                      applyThemeClass(
                        'border-gray-700 text-gray-200 hover:bg-minddash-elevated',
                        'border-gray-300 text-gray-800 hover:bg-white'
                      )
                    )}
                  >
                    <Book className="mr-2 h-4 w-4" />
                    Subir fuentes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Resultados */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-minddash-celeste-500 mx-auto mb-4"></div>
              <p className={applyThemeClass('text-gray-400', 'text-gray-600')}>Cargando chatbots...</p>
            </div>
          </div>
        ) : filteredChatbots.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <BotMessageSquare className={`mx-auto h-16 w-16 mb-4 ${applyThemeClass('text-gray-600', 'text-gray-400')}`} />
            <h3 className={`text-xl font-semibold mb-2 ${applyThemeClass('text-white', 'text-gray-900')}`}>
              No se encontraron chatbots
            </h3>
            <p className={applyThemeClass('text-gray-400', 'text-gray-600')}>
              {searchQuery || filterOrg !== 'all' || filterStatus !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Aún no tienes chatbots configurados'}
            </p>
          </motion.div>
        ) : (
          <div className="relative">
            <AnimatePresence>
              {activeItem ? (
                <motion.div
                  aria-hidden="true"
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-50 bg-black/35"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                />
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {activeItem ? (
                <div className="fixed inset-0 z-50 grid place-items-center p-4">
                  <motion.div
                    layoutId={`chatbot-${activeItem.id}`}
                    ref={activeItemNodeRef}
                    className="w-full max-w-2xl"
                  >
                    <Card
                      className={getBayerClasses(
                              applyThemeClass(
                                'cursor-default overflow-hidden border-minddash-border bg-minddash-card text-white shadow-md rounded-[14px]',
                                'cursor-default overflow-hidden border-gray-200 bg-white text-gray-900 shadow-md rounded-[14px]'
                              ),
                              'bayer-card rounded-[14px]'
                            )
                      }
                    >
                      <div className="flex items-start gap-4 p-6">
                        <div className={getBayerClasses(
                          applyThemeClass('bg-minddash-celeste-500/20 p-2 rounded-lg', 'bg-minddash-celeste-100 p-2 rounded-lg'),
                          'bayer-primary-bg/20 p-2 rounded-lg'
                        )}>
                          <BotMessageSquare className="h-6 w-6 text-minddash-celeste-300" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editValues.name}
                                    onChange={(e) => setEditValues((prev) => ({ ...prev, name: e.target.value }))}
                                    className="text-xl sm:text-2xl font-semibold"
                                  />
                                  <textarea
                                    value={editValues.description || ''}
                                    onChange={(e) => setEditValues((prev) => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className={applyThemeClass(
                                            'w-full rounded-md border border-minddash-border bg-minddash-elevated p-3 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-minddash-celeste-500',
                                            'w-full rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-minddash-celeste-500'
                                          )
                                    }
                                    placeholder="Añade una descripción del chatbot"
                                  />
                                </div>
                              ) : (
                                <>
                                  <motion.h3
                                    className={applyThemeClass('text-2xl sm:text-3xl font-semibold leading-tight', 'text-2xl sm:text-3xl font-semibold leading-tight')}
                                    layoutId={`chatbot-title-${activeItem.id}`}
                                  >
                                    {activeItem.name}
                                  </motion.h3>

                                  <motion.p
                                    className={applyThemeClass('text-gray-400 text-sm', 'text-gray-500 text-sm')}
                                    layoutId={`chatbot-subtitle-${activeItem.id}`}
                                  >
                                    {activeItem.organizationName} • {activeItem.projectName}
                                  </motion.p>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleNavigateToChatbotGeneral(activeItem)}
                                disabled={navigatingGeneral}
                                className={applyThemeClass('text-gray-300 hover:bg-white/10 disabled:opacity-60', 'text-gray-700 hover:bg-gray-100 disabled:opacity-60')}
                                title="Ir a General"
                              >
                                {navigatingGeneral ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => setActiveItem(null)}
                                className={applyThemeClass('text-gray-300 hover:bg-white/10', 'text-gray-700 hover:bg-gray-100')}
                                title="Cerrar"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {activeItem.tipo ? (
                              <Badge variant="secondary">{activeItem.tipo}</Badge>
                            ) : null}
                            {activeItem.label ? (
                              <Badge variant="outline">{activeItem.label}</Badge>
                            ) : null}
                            {!activeItem.isActive ? (
                              <Badge variant="outline" className={applyThemeClass('border-gray-600 text-gray-300', 'border-gray-400 text-gray-700')}>
                                Inactivo
                              </Badge>
                            ) : null}
                            {activeItem.isActiveRag ? <Badge variant="secondary">RAG</Badge> : null}
                            {activeItem.isActiveAlerts ? <Badge variant="secondary">Alerts</Badge> : null}
                            {activeItem.isActiveInsight ? <Badge variant="secondary">Insight</Badge> : null}
                          </div>
                        </div>
                      </div>

                      <CardContent className="px-6 pb-6">
                        {!isEditing && activeItem.description ? (
                          <motion.p
                            animate={{ opacity: 1 }}
                            className={applyThemeClass('text-gray-200 text-sm', 'text-gray-700 text-sm')}
                            exit={{ opacity: 0, transition: { duration: 0.05 } }}
                            initial={{ opacity: 0 }}
                            layout
                          >
                            {activeItem.description}
                          </motion.p>
                        ) : null}

                        <div className="mt-5">
                          <div className={applyThemeClass('text-gray-300 text-sm font-medium', 'text-gray-800 text-sm font-medium')}>
                            Canales
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {buildChannelButtons(activeItem).map((channel) => (
                              <Button
                                key={channel.key}
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => handleOpenChannel(activeItem, channel)}
                              >
                                {(() => {
                                  const Icon = getChannelIcon(channel.type);
                                  return <Icon className="mr-2 h-4 w-4" />;
                                })()}
                                {channel.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div
                            className={applyThemeClass('rounded-lg border border-minddash-border bg-minddash-elevated p-4', 'rounded-lg border border-gray-200 bg-white p-4')
                            }
                          >
                            <div className="flex items-center gap-2">
                              <FiActivity className={applyThemeClass('h-4 w-4 text-gray-300', 'h-4 w-4 text-gray-500')} />
                              <span className={applyThemeClass('text-gray-300 text-sm', 'text-gray-600 text-sm')}>Mensajes/mes</span>
                            </div>
                            <div className="mt-2 text-xl font-semibold">{activeItem.mensajesMes}</div>
                          </div>

                          <div
                            className={applyThemeClass('rounded-lg border border-minddash-border bg-minddash-elevated p-4', 'rounded-lg border border-gray-200 bg-white p-4')
                            }
                          >
                            <div className="flex items-center gap-2">
                              <FiUsers className={applyThemeClass('h-4 w-4 text-gray-300', 'h-4 w-4 text-gray-500')} />
                              <span className={applyThemeClass('text-gray-300 text-sm', 'text-gray-600 text-sm')}>Usuarios</span>
                            </div>
                            <div className="mt-2 text-xl font-semibold">{activeItem.usuariosAsignados}</div>
                          </div>

                          <div
                            className={applyThemeClass('rounded-lg border border-minddash-border bg-minddash-elevated p-4', 'rounded-lg border border-gray-200 bg-white p-4')
                            }
                          >
                            <div className="flex items-center gap-2">
                              <FiTrendingUp className={applyThemeClass('h-4 w-4 text-gray-300', 'h-4 w-4 text-gray-500')} />
                              <span className={applyThemeClass('text-gray-300 text-sm', 'text-gray-600 text-sm')}>Total</span>
                            </div>
                            <div className="mt-2 text-xl font-semibold">{activeItem.totalMensajes}</div>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className={applyThemeClass('text-gray-400 text-xs', 'text-gray-500 text-xs')}>
                            {activeItem.maxUsers ? `Límite usuarios: ${activeItem.maxUsers}` : null}
                          </div>
                        </div>

                        <div className="mt-4 border-t border-dashed" />
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className={applyThemeClass('text-gray-400 text-xs', 'text-gray-500 text-xs')}>
                            {confirmDelete ? 'Confirma si deseas eliminar este chatbot.' : 'Acciones rápidas'}
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={handleSaveInlineEdit}
                                  disabled={savingEdit}
                                >
                                  {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
                                  {savingEdit ? 'Guardando' : 'Guardar'}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={handleCancelInlineEdit} disabled={savingEdit}>
                                  Cancelar
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant={confirmDelete ? 'destructive' : 'ghost'}
                              onClick={handleDeleteChatbot}
                              disabled={deleting}
                            >
                              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                              {confirmDelete ? (deleting ? 'Eliminando...' : 'Confirmar') : 'Eliminar'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredChatbots.map((chatbot, index) => (
                <motion.div
                  key={chatbot.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  layoutId={`chatbot-${chatbot.id}`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Card
                    className={getBayerClasses(
                            applyThemeClass(
                              'group relative h-full cursor-pointer overflow-hidden border-minddash-border bg-minddash-card text-white shadow-sm transition-all rounded-xl hover:border-minddash-celeste-500/70 hover:shadow-md focus-visible:outline-none focus-within:ring-2 focus-within:ring-minddash-celeste-500/60 focus-within:ring-offset-2 focus-within:ring-offset-background',
                              'group relative h-full cursor-pointer overflow-hidden border-gray-200 bg-white text-gray-900 shadow-sm transition-all rounded-xl hover:border-minddash-celeste-500/50 hover:shadow-md focus-visible:outline-none focus-within:ring-2 focus-within:ring-minddash-celeste-500/50 focus-within:ring-offset-2 focus-within:ring-offset-white'
                            ),
                            'bayer-card shadow-sm hover:shadow-md rounded-xl'
                          )
                    }
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver detalles de ${chatbot.name}`}
                    onClick={() => setActiveItem(chatbot)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveItem(chatbot);
                      }
                    }}
                  >
                  <div className="pointer-events-none absolute right-3 top-3 opacity-0 transition-all group-hover:opacity-100 group-focus-within:opacity-100 group-hover:translate-x-0 group-focus-within:translate-x-0 translate-x-[-2px]">
                    <ChevronRight className={applyThemeClass('h-4 w-4 text-gray-200', 'h-4 w-4 text-gray-700')} />
                  </div>
                  <CardContent className="p-5 h-[112px]">
                    <div className="flex items-start gap-3 h-full">
                      <div className={getBayerClasses(
                        applyThemeClass('bg-minddash-celeste-500/20 p-2 rounded-lg', 'bg-minddash-celeste-100 p-2 rounded-lg'),
                        'bayer-primary-bg/20 p-2 rounded-lg'
                      )}>
                        <BotMessageSquare className="h-5 w-5 text-minddash-celeste-300" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <motion.div
                          className="min-w-0"
                          layoutId={`chatbot-title-${chatbot.id}`}
                        >
                          <div className="truncate text-lg font-semibold">{chatbot.name}</div>
                        </motion.div>

                        {truncateDescription(chatbot.description) ? (
                          <div
                            className={applyThemeClass(
                              'mt-2 h-10 text-gray-300 text-[15px] leading-snug italic overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]',
                              'mt-2 h-10 text-gray-600 text-[15px] leading-snug italic overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]'
                            )}
                          >
                            {truncateDescription(chatbot.description)}
                          </div>
                        ) : (
                          <div className="mt-2 h-10">
                            <div className={applyThemeClass(
                              'text-gray-500 text-[15px] italic',
                              'text-gray-400 text-[15px] italic'
                            )}>
                              Sin descripción
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
