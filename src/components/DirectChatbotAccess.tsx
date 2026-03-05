'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { availableClients } from '@/lib/utils/availableClients';

interface DirectChatbotAccessProps {
  chatbotId: string;
  children: React.ReactNode;
}

// Crear mapeo dinámico desde availableClients
const CHATBOT_CLIENT_MAP: Record<string, any> = {};

// Inicializar el mapeo con los datos de availableClients
availableClients.forEach(client => {
  if (client.path && !client.path.includes('proximamente')) {
    CHATBOT_CLIENT_MAP[client.id] = {
      id: client.id,
      gcpName: client.gcpName,
      path: client.path,
      name: client.name,
      description: `Asistente ${client.name}`,
...('productId' in client && client.productId ? { productId: client.productId } : {})
    };
  }
});

export default function DirectChatbotAccess({ chatbotId, children }: DirectChatbotAccessProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkAuthAndSetupAccess();
  }, []);

  const checkAuthAndSetupAccess = async () => {
    try {
      // Verificar autenticación
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        const callbackUrl = window.location.pathname + window.location.search;
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      const auth = JSON.parse(authData);

      // Verificar que el usuario esté autenticado
      if (!auth.isAuthenticated || !auth.accessToken) {
        localStorage.removeItem('evolve-auth');
        localStorage.removeItem('evolve-selected-client');
        const callbackUrl = window.location.pathname + window.location.search;
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      // Verificar que el usuario tenga acceso a este chatbot específico
      if (auth.roleType === 'chatbot_user') {
        // Para chatbot_user, debe coincidir con su chatbot asignado
        if (auth.primaryChatbotId !== chatbotId) {
          // El usuario intenta acceder a un chatbot que no es el suyo
          const correctPath = getChatbotPath(auth.primaryChatbotId);
          router.push(correctPath);
          return;
        }
      } else if (auth.roleType === 'chatbot_owner') {
        // Para chatbot_owner, puede acceder a su chatbot pero debería usar el panel de gestión
        if (auth.primaryChatbotId === chatbotId) {
          // Permitir acceso directo, pero configurar para gestión
        } else {
          router.push('/chatbot-management');
          return;
        }
      } else if (auth.roleType === 'super_admin') {
        // Super admin puede acceder a cualquier chatbot
      } else {
        // Usuarios antiguos sin migrar - mantener lógica anterior
        if (!auth.isAdmin) {
          // Usuario regular - verificar acceso
        }
      }

      // Configurar cliente seleccionado en localStorage
      const clientInfo = CHATBOT_CLIENT_MAP[chatbotId];
      if (clientInfo) {
        localStorage.setItem('evolve-selected-client', JSON.stringify(clientInfo));
        
        // Configurar GCP Name para compatibilidad
        localStorage.setItem('selectedGcpName', clientInfo.gcpName);
      }

      setAuthorized(true);
    } catch (error) {
      console.error('Error verificando acceso:', error);
      const callbackUrl = window.location.pathname + window.location.search;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } finally {
      setLoading(false);
    }
  };

  const getChatbotPath = (chatbotId: string) => {
    const pathMap: Record<string, string> = {};
    availableClients.forEach(client => {
      if (client.path && !client.path.includes('proximamente')) {
        pathMap[client.id] = client.path;
      }
    });
    return pathMap[chatbotId] || '/dashboard/client/lisit/product/lisit-product';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando acceso al chatbot...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-border">
          <div className="text-center">
            <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" aria-label="Acceso denegado" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground mb-6">No tienes autorización para acceder a este chatbot.</p>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Volver al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}