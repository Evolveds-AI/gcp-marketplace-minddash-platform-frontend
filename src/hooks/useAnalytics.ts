import { useState, useEffect } from 'react';

interface WeeklyDataPoint {
  name: string;
  usuarios: number;
  clientes: number;
  conversaciones: number;
}

interface RealTimeStats {
  totalEvents: number;
  uniqueUsers: number;
  eventsByType: Record<string, number>;
  eventsByHour: Record<string, number>;
}

interface DailyMetric {
  id: string;
  date: Date;
  active_users: number;
  total_conversations: number;
  total_messages: number;
  total_events: number;
}

interface Trends {
  users: number;
  conversations: number;
  messages: number;
}

interface ConversationStats {
  totalConversations: number;
  avgConversationLength: number;
  avgConversationDuration: number;
  activeUsers: number;
  conversationGrowth: number;
}

interface AnalyticsData {
  weeklyData: WeeklyDataPoint[];
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalClients: number;
    totalConversations: number;
    totalMessages: number;
    userGrowthRate: number;
  };
  realTimeStats?: RealTimeStats;
  dailyMetrics?: DailyMetric[];
  trends?: Trends;
  conversationStats?: ConversationStats;
  loading: boolean;
  error: string | null;
}

export function useAnalytics(range: string = '7d', productId?: string) {
  const [data, setData] = useState<AnalyticsData>({
    weeklyData: [],
    overview: {
      totalUsers: 0,
      activeUsers: 0,
      totalClients: 0,
      totalConversations: 0,
      totalMessages: 0,
      userGrowthRate: 0
    },
    loading: true,
    error: null
  });

  useEffect(() => {
    loadAnalytics();
  }, [range, productId]);

  const loadAnalytics = async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        throw new Error('No hay datos de autenticación');
      }
      
      const auth = JSON.parse(authData);
      const token = auth.accessToken;
      
      if (!token) {
        throw new Error('No hay token de acceso');
      }

      // Construir query params
      const params = new URLSearchParams({
        range
      });
      
      if (productId && productId !== 'all') {
        params.append('productId', productId);
      }

      const response = await fetch(`/api/analytics/overview?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Dejar que el interceptor global maneje el refresh y/o modal
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setData({
          weeklyData: result.data.weeklyData || [],
          overview: {
            totalUsers: result.data.totalUsers || 0,
            activeUsers: result.data.activeUsers || 0,
            totalClients: result.data.totalClients || 0,
            totalConversations: result.data.totalConversations || 0,
            totalMessages: result.data.totalMessages || 0,
            userGrowthRate: result.data.userGrowthRate || 0
          },
          loading: false,
          error: null
        });
      } else {
        throw new Error(result.message || 'Error al cargar analytics');
      }

    } catch (error) {
      console.error('Error cargando analytics:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
      
      // Fallback a datos mock solo si hay error
      setData(prev => ({
        ...prev,
        weeklyData: [
          { name: 'Lun', usuarios: 0, clientes: 0, conversaciones: 0 },
          { name: 'Mar', usuarios: 0, clientes: 0, conversaciones: 0 },
          { name: 'Mié', usuarios: 0, clientes: 0, conversaciones: 0 },
          { name: 'Jue', usuarios: 0, clientes: 0, conversaciones: 0 },
          { name: 'Vie', usuarios: 0, clientes: 0, conversaciones: 0 },
          { name: 'Sáb', usuarios: 0, clientes: 0, conversaciones: 0 },
          { name: 'Dom', usuarios: 0, clientes: 0, conversaciones: 0 }
        ]
      }));
    }
  };

  const loadRealTimeAnalytics = async (clientId: string, days: number = 7) => {
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        throw new Error('No hay datos de autenticación');
      }
      
      const auth = JSON.parse(authData);
      const token = auth.accessToken;
      
      const params = new URLSearchParams({
        clientId,
        days: days.toString()
      });
      
      if (productId && productId !== 'all') {
        params.append('productId', productId);
      }

      const response = await fetch(`/api/analytics/real-time?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setData(prev => ({
          ...prev,
          realTimeStats: result.data.realTimeStats,
          dailyMetrics: result.data.dailyMetrics,
          trends: result.data.trends,
          loading: false,
          error: null
        }));
        
        return result.data;
      } else {
        throw new Error(result.error || 'Error al cargar analytics en tiempo real');
      }
    } catch (error) {
      console.error('Error cargando analytics en tiempo real:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
      throw error;
    }
  };

  const loadConversationAnalytics = async (clientId: string, days: number = 30, page: number = 1, limit: number = 20) => {
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        throw new Error('No hay datos de autenticación');
      }
      
      const auth = JSON.parse(authData);
      const token = auth.accessToken;
      
      const params = new URLSearchParams({
        clientId,
        days: days.toString(),
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (productId && productId !== 'all') {
        params.append('productId', productId);
      }

      const response = await fetch(`/api/analytics/conversations?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setData(prev => ({
          ...prev,
          conversationStats: result.data.metrics,
          loading: false,
          error: null
        }));
        
        return result.data;
      } else {
        throw new Error(result.error || 'Error al cargar analytics de conversaciones');
      }
    } catch (error) {
      console.error('Error cargando analytics de conversaciones:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
      throw error;
    }
  };

  const trackEvent = async (clientId: string, eventType: string, eventData?: any, userId?: string) => {
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        throw new Error('No hay datos de autenticación');
      }
      
      const auth = JSON.parse(authData);
      const token = auth.accessToken;

      const response = await fetch('/api/analytics/real-time', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          product_id: productId !== 'all' ? productId : undefined,
          user_id: userId,
          event_type: eventType,
          event_data: eventData
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error al registrar evento');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error registrando evento:', error);
      throw error;
    }
  };

  return {
    ...data,
    refresh: loadAnalytics,
    loadRealTimeAnalytics,
    loadConversationAnalytics,
    trackEvent
  };
}
