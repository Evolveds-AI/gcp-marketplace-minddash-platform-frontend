'use client';

import { motion } from 'framer-motion';
import { FiTrendingUp, FiAlertCircle, FiCheckCircle, FiZap, FiTarget, FiActivity } from '@/lib/icons';

interface ChatbotInsightsProps {
  chatbotId: string;
  chatbotName: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function ChatbotInsights({ chatbotId, chatbotName, showNotification }: ChatbotInsightsProps) {
  const insights = [
    {
      id: '1',
      type: 'success',
      title: 'Mejora en Tasa de Respuesta',
      description: 'La tasa de respuesta ha aumentado un 15% en la última semana',
      impact: 'high',
      date: 'Hace 2 horas'
    },
    {
      id: '2',
      type: 'warning',
      title: 'Pico de Tráfico Detectado',
      description: 'Se detectó un aumento inusual de consultas entre las 14:00 y 16:00',
      impact: 'medium',
      date: 'Hace 5 horas'
    },
    {
      id: '3',
      type: 'info',
      title: 'Nuevo Patrón de Uso',
      description: 'Los usuarios están consultando más sobre "planes premium"',
      impact: 'medium',
      date: 'Hace 1 día'
    },
    {
      id: '4',
      type: 'success',
      title: 'Reducción de Errores',
      description: 'Los errores han disminuido un 23% desde la última actualización',
      impact: 'high',
      date: 'Hace 2 días'
    }
  ];

  const recommendations = [
    {
      title: 'Optimizar Horarios de Mayor Demanda',
      description: 'Considera aumentar recursos entre las 14:00 y 18:00 para mejorar tiempos de respuesta',
      priority: 'high'
    },
    {
      title: 'Actualizar Respuestas sobre Planes',
      description: 'El 35% de consultas sobre planes no están siendo respondidas correctamente',
      priority: 'high'
    },
    {
      title: 'Implementar Chat Proactivo',
      description: 'Usuarios que pasan más de 30s en la página de precios podrían beneficiarse de ayuda',
      priority: 'medium'
    }
  ];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return FiCheckCircle;
      case 'warning': return FiAlertCircle;
      case 'info': return FiActivity;
      default: return FiActivity;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-500 bg-green-900/20 border-green-800';
      case 'warning': return 'text-yellow-500 bg-yellow-900/20 border-yellow-800';
      case 'info': return 'text-blue-500 bg-blue-900/20 border-blue-800';
      default: return 'text-gray-500 bg-gray-900/20 border-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Insights Inteligentes</h3>
        <p className="text-gray-500 dark:text-gray-400">Análisis automático y recomendaciones basadas en IA</p>
      </div>

      {/* Métricas destacadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Insights Generados', value: '24', icon: FiZap, color: 'text-purple-500' },
          { label: 'Recomendaciones', value: '8', icon: FiTarget, color: 'text-blue-500' },
          { label: 'Precisión del Modelo', value: '94%', icon: FiTrendingUp, color: 'text-green-500' },
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-minddash-elevated border border-minddash-border rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{metric.label}</span>
                <Icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Insights recientes */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Insights Recientes</h4>
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = getInsightIcon(insight.type);
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-minddash-elevated border border-minddash-border rounded-lg p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg border flex-shrink-0 ${getInsightColor(insight.type)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h5 className="text-gray-900 dark:text-white font-semibold">{insight.title}</h5>
                      <span className="text-xs text-gray-500">{insight.date}</span>
                    </div>
                    <p className="text-sm text-gray-400">{insight.description}</p>
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        insight.impact === 'high' ? 'bg-red-900/50 text-red-300' : 'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        Impacto {insight.impact === 'high' ? 'Alto' : 'Medio'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Recomendaciones */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-minddash-elevated border border-minddash-border rounded-lg p-6"
      >
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <FiTarget className="w-5 h-5" />
          <span>Recomendaciones de IA</span>
        </h4>
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h5 className="text-gray-900 dark:text-white font-medium">{rec.title}</h5>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  rec.priority === 'high' ? 'bg-red-900/50 text-red-300' : 'bg-blue-900/50 text-blue-300'
                }`}>
                  Prioridad {rec.priority === 'high' ? 'Alta' : 'Media'}
                </span>
              </div>
              <p className="text-sm text-gray-400">{rec.description}</p>
              <button className="mt-3 text-sm text-green-400 hover:text-green-300 transition-colors">
                Aplicar recomendación →
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
