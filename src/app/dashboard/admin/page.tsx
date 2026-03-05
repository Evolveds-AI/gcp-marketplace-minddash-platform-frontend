'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useChatbotHistory } from '@/hooks/useChatbotHistory';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Database,
  Info,
  Link2,
  Loader2,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Star,
  WandSparkles,
  TrendingUp,
  Users,
  BotMessageSquare,
  Book,
  Inbox,
  EyeOff,
  X,
} from 'lucide-react';
import DashboardCharts from '@/components/charts/DashboardCharts';
import SectionCards from '@/components/section-cards';
import { getBayerClasses } from '@/lib/utils/bayer-theme';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import { LIGHT_THEME_CLASSES } from '@/lib/theme/tokens';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import SuperAdminDashboard from './superadmin-dashboard';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  userGrowth: string;
}

type ChartsDataset = {
  'user-growth': Array<{ month: string; usuarios: number; total: number }>;
  'project-chatbots': Array<{ proyecto: string; chatbots: number }>;
  'monthly-metrics': Array<{ mes: string; usuarios: number; mensajes: number; engagement: number }>;
};

type SparklineData = Array<{ label: string; value: number }>;

interface ProductSummary {
  id: string;
  name: string;
  organizationId?: string;
  organizationName?: string;
  projectId?: string;
  projectName?: string;
  channels?: Array<{ id: string; name: string | null; configuration?: unknown }>;
  isActiveRag?: boolean;
  isActiveAlerts?: boolean;
  isActiveInsight?: boolean;
  mensajesMes: number;
  totalMensajes: number;
  growthValue: number;
  growthLabel: string;
  promedioDiario: number;
}

interface TopProductInsight {
  name: string;
  mensajes: number;
  growthLabel?: string;
  growthValue?: number;
}

const QUICK_ACTION_COLORS = {
  purple: {
    bg: 'bg-minddash-celeste-500/20',
    text: 'text-minddash-celeste-300',
  },
  green: {
    bg: 'bg-minddash-verde-500/20',
    text: 'text-minddash-verde-300',
  },
  blue: {
    bg: 'bg-minddash-celeste-500/20',
    text: 'text-minddash-celeste-300',
  },
} as const;

export default function AdminDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = '/dashboard/admin';
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartsData, setChartsData] = useState<ChartsDataset | null>(null);
  const [chartsLoading, setChartsLoading] = useState(false);
  const { applyThemeClass, isDark } = useThemeMode();
  const [analyticsRange, setAnalyticsRange] = useState<'3m' | '6m' | '12m'>('6m');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [productSummaries, setProductSummaries] = useState<ProductSummary[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const { getHistory, recordVisit } = useChatbotHistory();
  const [recentChatbots, setRecentChatbots] = useState(getHistory().slice(0, 5));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  const [isDebug, setIsDebug] = useState(false);

  // Check user role to determine which dashboard to show
  useEffect(() => {
    const authData = localStorage.getItem('evolve-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      setUserRole(parsed.role || '');
    }
  }, []);

  const isEditorRole = (userRole || '').toLowerCase() === 'editor';

  const readAuthToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return null;
      const auth = JSON.parse(authData);
      return typeof auth?.accessToken === 'string' ? auth.accessToken : null;
    } catch {
      return null;
    }
  }, []);


  const resolveSetupChatbotTarget = useCallback(() => {
    const summaryCandidate = productSummaries.find((summary) => summary.organizationId && summary.projectId);
    if (summaryCandidate?.organizationId && summaryCandidate?.projectId) {
      return {
        id: summaryCandidate.id,
        organizationId: summaryCandidate.organizationId,
        projectId: summaryCandidate.projectId,
      };
    }

    const history = getHistory();
    const historyCandidate = history.find((item) => item.organizationId && item.projectId);
    if (!historyCandidate) return null;

    return {
      id: historyCandidate.id,
      organizationId: historyCandidate.organizationId,
      projectId: historyCandidate.projectId,
    };
  }, [getHistory, productSummaries]);

  const navigateToChatbotSection = useCallback(
    (section: 'general' | 'fuentes' | 'alertas') => {
      const target = resolveSetupChatbotTarget();
      if (!target) {
        toast.info('Primero selecciona un chatbot desde el listado');
        router.push(`${basePath}/chatbots`);
        return;
      }

      router.push(
        `${basePath}/organizations/${target.organizationId}/projects/${target.projectId}/chatbots/${target.id}?section=${section}`
      );
    },
    [basePath, resolveSetupChatbotTarget, router]
  );

  const setupSteps = useMemo(() => {
    const hasChatbots = (dashboardStats?.totalProducts ?? 0) > 0 || productSummaries.length > 0;
    const hasAnyChannel = productSummaries.some((summary) => (summary.channels?.length ?? 0) > 0);
    const hasRagEnabled = productSummaries.some((summary) => Boolean(summary.isActiveRag));
    const hasAlertsEnabled = productSummaries.some((summary) => Boolean(summary.isActiveAlerts));

    return [
      {
        id: 'chatbot',
        title: 'Crear un chatbot',
        done: hasChatbots,
        icon: BotMessageSquare,
        onSelect: () => router.push(`${basePath}/chatbots`),
      },
      {
        id: 'channels',
        title: 'Conectar un canal',
        done: hasAnyChannel,
        icon: Link2,
        onSelect: () => navigateToChatbotSection('general'),
      },
      {
        id: 'rag',
        title: 'Subir fuentes',
        done: hasRagEnabled,
        icon: Book,
        onSelect: () => navigateToChatbotSection('fuentes'),
      },
      {
        id: 'alerts',
        title: 'Activar alertas',
        done: hasAlertsEnabled,
        icon: BellRing,
        onSelect: () => navigateToChatbotSection('alertas'),
      },
    ];
  }, [dashboardStats?.totalProducts, productSummaries, router, basePath, navigateToChatbotSection]);

  const [inboxNotifications, setInboxNotifications] = useState<
    Array<{
      id: string;
      title: string;
      description: string;
      createdAt?: string;
      group?: string;
      severity?: string;
      isRead?: boolean;
      actionLabel?: string;
      actionHref?: string;
    }>
  >([]);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [hideNextSteps, setHideNextSteps] = useState(false);
  const [dismissedSetupStepIds, setDismissedSetupStepIds] = useState<string[]>([]);
  const [pinnedQuickActionIds, setPinnedQuickActionIds] = useState<string[]>([]);
  const [pendingNotificationIds, setPendingNotificationIds] = useState<Record<string, true>>({});
  const [pendingPreferenceKeys, setPendingPreferenceKeys] = useState<Record<string, true>>({});

  const visibleSetupSteps = useMemo(() => {
    const dismissed = new Set(dismissedSetupStepIds);
    return setupSteps.filter((step) => !dismissed.has(step.id));
  }, [dismissedSetupStepIds, setupSteps]);

  const setupCompleted = useMemo(() => visibleSetupSteps.filter((step) => step.done).length, [visibleSetupSteps]);
  const setupTotal = visibleSetupSteps.length;
  const setupPending = Math.max(0, setupTotal - setupCompleted);
  const setupProgress = setupTotal > 0 ? Math.round((setupCompleted / setupTotal) * 100) : 0;

  const setupHasTarget = useMemo(() => Boolean(resolveSetupChatbotTarget()), [resolveSetupChatbotTarget]);

  const notificationsPending = useMemo(() => {
    const setupPendingForBadge = hideNextSteps ? 0 : setupPending;
    return setupPendingForBadge + inboxUnreadCount;
  }, [hideNextSteps, inboxUnreadCount, setupPending]);

  const quickActions = useMemo(() => {
    const base = [
      {
        id: 'chatbots',
        label: 'Ver Mis Chatbots',
        description: 'Accede a todos tus chatbots',
        icon: BotMessageSquare,
        color: 'purple' as const,
        onSelect: () => router.push(`${basePath}/chatbots`),
      },
      ...(!isEditorRole
        ? [
            {
              id: 'users',
              label: 'Nuevo Usuario',
              description: 'Invitar nuevo usuario',
              icon: Plus,
              color: 'green' as const,
              onSelect: () => router.push(`${basePath}/users`),
            },
          ]
        : []),
      {
        id: 'organizations',
        label: 'Ver Organizaciones',
        description: 'Gestionar organizaciones',
        icon: Database,
        color: 'blue' as const,
        onSelect: () => router.push(`${basePath}/organizations`),
      },
    ];

    const pinned = new Set(pinnedQuickActionIds);
    return [...base].sort((a, b) => {
      const ap = pinned.has(a.id);
      const bp = pinned.has(b.id);
      if (ap === bp) return 0;
      return ap ? -1 : 1;
    });
  }, [basePath, isEditorRole, pinnedQuickActionIds, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsDebug(new URLSearchParams(window.location.search).get('debug') === '1');
  }, []);

  // If user is super_admin, show the enhanced dashboard
  if (userRole === 'super_admin') {
    return <SuperAdminDashboard />;
  }

  // Función para cargar estadísticas del dashboard
  const loadDashboardStats = async (token: string) => {
    try {
      const response = await fetch(`/api/admin-client/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.stats) {
          setDashboardStats(result.data.stats);
        }
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      toast.error('Error al cargar estadísticas');
    }
  };

  const loadNotifications = async (token: string) => {
    try {
      const response = await fetch('/api/admin-client/notifications', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return;

      const result = await response.json();
      if (!result?.success) return;

      const notifications = Array.isArray(result?.data?.notifications) ? result.data.notifications : [];
      const unreadCount = typeof result?.data?.unreadCount === 'number' ? result.data.unreadCount : 0;
      const preferences = result?.data?.preferences;
      const nextHideNextSteps = typeof preferences?.hideNextSteps === 'boolean' ? preferences.hideNextSteps : false;
      const nextDismissedSetupStepIds = Array.isArray(preferences?.dismissedSetupStepIds)
        ? preferences.dismissedSetupStepIds.filter((v: any) => typeof v === 'string')
        : [];
      const nextPinnedQuickActionIds = Array.isArray(preferences?.pinnedQuickActionIds)
        ? preferences.pinnedQuickActionIds.filter((v: any) => typeof v === 'string')
        : [];

      setInboxNotifications(
        notifications.map((n: any) => ({
          id: String(n.id),
          title: String(n.title || ''),
          description: String(n.description || ''),
          createdAt: typeof n.createdAt === 'string' ? n.createdAt : undefined,
          group: typeof n.group === 'string' ? n.group : undefined,
          severity: typeof n.severity === 'string' ? n.severity : undefined,
          isRead: typeof n.isRead === 'boolean' ? n.isRead : undefined,
          actionLabel: typeof n.actionLabel === 'string' ? n.actionLabel : undefined,
          actionHref: typeof n.actionHref === 'string' ? n.actionHref : undefined,
        }))
      );
      setInboxUnreadCount(unreadCount);
      setHideNextSteps(nextHideNextSteps);
      setDismissedSetupStepIds(nextDismissedSetupStepIds);
      setPinnedQuickActionIds(nextPinnedQuickActionIds);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  };

  const isPendingNotification = useCallback(
    (id: string) => Boolean(pendingNotificationIds[id]),
    [pendingNotificationIds]
  );

  const setNotificationPending = useCallback((id: string, pending: boolean) => {
    setPendingNotificationIds((current) => {
      if (pending) return { ...current, [id]: true };
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const setPreferencePending = useCallback((key: string, pending: boolean) => {
    setPendingPreferenceKeys((current) => {
      if (pending) return { ...current, [key]: true };
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const postNotificationsAction = useCallback(
    async (action: string, ids?: string[]) => {
      const token = readAuthToken();
      if (!token) throw new Error('No auth token');

      const body: any = { action };
      if (Array.isArray(ids) && ids.length > 0) body.ids = ids;

      const response = await fetch('/api/admin-client/notifications', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const payload = await response.json();
          if (typeof payload?.message === 'string') message = payload.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
    },
    [readAuthToken]
  );

  const refreshNotificationsInBackground = useCallback(
    (delayMs = 350) => {
      const token = readAuthToken();
      if (!token) return;
      setTimeout(() => {
        loadNotifications(token);
      }, delayMs);
    },
    [readAuthToken]
  );

  const togglePinQuickActionOptimistic = useCallback(
    (actionId: string) => {
      const prev = pinnedQuickActionIds;
      const next = prev.includes(actionId) ? prev.filter((id) => id !== actionId) : [actionId, ...prev];
      setPinnedQuickActionIds(next);
      setPreferencePending('pins', true);

      postNotificationsAction('set_pinned_quick_actions', next)
        .then(() => {
          setPreferencePending('pins', false);
          refreshNotificationsInBackground(500);
        })
        .catch((error) => {
          console.error('Error fijando acciones rápidas:', error);
          setPinnedQuickActionIds(prev);
          setPreferencePending('pins', false);
          toast.error('No se pudieron guardar las acciones fijadas');
        });
    },
    [pinnedQuickActionIds, postNotificationsAction, refreshNotificationsInBackground, setPreferencePending]
  );

  const dismissNotificationOptimistic = useCallback(
    (id: string) => {
      const prevNotifications = inboxNotifications;
      const prevUnread = inboxUnreadCount;

      setNotificationPending(id, true);

      const removed = prevNotifications.find((n) => n.id === id);
      setInboxNotifications((current) => current.filter((n) => n.id !== id));
      if (removed && !removed.isRead) {
        setInboxUnreadCount((current) => Math.max(0, current - 1));
      }

      postNotificationsAction('dismiss', [id])
        .then(() => {
          setNotificationPending(id, false);
          refreshNotificationsInBackground();
        })
        .catch((error) => {
        console.error('Error descartando notificación:', error);
        setInboxNotifications(prevNotifications);
        setInboxUnreadCount(prevUnread);
        setNotificationPending(id, false);
        toast.error('No se pudo descartar la notificación');
      });
    },
    [inboxNotifications, inboxUnreadCount, postNotificationsAction, refreshNotificationsInBackground, setNotificationPending]
  );

  const markReadOptimistic = useCallback(
    (id: string) => {
      const prevNotifications = inboxNotifications;
      const prevUnread = inboxUnreadCount;

      setNotificationPending(id, true);

      const wasUnread = prevNotifications.some((n) => n.id === id && !n.isRead);
      setInboxNotifications((current) => current.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      if (wasUnread) {
        setInboxUnreadCount((current) => Math.max(0, current - 1));
      }

      postNotificationsAction('mark_read', [id])
        .then(() => {
          setNotificationPending(id, false);
          refreshNotificationsInBackground();
        })
        .catch((error) => {
        console.error('Error marcando como leído:', error);
        setInboxNotifications(prevNotifications);
        setInboxUnreadCount(prevUnread);
        setNotificationPending(id, false);
        toast.error('No se pudo marcar como leído');
      });
    },
    [inboxNotifications, inboxUnreadCount, postNotificationsAction, refreshNotificationsInBackground, setNotificationPending]
  );

  const markAllReadOptimistic = useCallback(() => {
    const prevNotifications = inboxNotifications;
    const prevUnread = inboxUnreadCount;

    setPreferencePending('mark_all_read', true);

    setInboxNotifications((current) => current.map((n) => ({ ...n, isRead: true })));
    setInboxUnreadCount(0);

    postNotificationsAction('mark_all_read')
      .then(() => {
        setPreferencePending('mark_all_read', false);
        refreshNotificationsInBackground();
      })
      .catch((error) => {
      console.error('Error marcando todas como leídas:', error);
      setInboxNotifications(prevNotifications);
      setInboxUnreadCount(prevUnread);
      setPreferencePending('mark_all_read', false);
      toast.error('No se pudieron marcar todas como leídas');
    });
  }, [inboxNotifications, inboxUnreadCount, postNotificationsAction, refreshNotificationsInBackground, setPreferencePending]);

  const hideNextStepsOptimistic = useCallback(() => {
    const prevHide = hideNextSteps;
    setHideNextSteps(true);

    setPreferencePending('hide_next_steps', true);
    postNotificationsAction('hide_next_steps')
      .then(() => {
        setPreferencePending('hide_next_steps', false);
        refreshNotificationsInBackground();
      })
      .catch((error) => {
      console.error('Error ocultando próximos pasos:', error);
      setHideNextSteps(prevHide);
      setPreferencePending('hide_next_steps', false);
      toast.error('No se pudieron ocultar los próximos pasos');
    });
  }, [hideNextSteps, postNotificationsAction, refreshNotificationsInBackground, setPreferencePending]);

  const showNextStepsOptimistic = useCallback(() => {
    const prevHide = hideNextSteps;
    setHideNextSteps(false);

    setPreferencePending('show_next_steps', true);
    postNotificationsAction('show_next_steps')
      .then(() => {
        setPreferencePending('show_next_steps', false);
        refreshNotificationsInBackground();
      })
      .catch((error) => {
      console.error('Error mostrando próximos pasos:', error);
      setHideNextSteps(prevHide);
      setPreferencePending('show_next_steps', false);
      toast.error('No se pudieron mostrar los próximos pasos');
    });
  }, [hideNextSteps, postNotificationsAction, refreshNotificationsInBackground, setPreferencePending]);

  const dismissSetupStepOptimistic = useCallback(
    (id: string) => {
      const prev = dismissedSetupStepIds;
      setDismissedSetupStepIds((current) => Array.from(new Set([...current, id])));

      setPreferencePending('dismiss_setup_steps', true);

      postNotificationsAction('dismiss_setup_steps', [id])
        .then(() => {
          setPreferencePending('dismiss_setup_steps', false);
          refreshNotificationsInBackground();
        })
        .catch((error) => {
        console.error('Error descartando próximo paso:', error);
        setDismissedSetupStepIds(prev);
        setPreferencePending('dismiss_setup_steps', false);
        toast.error('No se pudo descartar el próximo paso');
      });
    },
    [dismissedSetupStepIds, postNotificationsAction, refreshNotificationsInBackground, setPreferencePending]
  );

  useEffect(() => {
    const actionHrefs = Array.from(
      new Set(
        inboxNotifications
          .map((n) => n.actionHref)
          .filter((href): href is string => typeof href === 'string' && href.startsWith('/'))
      )
    );

    for (const href of actionHrefs) {
      try {
        router.prefetch(href);
      } catch {
        // ignore
      }
    }
  }, [inboxNotifications, router]);

  // Función para cargar datos de gráficos (con cache)
  const loadChartsData = async (token: string) => {
    // Verificar cache (5 minutos)
    const cacheKey = 'dashboard-charts-cache';
    const cacheTimeKey = 'dashboard-charts-cache-time';
    const cachedData = sessionStorage.getItem(cacheKey);
    const cacheTime = sessionStorage.getItem(cacheTimeKey);
    
    if (cachedData && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < 5 * 60 * 1000) { // 5 minutos
        setChartsData(JSON.parse(cachedData));
        setChartsLoading(false);
        return;
      }
    }
    
    setChartsLoading(true);
    try {
      const response = await fetch(`/api/admin-client/charts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setChartsData(result.data as ChartsDataset);
          // Guardar en cache
          sessionStorage.setItem(cacheKey, JSON.stringify(result.data));
          sessionStorage.setItem(cacheTimeKey, Date.now().toString());
        } else {
          console.error('Error en respuesta de gráficos:', result.message);
        }
      } else {
        console.error('Error HTTP al cargar gráficos:', response.status);
      }
    } catch (error) {
      console.error('Error cargando datos de gráficos:', error);
    } finally {
      setChartsLoading(false);
    }
  };

  const loadProductSummaries = async (token: string) => {
    try {
      setProductsLoading(true);
      const response = await fetch('/api/admin-client/products/stats', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('No se pudieron cargar las estadísticas de productos');
        return;
      }

      const result = await response.json();
      if (!result.stats || !Array.isArray(result.stats.topProducts)) {
        return;
      }

      // Usar los productos con estadísticas reales del endpoint
      const summaries: ProductSummary[] = result.stats.topProducts
        .map((product: any) => {
          return {
            id: product.id,
            name: product.nombre || 'Chatbot sin nombre',
            organizationId: product.organization_id || '',
            organizationName: product.organization_name || '',
            projectId: product.project_id || '',
            projectName: product.project_name || '',
            channels: Array.isArray(product.channels) ? product.channels : [],
            isActiveRag: Boolean(product.is_active_rag),
            isActiveAlerts: Boolean(product.is_active_alerts),
            isActiveInsight: Boolean(product.is_active_insight),
            mensajesMes: product.mensajes_mes || 0,
            totalMensajes: product.total_mensajes || 0,
            growthValue: product.crecimiento_mensual || 0,
            growthLabel: `${product.crecimiento_mensual >= 0 ? '+' : ''}${product.crecimiento_mensual}%`,
            promedioDiario: product.promedio_diario || 0
          } as ProductSummary;
        })
        .filter((summary: ProductSummary) => Boolean(summary.id))
        .slice(0, 4);

      setProductSummaries(summaries);
    } catch (error) {
      console.error('Error cargando productos para resumen:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  // Función para cargar datos del dashboard
  const loadDashboardData = async () => {
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;

      const auth = JSON.parse(authData);
      
      // Cargar datos críticos primero (stats y productos)
      await Promise.all([
        loadDashboardStats(auth.accessToken),
        loadProductSummaries(auth.accessToken),
        loadNotifications(auth.accessToken)
      ]);
      
      setLoading(false);
      setLastUpdated(new Date());
      
      // Cargar gráficos en segundo plano (no críticos)
      loadChartsData(auth.accessToken);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar los datos del dashboard');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    // Limpiar cache de gráficos al refrescar manualmente
    sessionStorage.removeItem('dashboard-charts-cache');
    sessionStorage.removeItem('dashboard-charts-cache-time');

    // Activar el loading global (skeleton) y feedback en el botón
    setIsRefreshing(true);
    setLoading(true);
    try {
      await loadDashboardData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredChartsData = useMemo(() => {
    if (!chartsData) return null;
    const limitMap: Record<typeof analyticsRange, number> = {
      '3m': 3,
      '6m': 6,
      '12m': 12,
    };

    const limit = limitMap[analyticsRange];
    const takeLast = <T,>(data: T[] = []) => {
      if (analyticsRange === '12m' || data.length <= limit) return data;
      return data.slice(-limit);
    };

    return {
      'user-growth': takeLast(chartsData['user-growth'] ?? []),
      'project-chatbots': takeLast(chartsData['project-chatbots'] ?? []),
      'monthly-metrics': takeLast(chartsData['monthly-metrics'] ?? []),
    } as ChartsDataset;
  }, [chartsData, analyticsRange]);

  const topProduct = useMemo<TopProductInsight | null>(() => {
    if (productSummaries.length > 0) {
      const top = [...productSummaries].sort((a, b) => b.mensajesMes - a.mensajesMes)[0];
      return {
        name: top.name,
        mensajes: top.mensajesMes,
        growthLabel: top.growthLabel,
        growthValue: top.growthValue,
      };
    }

    return null;
  }, [productSummaries]);

  const latestMonthlyMetric = useMemo(() => {
    const monthly = chartsData?.['monthly-metrics'];
    if (!Array.isArray(monthly) || monthly.length === 0) return null;
    return monthly[monthly.length - 1];
  }, [chartsData]);

  const userGrowthValue = useMemo(() => {
    const raw = dashboardStats?.userGrowth ?? '0%';
    const parsed = parseFloat(raw.replace('%', '').replace('+', '').replace(',', '.')) || 0;
    return {
      formatted: raw,
      positive: raw.includes('+') || parsed >= 0,
    };
  }, [dashboardStats?.userGrowth]);

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return null;
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(lastUpdated);
  }, [lastUpdated]);

  const userSparkline = useMemo<SparklineData>(() => {
    const source = filteredChartsData?.['user-growth'];
    if (!source) return [];
    return source.map((item) => ({ label: item.month, value: item.usuarios }));
  }, [filteredChartsData]);

  const engagementSparkline = useMemo<SparklineData>(() => {
    const source = filteredChartsData?.['monthly-metrics'];
    if (!source) return [];
    return source.map((item) => ({ label: item.mes, value: item.engagement ?? 0 }));
  }, [filteredChartsData]);

  const messagesSparkline = useMemo<SparklineData>(() => {
    const source = filteredChartsData?.['monthly-metrics'];
    if (!source) return [];
    return source.map((item) => ({ label: item.mes, value: item.mensajes ?? 0 }));
  }, [filteredChartsData]);

  // Cargar chatbots recientes desde localStorage
  const loadRecentChatbots = useCallback(() => {
    const history = getHistory().slice(0, 5);
    setRecentChatbots(history);
  }, [getHistory]);

  // Navegar a un chatbot y registrar en historial
  const navigateToChatbot = useCallback((chatbot: ProductSummary | { id: string; name: string; organizationId: string; projectId: string; isFavorite?: boolean }) => {
    const orgId = chatbot.organizationId;
    const projId = chatbot.projectId;

    if (!orgId || !projId) {
      toast.info('Navegando a través de Organizaciones para acceder al chatbot');
      router.push(`${basePath}/organizations`);
      return;
    }

    // Registrar visita en historial
    recordVisit({
      id: chatbot.id,
      name: chatbot.name,
      organizationId: orgId,
      projectId: projId,
      isFavorite: 'isFavorite' in chatbot ? chatbot.isFavorite : false
    });

    // Actualizar lista de recientes
    loadRecentChatbots();

    // Navegar al chatbot
    const path = `${basePath}/organizations/${orgId}/projects/${projId}/chatbots/${chatbot.id}`;
    router.push(path);
  }, [router, recordVisit, loadRecentChatbots, basePath]);

  useEffect(() => {
    loadDashboardData();
    loadRecentChatbots();
  }, []);

  if (loading) {
    return (
      <div className={applyThemeClass('min-h-screen bg-minddash-bg', 'min-h-screen bg-slate-50')}>
        {isDebug && (
          <div
            className={cn(
              'px-8 py-2 text-[11px] tracking-wide border-b',
              applyThemeClass('bg-minddash-surface text-gray-300 border-minddash-border', 'bg-white text-gray-700 border-gray-200')
            )}
          >
            DEBUG: src/app/dashboard/admin/page.tsx (loading)
          </div>
        )}

        <div className={cn(
          'relative px-8 py-6 border-b',
          applyThemeClass(
            'border-white/10 bg-minddash-surface shadow-sm',
            'border-black/10 bg-white text-gray-900 shadow-sm'
          )
        )}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <Skeleton className={applyThemeClass('h-8 w-40 bg-gray-700', 'h-8 w-40 bg-gray-200')} />
              <Skeleton className={applyThemeClass('h-4 w-64 bg-gray-800', 'h-4 w-64 bg-gray-100')} />
              <div className="flex items-center gap-3">
                <Skeleton className={applyThemeClass('h-5 w-28 bg-gray-800', 'h-5 w-28 bg-gray-100')} />
                <Skeleton className={applyThemeClass('h-4 w-32 bg-gray-800', 'h-4 w-32 bg-gray-100')} />
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
                <Skeleton className={applyThemeClass('h-8 w-16 bg-gray-800', 'h-8 w-16 bg-gray-100')} />
                <Skeleton className={applyThemeClass('h-8 w-16 bg-gray-800', 'h-8 w-16 bg-gray-100')} />
                <Skeleton className={applyThemeClass('h-8 w-16 bg-gray-800', 'h-8 w-16 bg-gray-100')} />
              </div>
              <Skeleton className={applyThemeClass('h-9 w-36 bg-gray-800', 'h-9 w-36 bg-gray-100')} />
            </div>
          </div>
        </div>

        <div className={`flex-1 px-8 py-8 ${applyThemeClass('bg-minddash-bg', 'bg-slate-50')}`}>
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card
                  key={index}
                  className={getBayerClasses(
                    applyThemeClass(
                      'border border-minddash-border bg-minddash-card text-white shadow-sm',
                      'border border-gray-200 bg-white text-gray-900 shadow-sm'
                    ),
                    'bayer-card shadow-sm'
                  )}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="space-y-2">
                      <Skeleton className={applyThemeClass('h-3 w-24 bg-gray-800', 'h-3 w-24 bg-gray-100')} />
                      <Skeleton className={applyThemeClass('h-7 w-20 bg-gray-700', 'h-7 w-20 bg-gray-200')} />
                    </div>
                    <Skeleton className={applyThemeClass('h-10 w-10 rounded-full bg-gray-800', 'h-10 w-10 rounded-full bg-gray-100')} />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className={applyThemeClass('h-3 w-40 bg-gray-800', 'h-3 w-40 bg-gray-100')} />
                    <Skeleton className={applyThemeClass('h-10 w-full bg-gray-800', 'h-10 w-full bg-gray-100')} />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div
              className={getBayerClasses(
                applyThemeClass(
                  'bg-minddash-surface border border-minddash-border rounded-xl p-6 shadow-sm',
                  'bg-white border border-gray-200 rounded-xl p-6 shadow-sm'
                ),
                'bayer-card rounded-xl p-6 shadow-sm'
              )}
            >
              <div className="flex items-center justify-between mb-6">
                <Skeleton className={applyThemeClass('h-5 w-40 bg-gray-800', 'h-5 w-40 bg-gray-100')} />
                <Skeleton className={applyThemeClass('h-8 w-24 bg-gray-800', 'h-8 w-24 bg-gray-100')} />
              </div>
              <Skeleton className={applyThemeClass('h-64 w-full bg-gray-800', 'h-64 w-full bg-gray-100')} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={applyThemeClass('min-h-screen bg-minddash-bg', 'min-h-screen bg-slate-50')}>
      {isDebug && (
        <div
          className={cn(
            'px-8 py-2 text-[11px] tracking-wide border-b',
            applyThemeClass('bg-minddash-surface text-gray-300 border-minddash-border', 'bg-white text-gray-700 border-gray-200')
          )}
        >
          DEBUG: src/app/dashboard/admin/page.tsx
        </div>
      )}
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'relative px-8 py-6 border-b',
          applyThemeClass(
            'border-white/10 bg-minddash-surface shadow-sm',
            'border-black/10 bg-white text-gray-900 shadow-sm'
          )
        )}
      >
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>
              Dashboard
            </h1>
            <p className={`mt-2 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
              Resumen de tu cuenta
            </p>
            {formattedLastUpdated && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Badge variant="outline" className={applyThemeClass('border-gray-700 text-gray-400', 'border-gray-300 text-gray-600')}>
                  Última actualización
                </Badge>
                <span className={applyThemeClass('text-gray-500', 'text-gray-500')}>
                  {formattedLastUpdated}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Tabs
              value={analyticsRange}
              onValueChange={(value) => setAnalyticsRange(value as typeof analyticsRange)}
              className="w-full sm:w-auto"
            >
              <TabsList
                className={cn(
                  'grid h-9 w-full grid-cols-3 rounded-lg border p-1',
                  applyThemeClass(
                    'border-gray-700 bg-minddash-elevated',
                    'border-gray-300 bg-white'
                  ),
                  'focus-within:outline-none focus-within:ring-2 focus-within:ring-minddash-celeste-500/40 focus-within:ring-offset-2',
                  applyThemeClass('focus-within:ring-offset-minddash-surface', 'focus-within:ring-offset-white')
                )}
              >
                {[
                  { value: '3m', label: '3M' },
                  { value: '6m', label: '6M' },
                  { value: '12m', label: '12M' },
                ].map((option) => (
                  <TabsTrigger
                    key={option.value}
                    value={option.value as typeof analyticsRange}
                    className={cn(
                      'h-7 rounded-md border text-xs font-semibold uppercase tracking-wide transition-colors',
                      applyThemeClass(
                        'border-gray-700 data-[state=active]:bg-minddash-elevated data-[state=active]:text-white',
                        'border-gray-300 data-[state=active]:bg-white data-[state=active]:text-gray-900'
                      ),
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minddash-celeste-500/50 focus-visible:ring-offset-2',
                      applyThemeClass('focus-visible:ring-offset-minddash-surface', 'focus-visible:ring-offset-white')
                    )}
                  >
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'relative inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                    applyThemeClass(
                      'border-gray-700 bg-minddash-elevated text-gray-200 hover:bg-minddash-card',
                      'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                    ),
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minddash-celeste-500/50 focus-visible:ring-offset-2',
                    applyThemeClass('focus-visible:ring-offset-minddash-surface', 'focus-visible:ring-offset-white'),
                    applyThemeClass('md-speech-tooltip md-speech-tooltip--dark', 'md-speech-tooltip md-speech-tooltip--light')
                  )}
                  aria-label="Notificaciones"
                  data-tooltip="Notificaciones"
                >
                  <Bell className="h-4 w-4" />
                  {notificationsPending > 0 && (
                    <span
                      className={cn(
                        'absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold',
                        applyThemeClass('bg-minddash-celeste-600 text-white', 'bg-minddash-celeste-600 text-white')
                      )}
                    >
                      {notificationsPending}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={cn(
                  'relative w-[360px] p-0 overflow-hidden',
                  applyThemeClass(
                    'border-white/10 bg-minddash-card/55 text-white backdrop-blur-xl shadow-2xl',
                    'border-white/40 bg-white/70 text-gray-900 backdrop-blur-xl shadow-xl'
                  )
                )}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute inset-0',
                    applyThemeClass('bg-gradient-to-b from-white/10 via-transparent to-transparent', 'bg-gradient-to-b from-white/60 via-transparent to-transparent')
                  )}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={applyThemeClass('text-white font-semibold', 'text-gray-900 font-semibold')}>
                        Notificaciones
                      </div>
                      <div className={applyThemeClass('text-gray-400 text-sm', 'text-gray-600 text-sm')}>
                        Novedades y próximos pasos.
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={applyThemeClass('border-gray-700 text-gray-300', 'border-gray-300 text-gray-700')}
                    >
                      {notificationsPending}
                    </Badge>
                  </div>
                </div>

                <DropdownMenuSeparator
                  className={applyThemeClass('bg-minddash-border', 'bg-gray-200')}
                />

                <div className="max-h-[320px] overflow-y-auto">
                  {inboxNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <div
                        className={cn(
                          'mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full',
                          applyThemeClass('bg-minddash-elevated', 'bg-gray-100')
                        )}
                      >
                        <CheckCircle2 className={applyThemeClass('h-6 w-6 text-minddash-verde-400', 'h-6 w-6 text-green-500')} />
                      </div>
                      <div className={applyThemeClass('text-white font-medium', 'text-gray-900 font-medium')}>
                        Todo en orden
                      </div>
                      <div className={applyThemeClass('text-gray-500 text-sm mt-1', 'text-gray-500 text-sm mt-1')}>
                        No hay notificaciones pendientes
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-minddash-border">
                      <TooltipProvider delayDuration={150}>
                        <AnimatePresence initial={false}>
                          {inboxNotifications.map((item) => {
                            const severityConfig = {
                              error: {
                                icon: AlertCircle,
                                bg: applyThemeClass('bg-red-500/10', 'bg-red-50'),
                                iconColor: applyThemeClass('text-red-400', 'text-red-600'),
                                border: applyThemeClass('border-l-red-500', 'border-l-red-500'),
                                label: 'Crítico',
                                badge: applyThemeClass('border-red-500/40 text-red-300', 'border-red-200 text-red-700'),
                              },
                              warning: {
                                icon: AlertTriangle,
                                bg: applyThemeClass('bg-amber-500/10', 'bg-amber-50'),
                                iconColor: applyThemeClass('text-amber-400', 'text-amber-600'),
                                border: applyThemeClass('border-l-amber-500', 'border-l-amber-500'),
                                label: 'Atención',
                                badge: applyThemeClass('border-amber-500/40 text-amber-200', 'border-amber-200 text-amber-700'),
                              },
                              success: {
                                icon: CheckCircle2,
                                bg: applyThemeClass('bg-green-500/10', 'bg-green-50'),
                                iconColor: applyThemeClass('text-green-400', 'text-green-600'),
                                border: applyThemeClass('border-l-green-500', 'border-l-green-500'),
                                label: 'OK',
                                badge: applyThemeClass('border-green-500/40 text-green-200', 'border-green-200 text-green-700'),
                              },
                              info: {
                                icon: Info,
                                bg: applyThemeClass('bg-blue-500/10', 'bg-blue-50'),
                                iconColor: applyThemeClass('text-blue-400', 'text-blue-600'),
                                border: applyThemeClass('border-l-blue-500', 'border-l-blue-500'),
                                label: 'Info',
                                badge: applyThemeClass('border-blue-500/40 text-blue-200', 'border-blue-200 text-blue-700'),
                              },
                            };
                            const config = severityConfig[(item.severity as keyof typeof severityConfig) || 'info'];
                            const SeverityIcon = config.icon;
                            const pending = isPendingNotification(item.id);

                            return (
                              <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: 24, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
                                className={cn(
                                  'group relative border-l-2 px-4 py-3 transition-colors',
                                  config.border,
                                  item.isRead
                                    ? applyThemeClass('bg-transparent', 'bg-transparent')
                                    : applyThemeClass('bg-minddash-elevated/50', 'bg-gray-50/50')
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', config.bg)}>
                                    <SeverityIcon className={cn('h-4 w-4', config.iconColor)} />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <div
                                            className={cn(
                                              'font-medium text-sm truncate',
                                              applyThemeClass('text-white', 'text-gray-900'),
                                              item.isRead && 'opacity-70'
                                            )}
                                          >
                                            {item.title}
                                          </div>
                                          <Badge variant="outline" className={cn('h-5 px-2 text-[10px] font-semibold', config.badge)}>
                                            {config.label}
                                          </Badge>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        {pending && (
                                          <Loader2 className={cn('h-3.5 w-3.5 animate-spin', applyThemeClass('text-gray-400', 'text-gray-500'))} />
                                        )}

                                        {!item.isRead && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                disabled={pending}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  markReadOptimistic(item.id);
                                                }}
                                                className={cn(
                                                  'h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
                                                  applyThemeClass('hover:bg-minddash-elevated text-gray-400 hover:text-gray-200', 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'),
                                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minddash-celeste-500/40 focus-visible:ring-offset-2',
                                                  applyThemeClass('focus-visible:ring-offset-minddash-surface', 'focus-visible:ring-offset-white')
                                                )}
                                              >
                                                <Check className="h-3.5 w-3.5" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Marcar como leído</TooltipContent>
                                          </Tooltip>
                                        )}

                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              disabled={pending}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                dismissNotificationOptimistic(item.id);
                                              }}
                                              className={cn(
                                                'h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
                                                applyThemeClass('hover:bg-minddash-elevated text-gray-400 hover:text-gray-200', 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'),
                                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minddash-celeste-500/40 focus-visible:ring-offset-2',
                                                applyThemeClass('focus-visible:ring-offset-minddash-surface', 'focus-visible:ring-offset-white')
                                              )}
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Descartar</TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </div>

                                    <div className={cn('text-xs mt-1', applyThemeClass('text-gray-400', 'text-gray-600'), item.isRead && 'opacity-70')}>
                                      {item.description}
                                    </div>

                                    {item.actionLabel && item.actionHref && (
                                      <div className="mt-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={pending}
                                          onClick={() => router.push(item.actionHref as string)}
                                          className={cn(
                                            'h-8 px-2.5 text-xs',
                                            applyThemeClass(
                                              'bg-minddash-celeste-600 text-white hover:bg-minddash-celeste-500',
                                              'bg-minddash-celeste-600 text-white hover:bg-minddash-celeste-500'
                                            )
                                          )}
                                        >
                                          {item.actionLabel}
                                          <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </TooltipProvider>
                    </div>
                  )}
                </div>

                {inboxUnreadCount > 0 && (
                  <>
                    <DropdownMenuSeparator className={applyThemeClass('bg-minddash-border', 'bg-gray-200')} />
                    <div className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={markAllReadOptimistic}
                        disabled={Boolean(pendingPreferenceKeys['mark_all_read'])}
                        className={cn(
                          'w-full justify-center gap-2 text-xs',
                          applyThemeClass('text-gray-400 hover:bg-minddash-elevated hover:text-gray-200', 'text-gray-600 hover:bg-gray-100 hover:text-gray-800')
                        )}
                      >
                        {pendingPreferenceKeys['mark_all_read'] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Marcar todo como leído
                      </Button>
                    </div>
                  </>
                )}

                <DropdownMenuSeparator className={applyThemeClass('bg-minddash-border', 'bg-gray-200')} />

                {!hideNextSteps && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className={applyThemeClass('text-gray-300 text-xs font-semibold uppercase tracking-wide', 'text-gray-600 text-xs font-semibold uppercase tracking-wide')}>
                          Próximos pasos
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={hideNextStepsOptimistic}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition-colors',
                              applyThemeClass('border-gray-700 text-gray-200 hover:bg-minddash-card', 'border-gray-200 text-gray-800 hover:bg-white')
                            )}
                            title="Ocultar próximos pasos"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            Ocultar
                          </button>

                          <span className={applyThemeClass('text-gray-400 text-xs', 'text-gray-500 text-xs')}>
                            {setupCompleted}/{setupTotal}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2">
                        <Progress value={setupProgress} className="h-2" />
                      </div>

                      {!setupHasTarget && (
                        <div
                          className={cn(
                            'mt-3 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs',
                            applyThemeClass('border-minddash-border bg-minddash-elevated text-gray-300', 'border-gray-200 bg-gray-50 text-gray-700')
                          )}
                        >
                          <span className="min-w-0 truncate">Para continuar, elegí un chatbot del listado.</span>
                          <button
                            type="button"
                            onClick={() => router.push(`${basePath}/chatbots`)}
                            className={cn(
                              'shrink-0 rounded-md border px-2 py-1 text-xs font-semibold transition-colors',
                              applyThemeClass(
                                'border-gray-700 text-gray-200 hover:bg-minddash-card',
                                'border-gray-200 text-gray-800 hover:bg-white'
                              )
                            )}
                          >
                            Ir a Chatbots
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-1">
                      <AnimatePresence initial={false}>
                        {visibleSetupSteps.map((step) => {
                          const Icon = step.icon;
                          return (
                            <motion.div
                              key={step.id}
                              layout
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 6 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.9 }}
                            >
                              <DropdownMenuItem
                                disabled={step.done}
                                onSelect={() => {
                                  if (step.done) return;
                                  step.onSelect();
                                }}
                                className={cn(
                                  'flex items-center gap-3 rounded-md px-3 py-2',
                                  step.done ? 'cursor-default' : 'cursor-pointer',
                                  applyThemeClass(
                                    'focus:bg-minddash-elevated focus:text-white',
                                    'focus:bg-gray-100 focus:text-gray-900'
                                  )
                                )}
                              >
                                <div
                                  className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-lg',
                                    step.done
                                      ? applyThemeClass('bg-minddash-elevated', 'bg-gray-100')
                                      : 'bg-minddash-celeste-500/20'
                                  )}
                                >
                                  {step.done ? (
                                    <CheckCircle2
                                      className={applyThemeClass('h-4 w-4 text-gray-400', 'h-4 w-4 text-gray-500')}
                                    />
                                  ) : (
                                    <Icon className="h-4 w-4 text-minddash-celeste-300" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div
                                    className={cn(
                                      'text-sm font-medium',
                                      step.done
                                        ? applyThemeClass('text-gray-500', 'text-gray-500')
                                        : applyThemeClass('text-white', 'text-gray-900')
                                    )}
                                  >
                                    {step.title}
                                  </div>
                                  <div className={applyThemeClass('text-gray-400 text-xs', 'text-gray-500 text-xs')}>
                                    {step.done ? 'Completado' : 'Pendiente'}
                                  </div>
                                </div>
                                {!step.done && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();

                                        dismissSetupStepOptimistic(step.id);
                                      }}
                                      className={cn(
                                        'rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors',
                                        applyThemeClass(
                                          'border-gray-700 text-gray-200 hover:bg-minddash-card',
                                          'border-gray-200 text-gray-800 hover:bg-white'
                                        )
                                      )}
                                    >
                                      Descartar
                                    </button>
                                    <ArrowUpRight className="h-4 w-4 text-gray-400" />
                                  </div>
                                )}
                              </DropdownMenuItem>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {hideNextSteps && (
                  <div className="p-3">
                    <div
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs',
                        applyThemeClass('border-minddash-border bg-minddash-elevated text-gray-300', 'border-gray-200 bg-gray-50 text-gray-700')
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <EyeOff className={applyThemeClass('h-4 w-4 text-gray-400', 'h-4 w-4 text-gray-500')} />
                        <span className="truncate">Próximos pasos ocultos</span>
                      </div>
                      <button
                        type="button"
                        onClick={showNextStepsOptimistic}
                        className={cn(
                          'shrink-0 rounded-md border px-2 py-1 text-xs font-semibold transition-colors',
                          applyThemeClass('border-gray-700 text-gray-200 hover:bg-minddash-card', 'border-gray-200 text-gray-800 hover:bg-white')
                        )}
                      >
                        Mostrar
                      </button>
                    </div>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                    applyThemeClass(
                      'border-gray-700 bg-minddash-elevated text-gray-200 hover:bg-minddash-card',
                      'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                    ),
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minddash-celeste-500/50 focus-visible:ring-offset-2',
                    applyThemeClass('focus-visible:ring-offset-minddash-surface', 'focus-visible:ring-offset-white'),
                    applyThemeClass('md-speech-tooltip md-speech-tooltip--dark', 'md-speech-tooltip md-speech-tooltip--light')
                  )}
                  aria-label="Acciones rápidas"
                  data-tooltip="Acciones rápidas"
                >
                  <WandSparkles className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={cn(
                  'relative w-[360px] p-0 overflow-hidden',
                  applyThemeClass(
                    'border-white/10 bg-minddash-card/55 text-white backdrop-blur-xl shadow-2xl',
                    'border-white/40 bg-white/70 text-gray-900 backdrop-blur-xl shadow-xl'
                  )
                )}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute inset-0',
                    applyThemeClass('bg-gradient-to-b from-white/10 via-transparent to-transparent', 'bg-gradient-to-b from-white/60 via-transparent to-transparent')
                  )}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={applyThemeClass('text-white font-semibold', 'text-gray-900 font-semibold')}>
                        Acciones rápidas
                      </div>
                      <div className={applyThemeClass('text-gray-400 text-sm', 'text-gray-600 text-sm')}>
                        Atajos para gestionar tu cuenta.
                      </div>
                    </div>
                  </div>
                </div>

                <DropdownMenuSeparator className={applyThemeClass('bg-minddash-border', 'bg-gray-200')} />

                <TooltipProvider delayDuration={150}>
                  {quickActions.map((action) => {
                  const Icon = action.icon;
                  const colorClasses = QUICK_ACTION_COLORS[action.color as keyof typeof QUICK_ACTION_COLORS];
                  const pinned = pinnedQuickActionIds.includes(action.id);
                  const pinBusy = Boolean(pendingPreferenceKeys['pins']);

                  return (
                    <DropdownMenuItem
                      key={action.id}
                      onSelect={() => action.onSelect()}
                      className={cn(
                        'group flex cursor-pointer items-start gap-3 px-3 py-2.5 outline-none',
                        applyThemeClass(
                          'focus:bg-minddash-elevated focus:text-white',
                          'focus:bg-gray-100 focus:text-gray-900'
                        )
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg',
                          colorClasses.bg
                        )}
                      >
                        <Icon className={cn('h-4 w-4', colorClasses.text)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={applyThemeClass('text-white text-sm font-medium', 'text-gray-900 text-sm font-medium')}>
                          {action.label}
                        </div>
                        <div className={applyThemeClass('text-gray-400 text-xs', 'text-gray-500 text-xs')}>
                          {action.description}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={pinBusy}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                togglePinQuickActionOptimistic(action.id);
                              }}
                              className={cn(
                                'h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
                                applyThemeClass('hover:bg-minddash-elevated text-gray-400 hover:text-gray-200', 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'),
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minddash-celeste-500/40 focus-visible:ring-offset-2',
                                applyThemeClass('focus-visible:ring-offset-minddash-surface', 'focus-visible:ring-offset-white')
                              )}
                            >
                              {pinBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Star
                                  className={cn(
                                    'h-3.5 w-3.5',
                                    pinned
                                      ? applyThemeClass('text-amber-300', 'text-amber-500')
                                      : applyThemeClass('text-gray-500', 'text-gray-400')
                                  )}
                                  fill={pinned ? 'currentColor' : 'none'}
                                />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{pinned ? 'Quitar de favoritos' : 'Fijar a favoritos'}</TooltipContent>
                        </Tooltip>

                        <ArrowUpRight
                          className={cn(
                            'mt-0.5 h-4 w-4',
                            applyThemeClass('text-gray-500', 'text-gray-400')
                          )}
                        />
                      </div>
                    </DropdownMenuItem>
                  );
                  })}
                </TooltipProvider>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                applyThemeClass(
                  'border-gray-700 text-gray-200 hover:bg-minddash-elevated',
                  'border-gray-300 text-gray-800 hover:bg-white'
                ),
                'h-9',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minddash-celeste-500/50 focus-visible:ring-offset-2',
                applyThemeClass('focus-visible:ring-offset-minddash-surface', 'focus-visible:ring-offset-white'),
                isRefreshing && 'opacity-75 cursor-not-allowed'
              )}
            >
              <RefreshCw
                className={cn(
                  'mr-2 h-4 w-4',
                  isRefreshing && 'animate-spin'
                )}
              />
              {isRefreshing ? 'Actualizando…' : 'Actualizar datos'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Contenido del panel */}
      <div className={`flex-1 px-8 py-8 overflow-y-auto ${applyThemeClass('', '')}`}>
        <div className="space-y-8">
          {/* Estadísticas principales */}
          <SectionCards
            applyThemeClass={applyThemeClass}
            cards={[
              {
                label: 'Usuarios totales',
                value: dashboardStats?.totalUsers ?? 0,
                icon: Users,
                helper: 'Usuarios registrados en Minddash',
                sparkline: userSparkline,
                sparklineColor: '#25a18e',
              },
              {
                label: 'Usuarios activos',
                value: dashboardStats?.activeUsers ?? 0,
                icon: Activity,
                helper: 'Actividad en los últimos 30 días',
                sparkline: messagesSparkline,
                sparklineColor: '#00a5cf',
              },
              {
                label: 'Chatbots publicados',
                value: dashboardStats?.totalProducts ?? 0,
                icon: Package,
                helper: 'Implementaciones vinculadas a proyectos',
                sparkline: productSummaries.map((summary, idx) => ({
                  label: summary.name || `Bot ${idx + 1}`,
                  value: summary.mensajesMes ?? 0,
                })),
                sparklineColor: '#007996',
              },
              {
                label: 'Crecimiento mensual',
                value: dashboardStats?.userGrowth ?? '0%',
                icon: TrendingUp,
                helper: 'Comparación vs. mes anterior',
                trend: userGrowthValue,
                sparkline: engagementSparkline,
                sparklineColor: '#f59e0b',
              },
            ]}
          />

          {/* Acceso rápido a chatbots */}
          {recentChatbots.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.25 }}
              className={getBayerClasses(
                applyThemeClass(
                  'relative overflow-hidden border border-minddash-border bg-minddash-card rounded-2xl p-6 shadow-sm',
                  'relative overflow-hidden border border-gray-200 bg-white rounded-2xl p-6 shadow-sm'
                ),
                'bayer-card rounded-2xl p-6 shadow-sm'
              )}
            >
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader className="p-0 pb-6">
                  <div className="flex items-center gap-3">
                    <div className={getBayerClasses(
                      applyThemeClass('bg-minddash-celeste-500/20 p-2 rounded-lg', 'bg-minddash-celeste-100 p-2 rounded-lg'),
                      'bayer-primary-bg/20 p-2 rounded-lg'
                    )}>
                      <Clock className={applyThemeClass('h-5 w-5 text-minddash-celeste-300', 'h-5 w-5 text-minddash-celeste-700')} />
                    </div>
                    <div>
                      <CardTitle className={applyThemeClass('text-white', 'text-gray-900')}>
                        Acceso Rápido
                      </CardTitle>
                      <CardDescription className={applyThemeClass('text-gray-400', 'text-gray-500')}>
                        Tus chatbots visitados recientemente
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <TooltipProvider>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {recentChatbots.map((chatbot) => (
                        <Tooltip key={chatbot.id}>
                          <TooltipTrigger asChild>
                            <motion.button
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => navigateToChatbot(chatbot)}
                              className={applyThemeClass(
                                'flex w-full items-center gap-3 rounded-xl border border-gray-700 bg-minddash-elevated px-4 py-3 text-left transition-all hover:border-minddash-celeste-500/70 hover:bg-minddash-card shadow-sm',
                                'flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition-all hover:border-minddash-celeste-500/50 hover:bg-white shadow-sm'
                              )}
                            >
                              <div className={getBayerClasses(
                                applyThemeClass('bg-minddash-celeste-500/20 p-2 rounded-lg', 'bg-minddash-celeste-100 p-2 rounded-lg'),
                                'bayer-primary-bg/20 p-2 rounded-lg'
                              )}>
                                <BotMessageSquare className={applyThemeClass('h-4 w-4 text-minddash-celeste-300', 'h-4 w-4 text-minddash-celeste-700')} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`truncate font-semibold text-sm ${applyThemeClass('text-white', 'text-gray-900')}`}>
                                  {chatbot.name}
                                </p>
                                <p className={`truncate text-xs ${applyThemeClass('text-gray-400', 'text-gray-500')}`}>
                                  {new Date(chatbot.lastVisited).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                              {chatbot.isFavorite && (
                                <Star
                                  fill="currentColor"
                                  className={applyThemeClass(
                                    'h-4 w-4 text-yellow-400 fill-yellow-400',
                                    'h-4 w-4 text-yellow-500 fill-yellow-500'
                                  )}
                                />
                              )}
                            </motion.button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span>
                              Abrir "{chatbot.name}" · Última visita:{' '}
                              {new Date(chatbot.lastVisited).toLocaleString('es-AR')}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Gráficos de analíticas */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.25 }}
            className={getBayerClasses(
              applyThemeClass(
                'relative overflow-hidden border border-minddash-border bg-minddash-card rounded-xl p-6 shadow-sm',
                'relative overflow-hidden border border-gray-200 bg-white rounded-xl p-6 shadow-sm'
              ),
              'bayer-card rounded-xl p-6 shadow-sm'
            )}
          >
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader className="p-0 pb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className={applyThemeClass('text-white', 'text-gray-900')}>
                      Analíticas y Reportes
                    </CardTitle>
                    <CardDescription className={applyThemeClass('text-gray-400', 'text-gray-500')}>
                      Tendencias agregadas de tus chatbots. Usá el rango superior para ajustar el período.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className={applyThemeClass(
                        'border-gray-700 text-gray-200 hover:bg-minddash-elevated',
                        'border-gray-300 text-gray-800 hover:bg-white'
                      )}
                    >
                      <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
                      Actualizar
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Separator className={applyThemeClass('bg-gray-800/70', 'bg-gray-200')} />

                <div className="pt-6">
                  {chartsLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Skeleton className={applyThemeClass('h-4 w-40 bg-gray-800', 'h-4 w-40 bg-gray-200')} />
                        <Skeleton className={applyThemeClass('h-64 w-full bg-gray-800', 'h-64 w-full bg-gray-200')} />
                      </div>
                      <div className="space-y-3">
                        <Skeleton className={applyThemeClass('h-4 w-44 bg-gray-800', 'h-4 w-44 bg-gray-200')} />
                        <Skeleton className={applyThemeClass('h-64 w-full bg-gray-800', 'h-64 w-full bg-gray-200')} />
                      </div>
                    </div>
                  ) : filteredChartsData ? (
                    <DashboardCharts chartsData={filteredChartsData} isDark={isDark} />
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700/60 px-6 py-10 text-center">
                      <div className={cn(
                        'mb-4 flex h-12 w-12 items-center justify-center rounded-full',
                        applyThemeClass('bg-gray-800/60', 'bg-gray-100')
                      )}>
                        <BarChart3 className={applyThemeClass('h-6 w-6 text-gray-400', 'h-6 w-6 text-gray-500')} />
                      </div>
                      <p className={applyThemeClass('text-gray-200 font-medium', 'text-gray-900 font-medium')}>
                        Aún no hay datos para graficar
                      </p>
                      <p className={applyThemeClass('text-gray-400 text-sm mt-1', 'text-gray-600 text-sm mt-1')}>
                        Cuando tus chatbots empiecen a recibir mensajes, vas a ver tendencias y comparaciones.
                      </p>
                      <div className="mt-5 flex items-center gap-2">
                        <Button type="button" variant="secondary" onClick={handleRefresh}>
                          Reintentar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Insights rápidos */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <Card className={getBayerClasses(
              applyThemeClass(
                'relative overflow-hidden border border-minddash-border bg-minddash-card text-white shadow-sm',
                'relative overflow-hidden border border-gray-200 bg-white text-gray-900 shadow-sm'
              ),
              'bayer-card shadow-sm'
            )}>
              <CardHeader>
                <CardTitle className="text-lg">Actividad destacada</CardTitle>
                <CardDescription className={applyThemeClass('text-gray-400', 'text-gray-500')}>
                  Principales productos por mensajes y actividad registrada
                </CardDescription>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className={applyThemeClass('h-5 w-44 bg-gray-800', 'h-5 w-44 bg-gray-200')} />
                    <Skeleton className={applyThemeClass('h-10 w-full bg-gray-800', 'h-10 w-full bg-gray-200')} />
                    <Skeleton className={applyThemeClass('h-10 w-full bg-gray-800', 'h-10 w-full bg-gray-200')} />
                  </div>
                ) : topProduct ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{topProduct.name}</p>
                        <p className={applyThemeClass('text-gray-400 text-xs', 'text-gray-500 text-xs')}>
                          {topProduct.mensajes} mensajes registrados
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={applyThemeClass('border-emerald-500 text-emerald-300', 'border-emerald-500 text-emerald-600')}
                      >
                        Actividad {topProduct.mensajes}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className={applyThemeClass('text-gray-400', 'text-gray-500')}>Intensidad</span>
                        <span className={applyThemeClass('text-gray-300', 'text-gray-700')}>
                          {topProduct.mensajes} msg
                        </span>
                      </div>
                      <Progress
                        value={(() => {
                          const max = Math.max(1, ...productSummaries.map((p) => p.mensajesMes ?? 0));
                          return Math.min(100, (topProduct.mensajes / max) * 100);
                        })()}
                        className={applyThemeClass('bg-gray-800', 'bg-gray-200')}
                      />
                    </div>

                    <Separator className={applyThemeClass('bg-gray-800', 'bg-gray-200')} />
                    <ul className="space-y-3 text-xs">
                      {productSummaries.slice(0, 3).map((summary) => (
                        <li key={summary.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{summary.name}</p>
                            <p className={applyThemeClass('text-gray-400', 'text-gray-500')}>
                              {summary.organizationName ? `${summary.organizationName} • ` : ''}
                              {summary.projectName || 'Proyecto sin nombre'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{summary.mensajesMes} msg</p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1',
                                      applyThemeClass(
                                        summary.growthValue >= 0 ? 'text-emerald-400' : 'text-rose-400',
                                        summary.growthValue >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                      )
                                    )}
                                  >
                                    {summary.growthValue >= 0 ? '↑' : '↓'} {summary.growthLabel}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <span>
                                    Variación vs. período anterior ({summary.growthValue.toFixed(1)}%)
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className={applyThemeClass('text-gray-400 text-sm', 'text-gray-600 text-sm')}>
                    Aún no hay actividad suficiente para mostrar este análisis.
                    Cuando los chatbots empiecen a generar mensajes, verás aquí cuáles se destacan.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className={getBayerClasses(
              applyThemeClass(
                'relative overflow-hidden border border-minddash-border bg-minddash-card text-white shadow-sm',
                'relative overflow-hidden border border-gray-200 bg-white text-gray-900 shadow-sm'
              ),
              'bayer-card shadow-sm'
            )}>
              <CardHeader>
                <CardTitle className="text-lg">Engagement mensual</CardTitle>
                <CardDescription className={applyThemeClass('text-gray-400', 'text-gray-500')}>
                  Últimos indicadores de participación por mes reportado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {chartsLoading ? (
                  <div className="grid gap-3">
                    <Skeleton className={applyThemeClass('h-4 w-32 bg-gray-800', 'h-4 w-32 bg-gray-200')} />
                    <Skeleton className={applyThemeClass('h-4 w-40 bg-gray-800', 'h-4 w-40 bg-gray-200')} />
                    <Skeleton className={applyThemeClass('h-4 w-36 bg-gray-800', 'h-4 w-36 bg-gray-200')} />
                    <Skeleton className={applyThemeClass('h-4 w-44 bg-gray-800', 'h-4 w-44 bg-gray-200')} />
                    <Skeleton className={applyThemeClass('h-8 w-full bg-gray-800', 'h-8 w-full bg-gray-200')} />
                  </div>
                ) : latestMonthlyMetric ? (
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className={applyThemeClass('text-gray-400', 'text-gray-500')}>Mes</span>
                      <span className="font-medium">{latestMonthlyMetric.mes}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={applyThemeClass('text-gray-400', 'text-gray-500')}>Usuarios</span>
                      <span className="font-medium">{latestMonthlyMetric.usuarios}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={applyThemeClass('text-gray-400', 'text-gray-500')}>Mensajes</span>
                      <span className="font-medium">{latestMonthlyMetric.mensajes}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={applyThemeClass('text-gray-400', 'text-gray-500')}>Engagement</span>
                      <Badge
                        variant="outline"
                        className={applyThemeClass('border-minddash-celeste-500 text-minddash-celeste-300', 'border-minddash-celeste-600 text-minddash-celeste-700')}
                      >
                        {latestMonthlyMetric.engagement ?? 0}%
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Progress
                        value={Math.min(100, Math.max(0, latestMonthlyMetric.engagement ?? 0))}
                        className={applyThemeClass('bg-gray-800', 'bg-gray-200')}
                      />
                      <p className={applyThemeClass('text-gray-500 text-xs', 'text-gray-600 text-xs')}>
                        Indicador normalizado (0-100).
                      </p>
                    </div>

                    <Separator className={applyThemeClass('bg-gray-800', 'bg-gray-200')} />
                    <p className={applyThemeClass('text-gray-400 text-xs', 'text-gray-600 text-xs')}>
                      Compara estos valores con períodos anteriores desde el selector superior para detectar tendencias y anticipar picos de demanda.
                    </p>
                  </div>
                ) : (
                  <p className={applyThemeClass('text-gray-400 text-sm', 'text-gray-600 text-sm')}>
                    No se encontraron registros mensuales recientes. Verifica que existan mensajes registrados en tus chatbots durante el período seleccionado.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className={getBayerClasses(
              applyThemeClass(
                'relative overflow-hidden border border-minddash-border bg-minddash-card text-white shadow-sm',
                'relative overflow-hidden border border-gray-200 bg-white text-gray-900 shadow-sm'
              ),
              'bayer-card shadow-sm'
            )}>
              <CardHeader>
                <CardTitle className="text-lg">Actividad reciente</CardTitle>
                <CardDescription className={applyThemeClass('text-gray-400', 'text-gray-500')}>
                  Últimas interacciones en los chatbots que administras
                </CardDescription>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, idx) => (
                      <div key={idx} className={applyThemeClass('rounded-xl border border-gray-800 bg-minddash-elevated p-4', 'rounded-xl border border-gray-200 bg-gray-50 p-4')}>
                        <Skeleton className={applyThemeClass('h-4 w-2/3 bg-gray-800', 'h-4 w-2/3 bg-gray-200')} />
                        <Skeleton className={applyThemeClass('mt-2 h-3 w-1/2 bg-gray-800', 'mt-2 h-3 w-1/2 bg-gray-200')} />
                        <Skeleton className={applyThemeClass('mt-3 h-8 w-full bg-gray-800', 'mt-3 h-8 w-full bg-gray-200')} />
                      </div>
                    ))}
                  </div>
                ) : productSummaries.length > 0 ? (
                  <div className="space-y-3">
                    {productSummaries.slice(0, 4).map((summary) => (
                      <motion.button
                        key={summary.id}
                        type="button"
                        onClick={() => navigateToChatbot(summary)}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={applyThemeClass(
                          'w-full rounded-xl border border-gray-800 bg-minddash-elevated p-4 text-left transition-all hover:border-minddash-celeste-500/70 hover:bg-minddash-card cursor-pointer',
                          'w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition-all hover:border-minddash-celeste-500/50 hover:bg-white cursor-pointer'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold truncate">{summary.name}</p>
                              <span className={applyThemeClass('text-gray-500 text-xs', 'text-gray-400 text-xs')}>→</span>
                            </div>
                            <p className={applyThemeClass('text-gray-500 text-xs truncate', 'text-gray-500 text-xs truncate')}>
                              {summary.organizationName ? `${summary.organizationName} • ` : ''}
                              {summary.projectName || 'Proyecto sin nombre'}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={applyThemeClass(
                              'border-minddash-celeste-500 text-minddash-celeste-300 ml-2',
                              'border-minddash-celeste-600 text-minddash-celeste-700 ml-2'
                            )}
                          >
                            {summary.mensajesMes} mensajes
                          </Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className={applyThemeClass('text-gray-500', 'text-gray-500')}>Total</span>
                            <p className="font-semibold">{summary.totalMensajes}</p>
                          </div>
                          <div>
                            <span className={applyThemeClass('text-gray-500', 'text-gray-500')}>Promedio</span>
                            <p className="font-semibold">{summary.promedioDiario.toFixed(1)}</p>
                          </div>
                          <div className="text-right">
                            <span className={applyThemeClass('text-gray-500', 'text-gray-500')}>Variación</span>
                            <p className={applyThemeClass(
                              summary.growthValue >= 0 ? 'text-minddash-verde-300 font-semibold' : 'text-rose-400 font-semibold',
                              summary.growthValue >= 0 ? 'text-minddash-verde-700 font-semibold' : 'text-rose-600 font-semibold'
                            )}>
                              {summary.growthValue >= 0 ? '↑' : '↓'} {summary.growthLabel}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <p className={applyThemeClass('text-gray-400 text-sm', 'text-gray-600 text-sm')}>
                    No se detectó actividad reciente en tus chatbots. Apenas se registren nuevas interacciones, verás aquí un resumen rápido para navegar al detalle.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
