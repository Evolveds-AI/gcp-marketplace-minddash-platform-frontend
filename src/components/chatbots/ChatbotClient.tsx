'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Componentes existentes que serán usados en función del ID
import ChatbotLisa from '@/app/page';
import { ChatbotComingSoon } from './ChatbotComingSoon';
import { UnifiedSpinner } from '@/components/loaders';

// Componente del lado del cliente
export default function ChatbotClient({ id }: { id: string }) {
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isValidClient, setIsValidClient] = useState(false);
  
  // Verificar autenticación y cliente
  useEffect(() => {
    // Función para verificar autenticación
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
      const savedClient = localStorage.getItem('evolve-selected-client');
      if (savedClient) {
        try {
          const client = JSON.parse(savedClient);
          setClientName(client.name);
          
          if (
            (id === 'lisa' && client.id === 'cliente1') ||
            (id === 'chatbotID3456' && client.id === 'cliente2') ||
            (id === 'chatbotID6789' && client.id === 'cliente3')
          ) {
            setIsValidClient(true);
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
      router.push('/login');
      return;
    }
    
    const isValidClientId = checkClient();
    if (!isValidClientId) {
      router.push('/selector');
      return;
    }
    
    setIsLoading(false);
  }, [id, router]);

  // Renderizado condicional según el ID del chatbot
  const renderChatbot = () => {
    switch (id) {
      case 'lisa':
        return <ChatbotLisa />;
      case 'chatbotID3456':
      case 'chatbotID6789':
        return (
          <ChatbotComingSoon />
        );
      default:
        router.push('/selector');
        return null;
    }
  };

  if (isLoading) {
    return (
      <UnifiedSpinner 
        size="medium" 
        fullScreen={true}
        message="Cargando chatbot..."
      />
    );
  }

  return (
    <>
      {renderChatbot()}
    </>
  );
}
