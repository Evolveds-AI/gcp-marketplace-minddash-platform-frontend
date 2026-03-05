import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  type: 'user' | 'assistant';
  content: string;
  messageType?: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  client_name: string;
  messages?: Message[];
}

export const useConversations = (clientName: string = 'bayer') => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener el token de autenticación
  const getAuthToken = useCallback(() => {
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (authData) {
        const auth = JSON.parse(authData);
        return auth.accessToken;
      }
    } catch (e) {
      console.error('Error al obtener token:', e);
    }
    return null;
  }, []);

  // Cargar conversaciones del usuario
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        setError('No hay token de autenticación');
        return;
      }

      const response = await fetch(`/api/conversations?client_name=${clientName}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        const formattedConversations = result.data.conversations.map((conv: any) => ({
          ...conv,
          timestamp: new Date(conv.timestamp)
        }));
        setConversations(formattedConversations);
      } else {
        throw new Error(result.message || 'Error al cargar conversaciones');
      }
    } catch (err) {
      console.error('Error cargando conversaciones:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [clientName, getAuthToken]);

  // Cargar mensajes de una conversación específica
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('No hay token de autenticación');
        return;
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        const formattedMessages = result.data.messages.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        }));
        setMessages(formattedMessages);
        setActiveConversationId(conversationId);
      } else {
        throw new Error(result.message || 'Error al cargar mensajes');
      }
    } catch (err) {
      console.error('Error cargando mensajes:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }, [getAuthToken]);

  // Crear nueva conversación
  const createConversation = useCallback(async (title: string, initialMessage?: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('No hay token de autenticación');
        return null;
      }

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          client_name: clientName,
          initial_message: initialMessage
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        const newConversation = {
          ...result.data.conversation,
          timestamp: new Date(result.data.conversation.timestamp)
        };
        
        setConversations(prev => [newConversation, ...prev]);
        
        // Si hay mensaje inicial, cargar los mensajes
        if (initialMessage) {
          await loadMessages(newConversation.id);
        } else {
          setActiveConversationId(newConversation.id);
          setMessages([]);
        }
        
        return newConversation.id;
      } else {
        throw new Error(result.message || 'Error al crear conversación');
      }
    } catch (err) {
      console.error('Error creando conversación:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    }
  }, [clientName, getAuthToken, loadMessages]);

  // Agregar mensaje a conversación
  const addMessage = useCallback(async (conversationId: string, role: 'user' | 'assistant', content: string, messageType: string = 'text') => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('No hay token de autenticación');
        return;
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role,
          content,
          message_type: messageType
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        const newMessage: Message = {
          id: result.data.message.id,
          role: result.data.message.role,
          type: result.data.message.role, // Para compatibilidad
          content: result.data.message.content,
          messageType: result.data.message.message_type,
          createdAt: new Date(result.data.message.createdAt)
        };

        // Actualizar mensajes si es la conversación activa
        if (conversationId === activeConversationId) {
          setMessages(prev => [...prev, newMessage]);
        }

        // Actualizar última mensaje en la lista de conversaciones
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, lastMessage: content.substring(0, 50) + '...', timestamp: new Date() }
              : conv
          )
        );

        return newMessage;
      } else {
        throw new Error(result.message || 'Error al agregar mensaje');
      }
    } catch (err) {
      console.error('Error agregando mensaje:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }, [getAuthToken, activeConversationId]);

  // Seleccionar conversación activa
  const selectConversation = useCallback((conversationId: string) => {
    if (conversationId === activeConversationId) return;
    
    setActiveConversationId(conversationId);
    loadMessages(conversationId);
  }, [activeConversationId, loadMessages]);

  // Inicializar una nueva conversación con mensaje de bienvenida
  const initNewConversation = useCallback(async (welcomeMessage: string, userName: string = 'Usuario') => {
    const currentHour = new Date().getHours();
    const greeting = currentHour >= 5 && currentHour < 12 
      ? 'Buenos días' 
      : currentHour >= 12 && currentHour < 20 
        ? 'Buenas tardes' 
        : 'Buenas noches';
    
    const trimmedWelcome = welcomeMessage?.trim();
    const fullWelcomeMessage = trimmedWelcome && trimmedWelcome.length > 0
      ? trimmedWelcome
      : `${greeting}, ${userName}. ¿En qué puedo ayudarte hoy?`;

    return await createConversation('Nueva conversación', fullWelcomeMessage);
  }, [createConversation]);

  // Cargar conversaciones al inicializar
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    activeConversationId,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    createConversation,
    addMessage,
    selectConversation,
    initNewConversation,
    setMessages // Para compatibilidad temporal
  };
};
