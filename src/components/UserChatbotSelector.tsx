'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Bot } from 'lucide-react';

interface UserChatbot {
  id: string;
  chatbot_id: string;
  chatbot_name: string;
  chatbot_path: string;
  gcp_name: string;
  assigned_at: string;
}

interface UserChatbotSelectorProps {
  onLogout?: () => void;
}

const UserChatbotSelector: React.FC<UserChatbotSelectorProps> = ({ onLogout }) => {
  const [chatbots, setChatbots] = useState<UserChatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserChatbots();
  }, []);

  // Auto-redirect when user has exactly one chatbot assigned
  useEffect(() => {
    if (!loading && chatbots.length === 1) {
      handleChatbotSelect(chatbots[0]);
    }
  }, [loading, chatbots]);

  const fetchUserChatbots = async () => {
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        router.push('/login');
        return;
      }

      const auth = JSON.parse(authData);
      const token = auth.accessToken;
      
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/user/chatbots', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('evolve-auth');
          localStorage.removeItem('evolve-selected-client');
          router.push('/login');
          return;
        }
        throw new Error('Error al cargar chatbots');
      }

      const data = await response.json();
      setChatbots(data.chatbots || []);
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar los chatbots asignados');
    } finally {
      setLoading(false);
    }
  };

  const handleChatbotSelect = (chatbot: UserChatbot) => {
    // Guardar información del chatbot seleccionado
    localStorage.setItem('selectedClient', JSON.stringify({
      id: chatbot.chatbot_id,
      name: chatbot.chatbot_name,
      path: chatbot.chatbot_path,
      gcpName: chatbot.gcp_name
    }));

    // Redirigir al chatbot
    router.push(chatbot.chatbot_path);
  };

  const handleLogout = () => {
    localStorage.removeItem('evolve-auth');
    localStorage.removeItem('evolve-selected-client');
    localStorage.removeItem('chatbot-conversations');
    if (onLogout) {
      onLogout();
    } else {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card p-8 rounded-lg shadow-lg border border-border">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground text-center">Cargando chatbots...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card p-8 rounded-lg shadow-lg max-w-md w-full mx-4 border border-border">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" aria-label="Error" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchUserChatbots}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (chatbots.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card p-8 rounded-lg shadow-lg max-w-md w-full mx-4 border border-border">
          <div className="text-center">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-label="Sin chatbots" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Sin Chatbots Asignados</h2>
            <p className="text-muted-foreground mb-6">
              No tienes chatbots asignados. Contacta a tu administrador para obtener acceso.
            </p>
            <button
              onClick={handleLogout}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si solo tiene un chatbot asignado, mostrar loading mientras el useEffect redirige
  if (chatbots.length === 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card p-8 rounded-lg shadow-lg border border-border">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground text-center">Redirigiendo a {chatbots[0].chatbot_name}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-card border border-border rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Seleccionar Chatbot</h1>
              <p className="text-muted-foreground mt-1">Elige el chatbot con el que deseas interactuar</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Chatbots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chatbots.map((chatbot) => (
            <div
              key={chatbot.id}
              className="bg-card border-2 border-border rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer hover:border-blue-500"
              onClick={() => handleChatbotSelect(chatbot)}
            >
              <div className="text-center">
                <Bot className="h-10 w-10 text-blue-500 mx-auto mb-4" aria-label="Chatbot" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {chatbot.chatbot_name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  ID: {chatbot.chatbot_id}
                </p>
                <p className="text-muted-foreground/70 text-xs">
                  Asignado: {new Date(chatbot.assigned_at).toLocaleDateString('es-ES')}
                </p>
                <div className="mt-4">
                  <span className="inline-block bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
                    {chatbot.gcp_name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            Tienes acceso a {chatbots.length} chatbot{chatbots.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserChatbotSelector;