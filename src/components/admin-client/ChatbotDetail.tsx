'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GeneralManagementView from './GeneralManagementView';
import ProjectPrompt from './ProjectPrompt';
import KnowledgeSourcesSection from './KnowledgeSourcesSection';
import PermissionsManagementView from './PermissionsManagementView';
import ChatbotMetrics from './ChatbotMetrics';
import ConnectionsView from './ConnectionsView';
import ChatbotAlerts from './ChatbotAlerts';
import ChatbotProfiling from './ChatbotProfiling';
import ChatbotInsights from './ChatbotInsights';
import ChatbotSemanticLayer from './ChatbotSemanticLayer';
import ExamplesManagementView from './ExamplesManagementView';
import { useThemeMode } from '@/hooks/useThemeMode';

interface ChatbotDetailProps {
  chatbotId: string;
  projectId: string;
  projectName: string;
  activeSection: string;
  generalTab?: 'general' | 'deploys';
  generalHideTabs?: boolean;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  onChatbotNameLoaded?: (name: string) => void;
  onChatbotMetaLoaded?: (meta: {
    description: string | null;
    tipo: string | null;
    label?: string | null;
    label_color?: string | null;
    created_at: string;
    updated_at: string;
  }) => void;
}

interface Chatbot {
  id: string;
  name: string;
  description: string | null;
  tipo: string | null;
  language?: string | null;
  label?: string | null;
  label_color?: string | null;
  welcome_message?: string | null;
  max_users?: number;
  mensajes_mes: number;
  is_active_rag?: boolean;
  is_active_alerts?: boolean;
  is_active_insight?: boolean;
  config?: any;
  project_id?: string;
  project_name?: string;
  organization_id?: string | null;
  created_at: string;
  updated_at: string;
}

export default function ChatbotDetail({
  chatbotId,
  projectId,
  projectName,
  activeSection,
  generalTab,
  generalHideTabs,
  showNotification,
  onChatbotNameLoaded,
  onChatbotMetaLoaded
}: ChatbotDetailProps) {
  const { applyThemeClass } = useThemeMode();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChatbotDetails();
  }, [chatbotId]);

  const loadChatbotDetails = async () => {
    try {
      setLoading(true);
      
      // Datos demo para chatbots
      if (chatbotId.startsWith('chatbot-')) {
        const mockChatbot: Chatbot = {
          id: chatbotId,
          name: chatbotId === 'chatbot-1' ? 'Asistente de Ventas' : chatbotId === 'chatbot-2' ? 'Bot de Soporte' : 'Asistente de Marketing',
          description: 'Chatbot de demostración con todas las funcionalidades',
          tipo: chatbotId === 'chatbot-1' ? 'Ventas' : chatbotId === 'chatbot-2' ? 'Soporte' : 'Marketing',
          mensajes_mes: Math.floor(Math.random() * 2000) + 500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setChatbot(mockChatbot);
        onChatbotNameLoaded?.(mockChatbot.name);
        onChatbotMetaLoaded?.({
          description: mockChatbot.description || null,
          tipo: mockChatbot.tipo || null,
          label: mockChatbot.label || null,
          label_color: mockChatbot.label_color || null,
          created_at: mockChatbot.created_at,
          updated_at: mockChatbot.updated_at,
        });
        setLoading(false);
        return;
      }

      const authData = localStorage.getItem('evolve-auth');
      
      if (!authData) {
        showNotification('error', 'No se encontró token de autenticación');
        setLoading(false);
        return;
      }

      const auth = JSON.parse(authData);
      const token = auth.accessToken;

      // Cargar detalles del chatbot
      const response = await fetch(`/api/admin-client/chatbots/${chatbotId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setChatbot(data.chatbot);
        onChatbotNameLoaded?.(data.chatbot.name);
        onChatbotMetaLoaded?.({
          description: data.chatbot.description || null,
          tipo: data.chatbot.tipo || null,
          label: data.chatbot.label || null,
          label_color: data.chatbot.label_color || null,
          created_at: data.chatbot.created_at,
          updated_at: data.chatbot.updated_at,
        });
      } else {
        showNotification('error', data.message || 'Error al cargar detalles del chatbot');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error cargando detalles del chatbot:', error);
      showNotification('error', 'Error al cargar los detalles del chatbot');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div
            className={applyThemeClass(
              'animate-spin rounded-full h-12 w-12 border-b-2 border-minddash-verde-500 mx-auto mb-4',
              'animate-spin rounded-full h-12 w-12 border-b-2 border-minddash-verde-500 mx-auto mb-4'
            )}
          ></div>
          <p className={applyThemeClass('text-gray-400', 'text-gray-600')}>Cargando detalles del chatbot...</p>
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className={applyThemeClass('text-gray-400', 'text-gray-600')}>No se encontró el chatbot</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contenido según sección activa */}
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        {activeSection === 'general' && (
          <GeneralManagementView 
            projectId={projectId}
            projectName={chatbot.name}
            chatbotId={chatbotId}
            showNotification={showNotification}
            initialTab={generalTab}
            hideTabs={generalHideTabs}
          />
        )}

        {activeSection === 'prompt' && (
          <ProjectPrompt 
            projectId={chatbotId}
            projectName={chatbot.name}
          />
        )}

        {activeSection === 'fuentes' && (
          <KnowledgeSourcesSection productId={chatbotId} />
        )}

        {activeSection === 'permisos' && (
          <PermissionsManagementView 
            projectId={projectId}
            projectName={chatbot.name}
            chatbotId={chatbotId}
            showNotification={showNotification}
          />
        )}

        {activeSection === 'conexiones' && (
          <ConnectionsView 
            organizationId={chatbot.organization_id || ''}
            productId={chatbotId}
            showNotification={showNotification}
          />
        )}

        {activeSection === 'metricas' && (
          <ChatbotMetrics 
            chatbotId={chatbotId}
            chatbotName={chatbot.name}
            showNotification={showNotification}
          />
        )}

        {activeSection === 'alertas' && (
          <ChatbotAlerts 
            chatbotId={chatbotId}
            chatbotName={chatbot.name}
            showNotification={showNotification}
          />
        )}

        {activeSection === 'profiling' && (
          <ChatbotProfiling 
            chatbotId={chatbotId}
            chatbotName={chatbot.name}
            showNotification={showNotification}
          />
        )}

        {activeSection === 'semantic' && (
          <ChatbotSemanticLayer 
            chatbotId={chatbotId}
            chatbotName={chatbot.name}
            showNotification={showNotification}
          />
        )}

        {activeSection === 'insights' && (
          <ChatbotInsights 
            chatbotId={chatbotId}
            chatbotName={chatbot.name}
            showNotification={showNotification}
          />
        )}

        {activeSection === 'examples' && (
          <ExamplesManagementView 
            productId={chatbotId}
          />
        )}
      </motion.div>
    </div>
  );
}
