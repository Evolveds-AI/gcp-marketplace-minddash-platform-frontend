'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  BarChart,
  DonutChart,
  LineChart,
} from '@tremor/react';
import { format, subDays, startOfDay } from 'date-fns';
import { TrendingUp, TrendingDown, Users, MessageSquare, Activity, Clock, RefreshCw } from 'lucide-react';

interface RealTimeData {
  realTimeStats: {
    totalEvents: number;
    uniqueUsers: number;
    eventsByType: Record<string, number>;
    eventsByHour: Record<string, number>;
  };
  dailyMetrics: Array<{
    id: string;
    date: Date;
    active_users: number;
    total_conversations: number;
    total_messages: number;
    total_events: number;
  }>;
  trends: {
    users: number;
    conversations: number;
    messages: number;
  };
  recentEvents: Array<{
    id: string;
    event_type: string;
    created_at: Date;
    user?: {
      id: string;
      nombre: string;
      email: string;
    };
    product?: {
      id: string;
      nombre: string;
    };
  }>;
}

interface RealTimeChartsProps {
  clientId: string;
  productId?: string;
  isAdmin?: boolean;
}

const RealTimeCharts: React.FC<RealTimeChartsProps> = ({ clientId, productId, isAdmin = false }) => {
  const [data, setData] = useState<RealTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState('7');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 segundos
  const [activeTab, setActiveTab] = useState('daily');

  // Para administradores sin clientId, usar analytics globales
  const useGlobalAnalytics = isAdmin && (!clientId || clientId.trim() === '');
  
  const fetchRealTimeData = async () => {
    try {
      let url: string;
      let params: URLSearchParams;
      
      if (useGlobalAnalytics) {
        // Usar endpoint de analytics globales para administradores
        params = new URLSearchParams({
          days: selectedDays,
        });
        url = `/api/analytics/global?${params}`;
      } else {
        // Usar endpoint normal para clientes específicos
        params = new URLSearchParams({
          clientId,
          days: selectedDays,
          ...(productId && { productId }),
        });
        url = `/api/analytics/real-time?${params}`;
      }

      const authData = localStorage.getItem('evolve-auth');
      const token = authData ? JSON.parse(authData).accessToken : null;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Error fetching real-time data');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealTimeData();
    
    // Configurar actualización automática
    const interval = setInterval(fetchRealTimeData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [clientId, productId, selectedDays, refreshInterval, useGlobalAnalytics]);

  const formatTrendValue = (value?: number) => {
    const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    const sign = v >= 0 ? '+' : '';
    return `${sign}${v.toFixed(1)}%`;
  };

  const getTrendIcon = (value?: number) => {
    const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return v >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getTrendColor = (value?: number) => {
    const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return v >= 0 ? 'emerald' : 'red';
  };

  // Preparar datos para gráficos
  const prepareChartData = () => {
    if (!data) return { dailyChart: [], hourlyChart: [], eventTypeChart: [] };

    const dailyMetrics = Array.isArray(data.dailyMetrics) ? data.dailyMetrics : [];
    const eventsByHour = data.realTimeStats?.eventsByHour || {};
    const eventsByType = data.realTimeStats?.eventsByType || {};
    const normalizeNumber = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    const totalEvents = normalizeNumber(data.realTimeStats?.totalEvents);
    const uniqueUsers = normalizeNumber(data.realTimeStats?.uniqueUsers);

    // Datos diarios
    const dailyChart = dailyMetrics.map(metric => ({
      date: format(new Date(metric.date), 'MMM dd'),
      'Usuarios Activos': metric.active_users ?? 0,
      'Conversaciones': metric.total_conversations ?? 0,
      'Mensajes': metric.total_messages ?? 0,
      'Eventos': metric.total_events ?? 0,
    }));

    // Datos por hora
    const hourlyChart = Object.entries(eventsByHour)
      .map(([hour, count]) => ({
        hour: format(new Date(hour), 'HH:mm'),
        'Eventos': count as number,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // Datos por tipo de evento
    const eventTypeChart = Object.entries(eventsByType)
      .map(([type, count]) => ({
        name: type.replace('_', ' ').toUpperCase(),
        value: count as number,
      }));

    return { dailyChart, hourlyChart, eventTypeChart, totalEvents, uniqueUsers };
  };

  const { dailyChart, hourlyChart, eventTypeChart, totalEvents, uniqueUsers } = prepareChartData();
  const safeDailyMetrics = Array.isArray(data?.dailyMetrics) ? data!.dailyMetrics : [];
  const normalizeNumber = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const safeRealTimeStats = data?.realTimeStats
    ? {
        totalEvents: normalizeNumber(data.realTimeStats.totalEvents),
        uniqueUsers: normalizeNumber(data.realTimeStats.uniqueUsers),
      }
    : { totalEvents: 0, uniqueUsers: 0 };
  const safeTrends = data?.trends
    ? {
        users: normalizeNumber(data.trends.users),
        conversations: normalizeNumber(data.trends.conversations),
        messages: normalizeNumber(data.trends.messages),
      }
    : { users: 0, conversations: 0, messages: 0 };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-destructive mb-4">Error: {error}</p>
            <Button
              onClick={fetchRealTimeData}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gradient-to-br from-[#1f1f1f] to-[#2a2a2a] border border-gray-800 rounded-xl p-6 shadow-lg space-y-6">
      {/* Controles */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white">
                {useGlobalAnalytics ? 'Analytics Globales del Sistema' : 'Dashboard de Analytics en Tiempo Real'}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {useGlobalAnalytics 
                  ? 'Monitoreo global de todos los clientes y usuarios del sistema'
                  : 'Monitoreo de eventos y métricas de usuario en tiempo real'
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2 text-gray-300">Intervalo de actualización</label>
              <Select value={refreshInterval.toString()} onValueChange={(value) => setRefreshInterval(Number(value))}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="10000" className="text-white hover:bg-gray-700">10 segundos</SelectItem>
                  <SelectItem value="30000" className="text-white hover:bg-gray-700">30 segundos</SelectItem>
                  <SelectItem value="60000" className="text-white hover:bg-gray-700">1 minuto</SelectItem>
                  <SelectItem value="300000" className="text-white hover:bg-gray-700">5 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2 text-gray-300">Días a mostrar</label>
              <Select value={selectedDays} onValueChange={(value) => setSelectedDays(value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="1" className="text-white hover:bg-gray-700">Último día</SelectItem>
                  <SelectItem value="7" className="text-white hover:bg-gray-700">Últimos 7 días</SelectItem>
                  <SelectItem value="30" className="text-white hover:bg-gray-700">Últimos 30 días</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-400">Eventos Totales</p>
                <p className="text-3xl font-bold text-white">{safeRealTimeStats.totalEvents}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-400">Usuarios Únicos</p>
                <p className="text-3xl font-bold text-white">{safeRealTimeStats.uniqueUsers}</p>
                <div className="flex items-center space-x-2">
                  {getTrendIcon(safeTrends.users)}
                  <span className={cn(
                    "text-sm font-medium px-2 py-1 rounded-full",
                    safeTrends.users >= 0 
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  )}>
                    {formatTrendValue(safeTrends.users)}
                  </span>
                </div>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-400">Conversaciones</p>
                <p className="text-3xl font-bold text-white">
                  {safeDailyMetrics.reduce((sum, m) => sum + (m.total_conversations ?? 0), 0)}
                </p>
                <div className="flex items-center space-x-2">
                  {getTrendIcon(safeTrends.conversations)}
                  <span className={cn(
                    "text-sm font-medium px-2 py-1 rounded-full",
                    safeTrends.conversations >= 0 
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  )}>
                    {formatTrendValue(safeTrends.conversations)}
                  </span>
                </div>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-400">Mensajes</p>
                <p className="text-3xl font-bold text-white">
                  {safeDailyMetrics.reduce((sum, m) => sum + (m.total_messages ?? 0), 0)}
                </p>
                <div className="flex items-center space-x-2">
                  {getTrendIcon(safeTrends.messages)}
                  <span className={cn(
                    "text-sm font-medium px-2 py-1 rounded-full",
                    safeTrends.messages >= 0 
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  )}>
                    {formatTrendValue(safeTrends.messages)}
                  </span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="mt-6">
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('daily')}
              className={cn(
                "py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === 'daily'
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-white hover:border-gray-500"
              )}
            >
              Tendencias Diarias
            </button>
            <button
              onClick={() => setActiveTab('hourly')}
              className={cn(
                "py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === 'hourly'
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-white hover:border-gray-500"
              )}
            >
              Actividad por Hora
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={cn(
                "py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === 'events'
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-white hover:border-gray-500"
              )}
            >
              Distribución de Eventos
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={cn(
                "py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === 'recent'
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-white hover:border-gray-500"
              )}
            >
              Eventos Recientes
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'daily' && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Métricas Diarias</CardTitle>
              </CardHeader>
              <CardContent>
                <AreaChart
                  className="h-72"
                  data={dailyChart}
                  index="date"
                  categories={['Usuarios Activos', 'Conversaciones', 'Mensajes', 'Eventos']}
                  colors={['blue', 'green', 'purple', 'orange']}
                  valueFormatter={(number: number) => number.toString()}
                  yAxisWidth={60}
                  showAnimation={true}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'hourly' && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Actividad por Hora</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  className="h-72"
                  data={hourlyChart}
                  index="hour"
                  categories={['Eventos']}
                  colors={['blue']}
                  valueFormatter={(number: number) => number.toString()}
                  yAxisWidth={60}
                  showAnimation={true}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'events' && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Distribución de Tipos de Eventos</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  className="h-72"
                  data={eventTypeChart}
                  category="value"
                  index="name"
                  valueFormatter={(number: number) => number.toString()}
                  colors={['blue', 'green', 'purple', 'orange', 'red', 'yellow']}
                  showAnimation={true}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'recent' && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Eventos Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {data.recentEvents.map((event) => (
                    <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-white">
                            {event.event_type.replace('_', ' ').toUpperCase()}
                          </p>
                          <p className="text-sm text-gray-400">
                            {event.user?.nombre || 'Usuario anónimo'}
                            {event.product && ` - ${event.product.nombre}`}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      {(event as any).event_data && (
                        <div className="mt-2 text-sm text-gray-400">
                          <pre className="whitespace-pre-wrap bg-gray-700/50 p-2 rounded text-xs">
                            {JSON.stringify((event as any).event_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimeCharts;