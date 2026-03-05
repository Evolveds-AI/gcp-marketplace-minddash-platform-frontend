'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiTrash2, 
  FiEdit, 
  FiPlus, 
  FiMessageSquare, 
  FiSettings,
  FiX,
  TbRobot
} from '@/lib/icons';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import ModalPortal from '@/components/ui/ModalPortal';

interface Chatbot {
  id: string;
  name: string;
  company_name: string;
  gcp_name?: string;
  about?: string;
  suggested_prompts?: string[];
  example_questions?: string[];
  api_endpoint?: string;
  custom_prompt?: string;
  system_context?: string;
  welcome_message?: string;
}

interface ChatbotFormData {
  chatbot_id: string;
  chatbot_name: string;
  company_name: string;
  gcp_name: string;
  welcome_message: string;
  about: string;
  suggested_prompts: string[];
  example_questions: string[];
  api_endpoint: string;
  custom_prompt: string;
  system_context: string;
}

const ChatbotManagement: React.FC = () => {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChatbot, setEditingChatbot] = useState<Chatbot | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const [formData, setFormData] = useState<ChatbotFormData>({
    chatbot_id: '',
    chatbot_name: '',
    company_name: '',
    gcp_name: '',
    welcome_message: '',
    about: '',
    suggested_prompts: [],
    example_questions: [],
    api_endpoint: '',
    custom_prompt: '',
    system_context: ''
  });

  // Cargar chatbots al montar el componente
  useEffect(() => {
    fetchChatbots();
  }, []);

  const getAuthToken = () => {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) return null;
    const auth = JSON.parse(authData);
    return auth.accessToken;
  };

  // Obtener lista de chatbots
  const fetchChatbots = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/chatbots', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatbots(data.chatbots || []);
      } else {
        showNotification('Error al cargar chatbots', 'error');
      }
    } catch (error) {
      console.error('Error fetching chatbots:', error);
      showNotification('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      chatbot_id: '',
      chatbot_name: '',
      company_name: '',
      gcp_name: '',
      welcome_message: '',
      about: '',
      suggested_prompts: [],
      example_questions: [],
      api_endpoint: '',
      custom_prompt: '',
      system_context: ''
    });
    setEditingChatbot(null);
  };

  // Manejar cambios en el formulario
  const handleInputChange = (field: keyof ChatbotFormData, value: string) => {
    if (field === 'suggested_prompts' || field === 'example_questions') {
      const arrayValue = value.split('\n').filter(item => item.trim() !== '');
      setFormData(prev => ({ ...prev, [field]: arrayValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Mostrar notificación
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  // Abrir formulario para crear
  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Abrir formulario para editar
  const handleEdit = (chatbot: Chatbot) => {
    setEditingChatbot(chatbot);
    setFormData({
      chatbot_id: chatbot.id,
      chatbot_name: chatbot.name,
      company_name: chatbot.company_name,
      gcp_name: chatbot.gcp_name || '',
      welcome_message: chatbot.welcome_message || '',
      about: chatbot.about || '',
      suggested_prompts: chatbot.suggested_prompts || [],
      example_questions: chatbot.example_questions || [],
      api_endpoint: chatbot.api_endpoint || '',
      custom_prompt: chatbot.custom_prompt || '',
      system_context: chatbot.system_context || ''
    });
    setIsDialogOpen(true);
  };

  // Guardar chatbot (crear o actualizar)
  const handleSave = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const method = editingChatbot ? 'PUT' : 'POST';
      const url = '/api/admin/chatbots';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          id: editingChatbot?.id
        }),
      });

      if (response.ok) {
        showNotification(editingChatbot ? 'Chatbot actualizado' : 'Chatbot creado', 'success');
        setIsDialogOpen(false);
        fetchChatbots();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Error al guardar chatbot', 'error');
      }
    } catch (error) {
      console.error('Error saving chatbot:', error);
      showNotification('Error de conexión', 'error');
    }
  };

  // Eliminar chatbot
  const handleDelete = async (chatbotId: string) => {
    const confirmed = await confirm({
      title: 'Eliminar chatbot',
      description: '¿Estás seguro de que quieres eliminar este chatbot? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/chatbots', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: chatbotId }),
      });

      if (response.ok) {
        showNotification('Chatbot eliminado', 'success');
        fetchChatbots();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Error al eliminar chatbot', 'error');
      }
    } catch (error) {
      console.error('Error deleting chatbot:', error);
      showNotification('Error de conexión', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Cargando chatbots...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Gestión de Chatbots</h2>
            <p className="text-gray-400">Administra los chatbots del sistema</p>
          </div>
          <button 
            onClick={handleCreate} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-900/20"
          >
            <FiPlus className="h-4 w-4" />
            Nuevo Chatbot
          </button>
        </div>

        {/* Lista de Chatbots */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chatbots.map((chatbot) => (
            <motion.div 
              key={chatbot.id} 
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all backdrop-blur-sm hover:shadow-xl hover:shadow-purple-900/10 group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                    <TbRobot className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{chatbot.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(chatbot)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiEdit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(chatbot.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <p className="text-gray-400 text-sm mb-4 font-medium px-1 py-0.5 rounded bg-white/5 inline-block">{chatbot.company_name}</p>
              
              <div className="space-y-3">
                {chatbot.gcp_name && (
                  <div className="flex items-center gap-2 text-xs">
                    <FiSettings className="h-3.5 w-3.5 text-gray-500" />
                    <span className="text-gray-400 font-mono bg-black/30 px-1.5 py-0.5 rounded border border-white/5">{chatbot.gcp_name}</span>
                  </div>
                )}
                {chatbot.about && (
                  <div className="flex items-start gap-2">
                    <FiMessageSquare className="h-3.5 w-3.5 text-gray-500 mt-0.5" />
                    <p className="text-sm text-gray-400 line-clamp-2">{chatbot.about}</p>
                  </div>
                )}
                {chatbot.suggested_prompts && chatbot.suggested_prompts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/5">
                    {chatbot.suggested_prompts.slice(0, 2).map((prompt, index) => (
                      <span key={index} className="bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] px-2 py-1 rounded-full">
                        {prompt.length > 25 ? `${prompt.substring(0, 25)}...` : prompt}
                      </span>
                    ))}
                    {chatbot.suggested_prompts.length > 2 && (
                      <span className="bg-white/5 text-gray-400 border border-white/10 text-[10px] px-2 py-1 rounded-full">
                        +{chatbot.suggested_prompts.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Modal para crear/editar */}
        <ModalPortal>
          <AnimatePresence>
            {isDialogOpen && (
              <motion.div 
                className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDialogOpen(false)}
              >
              <motion.div 
                className="bg-[#121212]/95 border border-white/10 rounded-2xl p-0 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-white/5">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {editingChatbot ? 'Editar Chatbot' : 'Crear Nuevo Chatbot'}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {editingChatbot 
                        ? 'Modifica la configuración del chatbot'
                        : 'Configura un nuevo chatbot para el sistema'
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDialogOpen(false)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <div className="grid gap-6">
                    {/* Información básica */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">ID del Chatbot *</label>
                        <input
                          type="text"
                          value={formData.chatbot_id}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('chatbot_id', e.target.value)}
                          placeholder="ej: bayer-assistant"
                          disabled={!!editingChatbot}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Nombre del Chatbot *</label>
                        <input
                          type="text"
                          value={formData.chatbot_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('chatbot_name', e.target.value)}
                          placeholder="ej: Asistente Bayer"
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Nombre de la Empresa *</label>
                        <input
                          type="text"
                          value={formData.company_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('company_name', e.target.value)}
                          placeholder="ej: Bayer"
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">GCP Name</label>
                        <input
                          type="text"
                          value={formData.gcp_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('gcp_name', e.target.value)}
                          placeholder="ej: bayer-gcp"
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                    </div>

                    {/* Configuración de la API */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">API Endpoint</label>
                      <input
                        type="text"
                        value={formData.api_endpoint}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('api_endpoint', e.target.value)}
                        placeholder="ej: /api/bayer/chat"
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    {/* Prompts del sistema */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Configuración de IA</h3>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Prompt Personalizado *</label>
                        <textarea
                          value={formData.custom_prompt}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('custom_prompt', e.target.value)}
                          placeholder="Eres un asistente especializado en... Debes responder de manera..."
                          rows={4}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y min-h-[100px]"
                        />
                        <p className="text-xs text-gray-500">
                          Define el comportamiento y personalidad del chatbot. Este prompt se usará como contexto base.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Contexto del Sistema</label>
                        <textarea
                          value={formData.system_context}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('system_context', e.target.value)}
                          placeholder="Información adicional sobre la empresa, productos, servicios..."
                          rows={3}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y min-h-[80px]"
                        />
                        <p className="text-xs text-gray-500">
                          Información específica que el chatbot debe conocer sobre la empresa o dominio.
                        </p>
                      </div>
                    </div>

                    {/* Configuración de Interfaz */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Configuración de Interfaz</h3>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Mensaje de Bienvenida</label>
                        <textarea
                          value={formData.welcome_message}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('welcome_message', e.target.value)}
                          placeholder="¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?"
                          rows={2}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Descripción (About)</label>
                        <textarea
                          value={formData.about}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('about', e.target.value)}
                          placeholder="Descripción breve del chatbot y sus capacidades..."
                          rows={2}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Prompts Sugeridos (uno por línea)</label>
                        <textarea
                          value={Array.isArray(formData.suggested_prompts) ? formData.suggested_prompts.join('\n') : ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('suggested_prompts', e.target.value)}
                          placeholder="¿Cuáles son tus productos principales?\n¿Cómo puedo contactar soporte?\n¿Qué servicios ofrecen?"
                          rows={3}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Preguntas de Ejemplo (una por línea)</label>
                        <textarea
                          value={Array.isArray(formData.example_questions) ? formData.example_questions.join('\n') : ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('example_questions', e.target.value)}
                          placeholder="¿Qué es lo que hacen?\n¿Cuáles son sus horarios de atención?\n¿Cómo puedo hacer un pedido?"
                          rows={3}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 bg-white/5 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!formData.chatbot_id || !formData.chatbot_name || !formData.company_name || !formData.custom_prompt}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                  >
                    {editingChatbot ? 'Actualizar' : 'Crear'} Chatbot
                  </button>
                </div>
              </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </ModalPortal>

        {ConfirmDialog}
      </div>
    </div>
  );
};

export default ChatbotManagement;