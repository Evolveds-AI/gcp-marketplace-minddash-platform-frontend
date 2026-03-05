import { useCallback } from 'react';

export interface ChatbotHistoryEntry {
  id: string;
  name: string;
  organizationId: string;
  projectId: string;
  lastVisited: number;
  isFavorite?: boolean;
}

const STORAGE_KEY = 'minddash-recent-chatbots';
const MAX_HISTORY = 10;

const getUserScopedStorageKey = () => {
  try {
    const authRaw = localStorage.getItem('evolve-auth');
    if (!authRaw) return STORAGE_KEY;
    const auth = JSON.parse(authRaw);
    const userKey = auth.userId || auth.username || auth.email;
    if (!userKey) return STORAGE_KEY;
    return `${STORAGE_KEY}-${userKey}`;
  } catch {
    return STORAGE_KEY;
  }
};

export function useChatbotHistory() {
  /**
   * Registra una visita a un chatbot en el historial
   */
  const recordVisit = useCallback((chatbot: Omit<ChatbotHistoryEntry, 'lastVisited'>) => {
    try {
      const storageKey = getUserScopedStorageKey();
      const stored = localStorage.getItem(storageKey);
      let history: ChatbotHistoryEntry[] = stored ? JSON.parse(stored) : [];
      
      // Remover entrada existente si la hay
      history = history.filter(entry => entry.id !== chatbot.id);
      
      // Agregar al inicio con timestamp actual
      history.unshift({
        ...chatbot,
        lastVisited: Date.now()
      });
      
      // Mantener solo los últimos MAX_HISTORY
      history = history.slice(0, MAX_HISTORY);
      
      localStorage.setItem(storageKey, JSON.stringify(history));
      
      return history;
    } catch (error) {
      console.error('Error registrando visita al chatbot:', error);
      return [];
    }
  }, []);

  /**
   * Obtiene el historial de chatbots visitados
   */
  const getHistory = useCallback((): ChatbotHistoryEntry[] => {
    try {
      const storageKey = getUserScopedStorageKey();
      let stored = localStorage.getItem(storageKey);

      if (!stored && storageKey !== STORAGE_KEY) {
        const legacyStored = localStorage.getItem(STORAGE_KEY);
        if (legacyStored) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      if (!stored) return [];

      const history: ChatbotHistoryEntry[] = JSON.parse(stored);
      return history.sort((a, b) => b.lastVisited - a.lastVisited);
    } catch (error) {
      console.error('Error obteniendo historial de chatbots:', error);
      return [];
    }
  }, []);

  /**
   * Marca/desmarca un chatbot como favorito
   */
  const toggleFavorite = useCallback((chatbotId: string) => {
    try {
      const storageKey = getUserScopedStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      
      let history: ChatbotHistoryEntry[] = JSON.parse(stored);
      
      history = history.map(entry => {
        if (entry.id === chatbotId) {
          return { ...entry, isFavorite: !entry.isFavorite };
        }
        return entry;
      });
      
      localStorage.setItem(storageKey, JSON.stringify(history));
      
      return history;
    } catch (error) {
      console.error('Error actualizando favorito:', error);
      return [];
    }
  }, []);

  /**
   * Limpia el historial completo
   */
  const clearHistory = useCallback(() => {
    try {
      const storageKey = getUserScopedStorageKey();
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error limpiando historial:', error);
    }
  }, []);

  /**
   * Obtiene solo los favoritos
   */
  const getFavorites = useCallback((): ChatbotHistoryEntry[] => {
    const history = getHistory();
    return history.filter(entry => entry.isFavorite);
  }, [getHistory]);

  return {
    recordVisit,
    getHistory,
    toggleFavorite,
    clearHistory,
    getFavorites
  };
}
