'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuthAndClientCheck(validClientId :string) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Si se pasa 'SKIP_AUTH_CHECK', omitir todas las verificaciones
    if (validClientId === 'SKIP_AUTH_CHECK') {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }
    // Verificar autenticación
    const checkAuth = () => {
      const authData = localStorage.getItem('evolve-auth');
      if (authData) {
        try {
          const auth = JSON.parse(authData);
          const now = new Date().getTime();
          const authTime = auth.timestamp || 0;
          const isValid = now - authTime < 24 * 60 * 60 * 1000;

          return auth.isAuthenticated && isValid;
        } catch (e) {
          console.error('Error al verificar autenticación:', e);
        }
      }
      return false;
    };

    // Verificar cliente seleccionado
    const checkClient = () => {
      // Verificar si estamos en una ruta de chatbot con producto dinámico
      const currentPath = window.location.pathname;
      const chatbotIdMatch = currentPath.match(/\/chatbot\/([^/]+)/);
      
      if (chatbotIdMatch) {
        const chatbotId = chatbotIdMatch[1];
        // Verificar si el chatbot ID tiene formato UUID (producto dinámico)
        const isProductChatbot = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chatbotId);
        
        if (isProductChatbot) {
          // Para productos dinámicos, no verificar cliente específico
          return true;
        }
      }
      
      // Para chatbots predefinidos, verificar cliente específico
      const savedClient = localStorage.getItem('evolve-selected-client');
      if (savedClient) {
        try {
          const client = JSON.parse(savedClient);
          if (client.id === validClientId) {
            return true;
          }
        } catch (e) {
          console.error('Error al verificar cliente:', e);
        }
      }
      return false;
    };

    // Ejecutar verificaciones
    const isAuth = checkAuth();
    if (!isAuth) {
      const callbackUrl = window.location.pathname + window.location.search;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    const isValidClient = checkClient();
    if (!isValidClient) {
      router.push('/selector');
      return;
    }

    setIsAuthenticated(true);
    setIsLoading(false);
  }, [router, validClientId]);

  return { isLoading, isAuthenticated };
}
