'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useChatbotHistory } from '@/hooks/useChatbotHistory';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  Clock,
  Database,
  Eye,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Star,
  TrendingUp,
  Users,
  Zap,
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
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  userGrowth: string;
  totalOrganizations: number;
  totalProjects: number;
  systemHealth: number;
  totalMessages: number;
}

type ChartsDataset = {
  'user-growth': Array<{ month: string; usuarios: number; total: number }>;
  'project-chatbots': Array<{ proyecto: string; chatbots: number }>;
  'monthly-metrics': Array<{ mes: string; usuarios: number; mensajes: number; engagement: number }>;
  'organization-usage': Array<{ organization: string; usage: number }>;
};

type SparklineData = Array<{ label: string; value: number }>;

interface OrganizationSummary {
  id: string;
  name: string;
  totalProjects: number;
  totalChatbots: number;
  totalUsers: number;
  totalMessages: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  lastActivity: string;
  growthRate: number;
}

interface TopOrganizationInsight {
  name: string;
  usage: number;
  growthLabel?: string;
  growthValue?: number;
  status: 'active' | 'inactive' | 'warning';
}

const SUPERADMIN_ACTION_COLORS = {
  purple: {
    bg: 'bg-minddash-celeste-500',
    text: 'text-minddash-celeste-300',
    border: 'border-minddash-celeste-500/30',
  },
  gold: {
    bg: 'bg-amber-500',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  red: {
    bg: 'bg-red-500',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  green: {
    bg: 'bg-minddash-verde-500',
    text: 'text-minddash-verde-300',
    border: 'border-minddash-verde-500/30',
  },
} as const;

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const basePath = '/dashboard/admin';
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartsData, setChartsData] = useState<ChartsDataset | null>(null);
  const [chartsLoading, setChartsLoading] = useState(false);
  const { applyThemeClass, isDark } = useThemeMode();
  const [analyticsRange, setAnalyticsRange] = useState<'3m' | '6m' | '12m'>('6m');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [organizationSummaries, setOrganizationSummaries] = useState<OrganizationSummary[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const { getHistory, recordVisit } = useChatbotHistory();
  const [recentChatbots, setRecentChatbots] = useState(getHistory().slice(0, 5));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [systemLogs] = useState<Array<{ id: string; type: 'error' | 'warn' | 'info'; message: string; ts: string }>>([
    // TODO: conectar a endpoint real de system logs cuando esté disponible
  ]);
  const systemHealth = dashboardStats?.systemHealth ?? 92;

  const dashboardChartsData = useMemo(() => {
    if (!chartsData) return null;
    return {
      'user-growth': chartsData['user-growth'] ?? [],
      'project-chatbots': chartsData['project-chatbots'] ?? [],
      'monthly-metrics': chartsData['monthly-metrics'] ?? [],
    };
  }, [chartsData]);

  // Cargar estadísticas del dashboard
  const loadDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin-client/dashboard', {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('evolve-auth') || '{}').accessToken}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar estadísticas');

      const data = await response.json();
      
      setDashboardStats({
        ...data,
        totalOrganizations: data.totalOrganizations || 0,
        totalProjects: data.totalProjects || 0,
        systemHealth: data.systemHealth ?? 100,
        totalMessages: data.totalMessages || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast.error('Error al cargar estadísticas del sistema');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos de organizaciones desde API real
  const loadOrganizations = useCallback(async () => {
    try {
      setOrganizationsLoading(true);
      const response = await fetch('/api/admin-client/organizations/stats', {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('evolve-auth') || '{}').accessToken}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar organizaciones');

      const json = await response.json();
      const orgs: OrganizationSummary[] = (json.organizations || []).map((org: any) => ({
        id: org.id,
        name: org.name || org.company_name || 'Sin nombre',
        totalProjects: org.projects_count || 0,
        totalChatbots: org.chatbots_count || 0,
        totalUsers: org.users_count || 0,
        totalMessages: org.messages_this_month || 0,
        healthStatus: org.chatbots_count > 0 ? 'healthy' : 'warning',
        lastActivity: org.updated_at || org.created_at || '',
        growthRate: 0,
      }));

      setOrganizationSummaries(orgs);
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error('Error al cargar organizaciones');
    } finally {
      setOrganizationsLoading(false);
    }
  }, []);

  const healthTone: 'destructive' | 'default' | 'secondary' =
    systemHealth >= 90 ? 'default' : systemHealth >= 70 ? 'secondary' : 'destructive';
  const healthLabel = systemHealth >= 90 ? 'Óptimo' : systemHealth >= 70 ? 'Atento' : 'Crítico';

  // Cargar datos de charts
  const loadChartsData = useCallback(async () => {
    try {
      setChartsLoading(true);
      const response = await fetch('/api/admin-client/charts', {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('evolve-auth') || '{}').accessToken}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar gráficos');

      const data = await response.json();
      
      // Enriquecer con datos de organizaciones
      setChartsData({
        ...data,
        'organization-usage': [
          { organization: 'Bayer Pharma', usage: 45230 },
          { organization: 'Evolveds AI', usage: 23450 },
          { organization: 'TechCorp', usage: 12340 },
          { organization: 'Healthcare Plus', usage: 5670 },
        ],
      });
    } catch (error) {
      console.error('Error loading charts data:', error);
      toast.error('Error al cargar datos de gráficos');
    } finally {
      setChartsLoading(false);
    }
  }, []);

  // Refresh manual
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadDashboardStats(),
      loadOrganizations(),
      loadChartsData(),
    ]);
    setLastUpdated(new Date());
    setIsRefreshing(false);
    toast.success('Datos actualizados');
  };

  useEffect(() => {
    loadDashboardStats();
    loadOrganizations();
    loadChartsData();
  }, [loadDashboardStats, loadOrganizations, loadChartsData]);

  // Acciones rápidas de super_admin
  const quickActions = [
    {
      icon: Plus,
      label: 'Crear Organización',
      description: 'Añadir nueva organización al sistema',
      color: SUPERADMIN_ACTION_COLORS.gold,
      onClick: () => router.push(`${basePath}/organizations?action=create`),
    },
    {
      icon: Users,
      label: 'Gestionar Usuarios',
      description: 'Administrar todos los usuarios del sistema',
      color: SUPERADMIN_ACTION_COLORS.purple,
      onClick: () => router.push(`${basePath}/users`),
    },
    {
      icon: Shield,
      label: 'Control del Sistema',
      description: 'Configuración global y monitoreo',
      color: SUPERADMIN_ACTION_COLORS.red,
      onClick: () => router.push(`${basePath}/settings?tab=system`),
    },
    {
      icon: Database,
      label: 'Data Access',
      description: 'Gestionar permisos de datos',
      color: SUPERADMIN_ACTION_COLORS.green,
      onClick: () => router.push(`${basePath}/settings?tab=data-access`),
    },
  ];

  // Renderizar tarjeta de estadística mejorada
  const renderStatCard = (title: string, value: string | number, icon: React.ReactNode, trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  }, color: string = '') => (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-300 hover:shadow-lg',
      applyThemeClass('bg-minddash-card border-minddash-border', 'bg-white border-gray-200')
    )}>
      {color ? <div className={cn('absolute left-0 top-0 h-full w-1', color)} /> : null}
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={cn(
              'text-sm font-medium mb-2',
              applyThemeClass('text-gray-400', 'text-gray-600')
            )}>
              {title}
            </p>
            <p className={cn(
              'text-3xl font-bold',
              applyThemeClass('text-white', 'text-gray-900')
            )}>
              {value}
            </p>
            {trend && (
              <div className={cn(
                'flex items-center mt-2 text-sm',
                trend.isPositive ? 'text-minddash-verde-300' : 'text-red-400'
              )}>
                <TrendingUp className="w-4 h-4 mr-1" />
                {trend.value}% {trend.label}
              </div>
            )}
          </div>
          <div className={cn(
            'p-3 rounded-lg',
            applyThemeClass('bg-minddash-elevated', 'bg-gray-100')
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Renderizar tarjeta de organización
  const renderOrganizationCard = (org: OrganizationSummary) => {
    const statusColors = {
      healthy: SUPERADMIN_ACTION_COLORS.green,
      warning: SUPERADMIN_ACTION_COLORS.gold,
      critical: SUPERADMIN_ACTION_COLORS.red,
    };

    return (
      <Card key={org.id} className={cn(
        'transition-all duration-300 hover:shadow-lg cursor-pointer',
        applyThemeClass('bg-minddash-card border-minddash-border', 'bg-white border-gray-200')
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`/api/organizations/${org.id}/avatar`} />
                <AvatarFallback>
                  <Building2 className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className={cn(
                  'font-semibold',
                  applyThemeClass('text-white', 'text-gray-900')
                )}>
                  {org.name}
                </h3>
                <Badge variant="outline" className={cn(
                  'mt-1',
                  statusColors[org.healthStatus].border,
                  statusColors[org.healthStatus].text
                )}>
                  {org.healthStatus === 'healthy' && 'Saludable'}
                  {org.healthStatus === 'warning' && 'Advertencia'}
                  {org.healthStatus === 'critical' && 'Crítico'}
                </Badge>
              </div>
            </div>
            <div className={cn(
              'text-right',
              org.growthRate > 0 ? 'text-minddash-verde-300' : 'text-red-400'
            )}>
              <div className="text-sm font-medium">
                {org.growthRate > 0 ? '+' : ''}{org.growthRate}%
              </div>
              <div className="text-xs opacity-70">crecimiento</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className={cn('text-xs', applyThemeClass('text-gray-400', 'text-gray-600'))}>
                Proyectos
              </p>
              <p className={cn('text-lg font-semibold', applyThemeClass('text-white', 'text-gray-900'))}>
                {org.totalProjects}
              </p>
            </div>
            <div>
              <p className={cn('text-xs', applyThemeClass('text-gray-400', 'text-gray-600'))}>
                Chatbots
              </p>
              <p className={cn('text-lg font-semibold', applyThemeClass('text-white', 'text-gray-900'))}>
                {org.totalChatbots}
              </p>
            </div>
            <div>
              <p className={cn('text-xs', applyThemeClass('text-gray-400', 'text-gray-600'))}>
                Usuarios
              </p>
              <p className={cn('text-lg font-semibold', applyThemeClass('text-white', 'text-gray-900'))}>
                {org.totalUsers}
              </p>
            </div>
            <div>
              <p className={cn('text-xs', applyThemeClass('text-gray-400', 'text-gray-600'))}>
                Mensajes
              </p>
              <p className={cn('text-lg font-semibold', applyThemeClass('text-white', 'text-gray-900'))}>
                {org.totalMessages.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className={cn('text-xs', applyThemeClass('text-gray-500', 'text-gray-500'))}>
              Última actividad: {org.lastActivity}
            </div>
          </div>

          {/* System Health (solo super_admin) */}
          <Card className={applyThemeClass('bg-minddash-surface border-minddash-border', 'bg-white border-gray-200')}>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-400" />
                  Salud del sistema
                </CardTitle>
                <CardDescription>Estado global de servicios, colas y errores 24h</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={healthTone}>{healthLabel}</Badge>
                <Button variant="outline" size="sm" onClick={() => setShowLogs(true)}>
                  Ver logs
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Salud general</p>
                <div className="text-3xl font-semibold">{systemHealth}%</div>
                <Progress value={systemHealth} className="h-2" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Errores 5xx (24h)</p>
                <div className="text-2xl font-semibold text-red-400">{Math.max(1, Math.round((100 - systemHealth) / 10))}</div>
                <p className="text-xs text-muted-foreground">Distribución estable</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Latencia media</p>
                <div className="text-2xl font-semibold">142 ms</div>
                <p className="text-xs text-muted-foreground">Objetivo &lt; 180 ms</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Colas en proceso</p>
                <div className="text-2xl font-semibold text-amber-300">3</div>
                <p className="text-xs text-muted-foreground">Sin backlog crítico</p>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => router.push(`${basePath}/organizations/${org.id}`)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header mejorado para super_admin */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'px-8 py-6 shadow-sm border-b',
          applyThemeClass('bg-minddash-surface border-minddash-border', 'bg-white border-gray-200')
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className={cn('h-6 w-6', applyThemeClass('text-amber-400', 'text-amber-600'))} />
              <Badge variant="outline" className={cn(
                SUPERADMIN_ACTION_COLORS.gold.border,
                SUPERADMIN_ACTION_COLORS.gold.text
              )}>
                SUPER ADMIN
              </Badge>
            </div>
            <h1 className={cn('text-3xl font-bold', applyThemeClass('text-white', 'text-gray-900'))}>
              Panel de Control Global
            </h1>
            <p className={cn('mt-2', applyThemeClass('text-gray-400', 'text-gray-600'))}>
              Visión completa de todas las organizaciones y el sistema
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                SUPERADMIN_ACTION_COLORS.purple.border,
                SUPERADMIN_ACTION_COLORS.purple.text
              )}
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
              Actualizar
            </Button>
            {lastUpdated && (
              <span className={cn('text-sm', applyThemeClass('text-gray-500', 'text-gray-500'))}>
                Actualizado: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      <div className="p-8">
        {/* Estadísticas globales mejoradas */}
        <div className="mb-8">
          <h2 className={cn('text-xl font-semibold mb-4', applyThemeClass('text-white', 'text-gray-900'))}>
            Métricas del Sistema
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {renderStatCard(
                'Organizaciones',
                dashboardStats?.totalOrganizations || 0,
                <Building2 className="w-6 h-6 text-amber-400" />,
                { value: 8.2, label: 'este mes', isPositive: true },
                SUPERADMIN_ACTION_COLORS.gold.bg
              )}
              {renderStatCard(
                'Proyectos Totales',
                dashboardStats?.totalProjects || 0,
                <Package className="w-6 h-6 text-minddash-celeste-300" />,
                { value: 12.5, label: 'este mes', isPositive: true }
              )}
              {renderStatCard(
                'Usuarios Activos',
                `${dashboardStats?.activeUsers || 0}/${dashboardStats?.totalUsers || 0}`,
                <Users className="w-6 h-6 text-minddash-verde-300" />,
                { value: 15.3, label: 'este mes', isPositive: true }
              )}
              {renderStatCard(
                'Salud del Sistema',
                `${dashboardStats?.systemHealth || 0}%`,
                <Activity className="w-6 h-6 text-minddash-celeste-300" />,
                { value: 2.1, label: 'esta semana', isPositive: false }
              )}
              {renderStatCard(
                'Chatbots',
                dashboardStats?.totalProducts || 0,
                <MessageSquare className="w-6 h-6 text-minddash-celeste-300" />,
                { value: 18.7, label: 'este mes', isPositive: true }
              )}
              {renderStatCard(
                'Mensajes Totales',
                (dashboardStats?.totalMessages || 0).toLocaleString(),
                <Zap className="w-6 h-6 text-yellow-400" />,
                { value: 22.4, label: 'este mes', isPositive: true }
              )}
              {renderStatCard(
                'Tasa Crecimiento',
                dashboardStats?.userGrowth || '0%',
                <TrendingUp className="w-6 h-6 text-minddash-verde-300" />,
                { value: 5.8, label: 'este mes', isPositive: true }
              )}
              {renderStatCard(
                'Alertas Activas',
                '3',
                <AlertTriangle className="w-6 h-6 text-red-400" />,
                { value: -10.2, label: 'esta semana', isPositive: true }
              )}
            </div>
          )}
        </div>

        {/* Acciones rápidas de super_admin */}
        <div className="mb-8">
          <h2 className={cn('text-xl font-semibold mb-4', applyThemeClass('text-white', 'text-gray-900'))}>
            Acciones Rápidas
          </h2>
          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={action.onClick}
                        className={cn(
                          'h-auto w-full justify-between rounded-xl px-4 py-4 transition-all duration-300 hover:shadow-lg',
                          action.color.border,
                          applyThemeClass('bg-minddash-surface', 'bg-white')
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg border',
                            action.color.border,
                            applyThemeClass('bg-minddash-elevated', 'bg-gray-100')
                          )}>
                            <action.icon className={cn('w-5 h-5', action.color.text)} />
                          </div>
                          <div className="text-left">
                            <p className={cn('font-semibold', applyThemeClass('text-white', 'text-gray-900'))}>
                              {action.label}
                            </p>
                            <p className={cn('text-xs mt-1', applyThemeClass('text-gray-400', 'text-gray-600'))}>
                              {action.description}
                            </p>
                          </div>
                        </div>
                        <ArrowUpRight className={applyThemeClass('text-gray-500', 'text-gray-400')} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>{action.description}</span>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              ))}
            </div>
          </TooltipProvider>
        </div>

        {/* Tabs con diferentes vistas */}
        <Tabs defaultValue="organizations" className="mb-8">
          <TabsList className={cn(
            'grid w-full grid-cols-4',
            applyThemeClass('bg-minddash-elevated', 'bg-gray-100')
          )}>
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organizaciones
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Uso del Sistema
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Salud del Sistema
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Actividad Reciente
            </TabsTrigger>
          </TabsList>

          {/* Vista de organizaciones */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn('text-lg font-semibold', applyThemeClass('text-white', 'text-gray-900'))}>
                Todas las Organizaciones
              </h3>
              <Button
                onClick={() => router.push(`${basePath}/organizations`)}
                className={cn('bg-amber-500 text-white hover:bg-amber-600', SUPERADMIN_ACTION_COLORS.gold.border)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Todas
              </Button>
            </div>
            
            {organizationsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {organizationSummaries.map(renderOrganizationCard)}
              </div>
            )}
          </div>
        </Tabs>

        {/* Gráficos del sistema */}
        <div className="mt-8">
          <Card className={cn(
            applyThemeClass('bg-minddash-surface border border-minddash-border', 'bg-white border border-gray-200'),
            'shadow-lg'
          )}>
            <CardHeader>
              <CardTitle className={applyThemeClass('text-white', 'text-gray-900')}>Análisis del Sistema</CardTitle>
              <CardDescription className={applyThemeClass('text-gray-400', 'text-gray-500')}>
                Visualización agregada del uso de la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
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
              ) : dashboardChartsData ? (
                <DashboardCharts chartsData={dashboardChartsData} isDark={isDark} />
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
