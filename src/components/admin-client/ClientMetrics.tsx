'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiBarChart,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiDatabase,
  FiTrendingUp,
  FiTrendingDown,
  FiActivity,
  FiSearch,
  FiFilter,
  FiEye,
  FiSettings,
  FiCode
} from '@/lib/icons';
import ModalPortal from '@/components/ui/ModalPortal';
import { useThemeMode } from '@/hooks/useThemeMode';

interface Metric {
  id: number;
  name: string;
  description: string;
  type: 'query' | 'calculated' | 'external';
  query?: string;
  dataSource: string;
  refreshInterval: number; // en minutos
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastValue?: number;
  lastUpdated?: string;
  trend?: 'up' | 'down' | 'stable';
}

interface ClientMetricsProps {
  clientId: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function ClientMetrics({ clientId, showNotification }: ClientMetricsProps) {
  const { applyThemeClass } = useThemeMode();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);

  // Datos de ejemplo - en producción vendría de la API
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        // Simular carga de datos
        const mockMetrics: Metric[] = [
          {
            id: 1,
            name: 'Usuarios Activos',
            description: 'Número de usuarios activos en los últimos 30 días',
            type: 'query',
            query: 'SELECT COUNT(*) FROM users WHERE last_login >= NOW() - INTERVAL 30 DAY',
            dataSource: 'PostgreSQL - Producción',
            refreshInterval: 60,
            isActive: true,
            createdAt: '2024-01-15',
            updatedAt: '2024-01-15',
            lastValue: 1250,
            lastUpdated: '2024-01-15 10:30:00',
            trend: 'up'
          },
          {
            id: 2,
            name: 'Tasa de Respuesta',
            description: 'Porcentaje de respuestas exitosas del chatbot',
            type: 'calculated',
            dataSource: 'API - Chatbot Service',
            refreshInterval: 15,
            isActive: true,
            createdAt: '2024-01-14',
            updatedAt: '2024-01-14',
            lastValue: 94.2,
            lastUpdated: '2024-01-15 10:25:00',
            trend: 'stable'
          },
          {
            id: 3,
            name: 'Errores del Sistema',
            description: 'Número de errores críticos en el sistema',
            type: 'external',
            dataSource: 'BigQuery - Analytics',
            refreshInterval: 30,
            isActive: true,
            createdAt: '2024-01-13',
            updatedAt: '2024-01-13',
            lastValue: 3,
            lastUpdated: '2024-01-15 10:20:00',
            trend: 'down'
          },
          {
            id: 4,
            name: 'Tiempo de Respuesta Promedio',
            description: 'Tiempo promedio de respuesta del chatbot en segundos',
            type: 'query',
            query: 'SELECT AVG(response_time) FROM chat_logs WHERE created_at >= NOW() - INTERVAL 1 HOUR',
            dataSource: 'PostgreSQL - Producción',
            refreshInterval: 5,
            isActive: false,
            createdAt: '2024-01-12',
            updatedAt: '2024-01-12',
            lastValue: 1.2,
            lastUpdated: '2024-01-15 10:15:00',
            trend: 'down'
          }
        ];

        setMetrics(mockMetrics);
        setLoading(false);
      } catch (error) {
        console.error('Error cargando métricas:', error);
        showNotification('error', 'Error al cargar las métricas');
        setLoading(false);
      }
    };

    loadMetrics();
  }, [clientId, showNotification]);

  const filteredMetrics = metrics.filter(metric =>
    metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    metric.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    metric.dataSource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleMetricStatus = async (metricId: number) => {
    try {
      const updatedMetrics = metrics.map(metric =>
        metric.id === metricId ? { ...metric, isActive: !metric.isActive } : metric
      );
      setMetrics(updatedMetrics);
      showNotification('success', `Métrica ${updatedMetrics.find(m => m.id === metricId)?.isActive ? 'activada' : 'desactivada'} exitosamente`);
    } catch (error) {
      showNotification('error', 'Error al cambiar el estado de la métrica');
    }
  };

  const deleteMetric = async (metricId: number) => {
    try {
      const updatedMetrics = metrics.filter(metric => metric.id !== metricId);
      setMetrics(updatedMetrics);
      showNotification('success', 'Métrica eliminada exitosamente');
    } catch (error) {
      showNotification('error', 'Error al eliminar la métrica');
    }
  };

  const getMetricTypeIcon = (type: string) => {
    switch (type) {
      case 'query': return FiDatabase;
      case 'calculated': return FiBarChart;
      case 'external': return FiTrendingUp;
      default: return FiActivity;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return <FiTrendingUp className="w-4 h-4 text-green-400" />;
      case 'down': return <FiTrendingDown className="w-4 h-4 text-red-400" />;
      default: return <FiActivity className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatValue = (value: number, type: string) => {
    if (type === 'Tasa de Respuesta' || type === 'Tiempo de Respuesta Promedio') {
      return `${value.toFixed(1)}${type === 'Tasa de Respuesta' ? '%' : 's'}`;
    }
    return value.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className="ml-3 text-gray-400">Cargando métricas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Métricas</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitorea y gestiona las métricas de rendimiento de tu empresa
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          <span>Nueva Métrica</span>
        </motion.button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar métricas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={applyThemeClass('w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-green-500 transition-colors', 'w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors')}
          />
        </div>
        <button className={applyThemeClass('flex items-center space-x-2 bg-minddash-elevated hover:bg-minddash-card text-gray-300 px-4 py-2 rounded-lg transition-colors', 'flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg transition-colors')}>
          <FiFilter className="w-4 h-4" />
          <span>Filtros</span>
        </button>
      </div>

      {/* Lista de métricas */}
      <div className="space-y-4">
        {filteredMetrics.length === 0 ? (
          <div className="text-center py-12">
            <FiBarChart className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              {searchTerm ? 'No se encontraron métricas' : 'No hay métricas configuradas'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea tu primera métrica para comenzar a monitorear tu empresa'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Crear Primera Métrica
              </button>
            )}
          </div>
        ) : (
          filteredMetrics.map((metric) => {
            const MetricIcon = getMetricTypeIcon(metric.type);
            return (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-xl p-6 shadow-lg', 'bg-white border border-gray-200 rounded-xl p-6 shadow-sm')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-green-600/20 rounded-lg">
                        <MetricIcon className="w-5 h-5 text-green-400" />
                      </div>
                      <h3 className={applyThemeClass('text-lg font-semibold text-white', 'text-lg font-semibold text-gray-900')}>{metric.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        metric.isActive
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {metric.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                      {metric.lastValue && (
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(metric.trend)}
                        </div>
                      )}
                    </div>
                    <p className="text-gray-400 mb-3">{metric.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Fuente de datos:</span>
                        <span className={applyThemeClass('text-white ml-2', 'text-gray-900 ml-2')}>{metric.dataSource}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tipo:</span>
                        <span className={applyThemeClass('text-white ml-2 capitalize', 'text-gray-900 ml-2 capitalize')}>{metric.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Actualización:</span>
                        <span className={applyThemeClass('text-white ml-2', 'text-gray-900 ml-2')}>Cada {metric.refreshInterval} min</span>
                      </div>
                    </div>

                    {metric.lastValue && (
                      <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-500 text-sm">Último valor:</span>
                            <span className={applyThemeClass('text-white font-semibold ml-2', 'text-gray-900 font-semibold ml-2')}>
                              {formatValue(metric.lastValue, metric.name)}
                            </span>
                          </div>
                          {metric.lastUpdated && (
                            <span className="text-xs text-gray-500">
                              {new Date(metric.lastUpdated).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {metric.query && (
                      <div className="mt-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <FiCode className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">Consulta SQL:</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-minddash-elevated/50 rounded p-3">
                          <code className="text-xs text-gray-300 font-mono">
                            {metric.query}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleMetricStatus(metric.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        metric.isActive
                          ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                          : 'text-green-400 hover:text-green-500 hover:bg-green-900/20'
                      }`}
                      title={metric.isActive ? 'Desactivar métrica' : 'Activar métrica'}
                    >
                      <FiEye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedMetric(metric)}
                      className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      title="Configurar métrica"
                    >
                      <FiSettings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMetric(metric.id)}
                      className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                      title="Eliminar métrica"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal de crear/editar métrica - placeholder para futura implementación */}
      <ModalPortal>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-xl p-6 max-w-md w-full mx-4', 'bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl')}>
              <h3 className={applyThemeClass('text-lg font-semibold text-white mb-4', 'text-lg font-semibold text-gray-900 mb-4')}>Crear Nueva Métrica</h3>
              <p className={applyThemeClass('text-gray-400 mb-4', 'text-gray-500 mb-4')}>
                Funcionalidad de creación de métricas próximamente disponible.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}
