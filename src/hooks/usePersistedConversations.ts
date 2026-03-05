import { useState, useEffect, useCallback } from 'react';
import { Conversation } from '@/lib/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  type: 'user' | 'assistant';
  content: string;
  messageType?: string;
  metadata?: any;
  createdAt: Date;
}

interface UsePersistedConversationsOptions {
  productId?: string;
  enabled?: boolean;
}

export const usePersistedConversations = (options: UsePersistedConversationsOptions = {}) => {
  const { productId, enabled = true } = options;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Cargar conversaciones del servidor
  const loadConversations = useCallback(async () => {
    if (!enabled) return;
    
    const token = getAuthToken();
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = productId 
        ? `/api/conversations?product_id=${productId}`
        : '/api/conversations';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        const formattedConversations: Conversation[] = result.data.conversations.map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          lastMessage: conv.lastMessage || '',
          timestamp: new Date(conv.timestamp),
          messages: []
        }));
        setConversations(formattedConversations);
      }
    } catch (err) {
      console.error('[usePersistedConversations] Error loading:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [productId, enabled, getAuthToken]);

  // Crear nueva conversación
  const createConversation = useCallback(async (title: string, initialMessage?: string): Promise<string | null> => {
    const token = getAuthToken();
    if (!token) {
      return null;
    }

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          product_id: productId,
          initial_message: initialMessage
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        const newConversation: Conversation = {
          id: result.data.conversation.id,
          title: result.data.conversation.title,
          lastMessage: result.data.conversation.lastMessage || '',
          timestamp: new Date(result.data.conversation.timestamp),
          messages: []
        };
        
        setConversations(prev => [newConversation, ...prev]);
        return newConversation.id;
      }
    } catch (err) {
      console.error('[usePersistedConversations] Error creating:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
    return null;
  }, [productId, getAuthToken]);

  // Agregar mensaje a conversación
  const addMessage = useCallback(async (
    conversationId: string, 
    role: 'user' | 'assistant', 
    content: string,
    messageType: string = 'text',
    metadata?: any
  ): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role,
          content,
          message_type: messageType,
          metadata
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Actualizar última mensaje en la lista local
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, lastMessage: content.substring(0, 100), timestamp: new Date() }
              : conv
          )
        );
        return true;
      }
    } catch (err) {
      console.error('[usePersistedConversations] Error adding message:', err);
    }
    return false;
  }, [getAuthToken]);

  // Cargar mensajes de una conversación
  const loadMessages = useCallback(async (conversationId: string): Promise<Message[]> => {
    const token = getAuthToken();
    if (!token) return [];

    try {
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
        return result.data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          type: msg.role,
          content: msg.content,
          messageType: msg.messageType,
          metadata: msg.metadata,
          createdAt: new Date(msg.createdAt)
        }));
      }
    } catch (err) {
      console.error('[usePersistedConversations] Error loading messages:', err);
    }
    return [];
  }, [getAuthToken]);

  // Buscar conversaciones por contenido de mensajes (full-text)
  const searchConversations = useCallback(async (query: string): Promise<Conversation[]> => {
    const token = getAuthToken();
    if (!token || !query.trim()) return [];

    try {
      const params = new URLSearchParams({ search: query.trim() });
      if (productId) params.set('product_id', productId);

      const response = await fetch(`/api/conversations?${params.toString()}`, {
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
        return result.data.conversations.map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          lastMessage: conv.lastMessage || '',
          timestamp: new Date(conv.timestamp),
          messages: []
        }));
      }
    } catch (err) {
      console.error('[usePersistedConversations] Error searching:', err);
    }
    return [];
  }, [productId, getAuthToken]);

  // Renombrar conversación
  const renameConversation = useCallback(async (conversationId: string, newTitle: string): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: conversationId, title: newTitle })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId
              ? { ...conv, title: newTitle }
              : conv
          )
        );
        return true;
      }
    } catch (err) {
      console.error('[usePersistedConversations] Error renaming:', err);
    }
    return false;
  }, [getAuthToken]);

  // Eliminar conversación
  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`/api/conversations?id=${conversationId}`, {
        method: 'DELETE',
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
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        return true;
      }
    } catch (err) {
      console.error('[usePersistedConversations] Error deleting:', err);
    }
    return false;
  }, [getAuthToken]);

  // Cargar conversaciones al montar
  useEffect(() => {
    if (enabled) {
      loadConversations();
    }
  }, [loadConversations, enabled]);

  return {
    conversations,
    loading,
    error,
    loadConversations,
    createConversation,
    addMessage,
    loadMessages,
    searchConversations,
    renameConversation,
    deleteConversation,
    setConversations
  };
};
