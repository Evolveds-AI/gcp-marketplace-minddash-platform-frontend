'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiAlertTriangle,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiMail,
  FiMessageCircle,
  FiUsers,
  FiSettings,
  FiSearch,
  FiFilter,
  FiEye,
  FiEyeOff
} from '@/lib/icons';
import ModalPortal from '@/components/ui/ModalPortal';
import { useThemeMode } from '@/hooks/useThemeMode';

interface Alert {
  id: number;
  name: string;
  description: string;
  metricId: number;
  metricName: string;
  condition: string;
  threshold: number;
  channels: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientAlertsProps {
  clientId: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function ClientAlerts({ clientId, showNotification }: ClientAlertsProps) {
  const { applyThemeClass } = useThemeMode();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Datos de ejemplo - en producción vendría de la API
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        // Simular carga de datos
        const mockAlerts: Alert[] = [
          {
            id: 1,
            name: 'Alerta de Usuarios Inactivos',
            description: 'Notificar cuando usuarios estén inactivos por más de 7 días',
            metricId: 1,
            metricName: 'Usuarios Activos',
            condition: 'less_than',
            threshold: 7,
            channels: ['email', 'slack'],
            isActive: true,
            createdAt: '2024-01-15',
            updatedAt: '2024-01-15'
          },
          {
            id: 2,
            name: 'Alerta de Bajo Rendimiento',
            description: 'Notificar cuando el rendimiento del chatbot baje del 80%',
            metricId: 2,
            metricName: 'Tasa de Respuesta',
            condition: 'less_than',
            threshold: 80,
            channels: ['email'],
            isActive: true,
            createdAt: '2024-01-14',
            updatedAt: '2024-01-14'
          },
          {
            id: 3,
            name: 'Alerta de Errores del Sistema',
            description: 'Notificar cuando ocurran errores críticos en el sistema',
            metricId: 3,
            metricName: 'Errores del Sistema',
            condition: 'greater_than',
            threshold: 5,
            channels: ['email', 'teams'],
            isActive: false,
            createdAt: '2024-01-13',
            updatedAt: '2024-01-13'
          }
        ];

        setAlerts(mockAlerts);
        setLoading(false);
      } catch (error) {
        console.error('Error cargando alertas:', error);
        showNotification('error', 'Error al cargar las alertas');
        setLoading(false);
      }
    };

    loadAlerts();
  }, [clientId, showNotification]);

  const filteredAlerts = alerts.filter(alert =>
    alert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.metricName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleAlertStatus = async (alertId: number) => {
    try {
      const updatedAlerts = alerts.map(alert =>
        alert.id === alertId ? { ...alert, isActive: !alert.isActive } : alert
      );
      setAlerts(updatedAlerts);
      showNotification('success', `Alerta ${updatedAlerts.find(a => a.id === alertId)?.isActive ? 'activada' : 'desactivada'} exitosamente`);
    } catch (error) {
      showNotification('error', 'Error al cambiar el estado de la alerta');
    }
  };

  const deleteAlert = async (alertId: number) => {
    try {
      const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
      setAlerts(updatedAlerts);
      showNotification('success', 'Alerta eliminada exitosamente');
    } catch (error) {
      showNotification('error', 'Error al eliminar la alerta');
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return FiMail;
      case 'slack': return FiMessageCircle;
      case 'teams': return FiUsers;
      default: return FiMail;
    }
  };

  const getConditionText = (condition: string, threshold: number) => {
    switch (condition) {
      case 'greater_than': return `Mayor que ${threshold}`;
      case 'less_than': return `Menor que ${threshold}`;
      case 'equal_to': return `Igual a ${threshold}`;
      default: return condition;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className="ml-3 text-gray-400">Cargando alertas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Alertas</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestiona las alertas automáticas basadas en métricas de tu empresa
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          <span>Nueva Alerta</span>
        </motion.button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar alertas..."
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

      {/* Lista de alertas */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <FiAlertTriangle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              {searchTerm ? 'No se encontraron alertas' : 'No hay alertas configuradas'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea tu primera alerta para monitorear tus métricas'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Crear Primera Alerta
              </button>
            )}
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-xl p-6 shadow-lg', 'bg-white border border-gray-200 rounded-xl p-6 shadow-sm')}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className={applyThemeClass('text-lg font-semibold text-white', 'text-lg font-semibold text-gray-900')}>{alert.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      alert.isActive
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {alert.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-gray-400 mb-3">{alert.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Métrica:</span>
                      <span className={applyThemeClass('text-white ml-2', 'text-gray-900 ml-2')}>{alert.metricName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Condición:</span>
                      <span className={applyThemeClass('text-white ml-2', 'text-gray-900 ml-2')}>{getConditionText(alert.condition, alert.threshold)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Canales:</span>
                      <div className="flex space-x-1 ml-2">
                        {alert.channels.map((channel) => {
                          const IconComponent = getChannelIcon(channel);
                          return (
                            <IconComponent key={channel} className="w-4 h-4 text-gray-400" />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => toggleAlertStatus(alert.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      alert.isActive
                        ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                        : 'text-green-400 hover:text-green-500 hover:bg-green-900/20'
                    }`}
                    title={alert.isActive ? 'Desactivar alerta' : 'Activar alerta'}
                  >
                    {alert.isActive ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setSelectedAlert(alert)}
                    className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    title="Editar alerta"
                  >
                    <FiEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    title="Eliminar alerta"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal de crear/editar alerta - placeholder para futura implementación */}
      <ModalPortal>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-xl p-6 max-w-md w-full mx-4', 'bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl')}>
              <h3 className={applyThemeClass('text-lg font-semibold text-white mb-4', 'text-lg font-semibold text-gray-900 mb-4')}>Crear Nueva Alerta</h3>
              <p className={applyThemeClass('text-gray-400 mb-4', 'text-gray-500 mb-4')}>
                Funcionalidad de creación de alertas próximamente disponible.
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
