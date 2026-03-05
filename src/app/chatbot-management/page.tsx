'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiUser, FiLogOut, FiSettings, FiActivity, FiArrowRight, FiClock, FiShield } from '@/lib/icons';
import { Spotlight } from '@/components/ui/spotlight-new';

interface UserChatbot {
  id: string;
  chatbot_id: string;
  chatbot_name: string;
  chatbot_path: string;
  gcp_name: string;
  assigned_at: string;
  is_active: boolean;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  iam_role: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  client: {
    id: string;
    nombre: string;
    descripcion: string;
  };
}

const ChatbotManagementPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [chatbots, setChatbots] = useState<UserChatbot[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('Verificando acceso...');
  const router = useRouter();

  useEffect(() => {
    checkAuthenticationAndInitialize();
  }, []);

  const checkAuthenticationAndInitialize = async () => {
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        router.push('/login');
        return;
      }

      const auth = JSON.parse(authData);
      
      if (!auth.isAuthenticated || !auth.accessToken) {
        router.push('/login');
        return;
      }

      // Permitir acceso tanto a administradores como a usuarios normales
      if (auth.isAdmin || auth.role === 'admin' || auth.role === 'super_admin') {
        // Los administradores ahora pueden acceder al selector directamente
        setIsAuthenticated(true);
        return;
      }

      // Para usuarios normales, cargar su información y chatbots
      if (auth.role === 'user') {
        setIsAuthenticated(true);
        
        // Cargar información del usuario
        setLoadingMessage('Obteniendo información del usuario...');
        await loadUserData(auth.accessToken);

        // Cargar chatbots asignados
        setLoadingMessage('Obteniendo chatbots asignados...');
        await loadUserChatbots(auth.accessToken);
      } else {
        // Rol no reconocido
        router.push('/login');
      }

    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async (token: string) => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.data.user);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }
  };

  const loadUserChatbots = async (token: string) => {
    try {
      const response = await fetch('/api/user/chatbots', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setChatbots(data.data.chatbots);
        }
      }
    } catch (error) {
      console.error('Error al cargar chatbots:', error);
    }
  };

  const handleChatbotAccess = (chatbot: UserChatbot) => {
    // Configurar el cliente seleccionado
    localStorage.setItem('selectedClient', JSON.stringify({
      id: chatbot.chatbot_id,
      name: chatbot.chatbot_name,
      path: chatbot.chatbot_path,
      gcpName: chatbot.gcp_name
    }));

    // Redirigir al chatbot
    router.push(chatbot.chatbot_path);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('evolve-auth');
      localStorage.removeItem('evolve-selected-client');
      localStorage.removeItem('chatbot-conversations');
      router.push('/login?logout=true');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-muted-foreground">{loadingMessage}</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#111111] relative overflow-hidden">
      {/* Componente Spotlight como fondo */}
      <div className="absolute inset-0 z-0">
        <Spotlight
          gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 55%, .01) 50%, hsla(210, 100%, 45%, 0) 80%)"
          gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .03) 0, hsla(210, 100%, 55%, .01) 80%, transparent 100%)"
          gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .02) 0, hsla(210, 100%, 45%, .01) 80%, transparent 100%)"
          translateY={-250}
          width={400}
          height={1000}
          smallWidth={180}
          duration={8}
          xOffset={80}
        />
      </div>

      {/* Patrón de fondo sutil */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] z-10"></div>

      <div className="relative z-20 flex">
        {/* Sidebar estilo admin */}
        <motion.div 
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="fixed top-0 bottom-0 left-0 z-40 h-full flex-none flex flex-col space-y-4 overflow-hidden bg-[#111111] border-r border-gray-800 transition-all duration-300 shadow-xl w-[280px]"
        >
          {/* Header del sidebar */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 relative">
            <div className="flex items-center">
              <div className="flex-none">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white">
                  <FiMessageSquare className="w-6 h-6" />
                </div>
              </div>
              <div className="mx-3">
                <p className="mb-0 font-semibold text-white">Gestión Chatbots</p>
                <p className="text-xs text-gray-400">Administra tus chatbots</p>
              </div>
            </div>
          </div>

          {/* Usuario info */}
          <div className="px-4">
            <div className="bg-[#1c1c1c] border border-gray-700 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{user?.username || 'Usuario'}</p>
                  <p className="text-gray-400 text-xs truncate">{user?.email || 'user@evolve.com'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de secciones */}
          <div className="px-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">Navegación</h3>
              
              <div 
                className="flex w-full items-center rounded-md p-2.5 transition-all duration-300 cursor-pointer hover:bg-[#1c1c1c] text-white"
                onClick={() => router.push('/dashboard/user')}
              >
                <div className="flex items-center w-full overflow-hidden">
                  <div className="flex-shrink-0 mr-3">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-white bg-gray-700">
                      <FiUser className="text-sm" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-sm">Dashboard</p>
                    <p className="truncate text-xs text-gray-400">Panel principal</p>
                  </div>
                </div>
              </div>

              <div className="flex w-full items-center rounded-md p-2.5 transition-all duration-300 cursor-pointer bg-gradient-to-r from-purple-600/20 to-purple-700/20 text-purple-400">
                <div className="flex items-center w-full overflow-hidden">
                  <div className="flex-shrink-0 mr-3">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-white bg-purple-600">
                      <FiMessageSquare className="text-sm" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-sm">Chatbots</p>
                    <p className="truncate text-xs text-gray-400">Gestión activa ({chatbots.length})</p>
                  </div>
                </div>
              </div>

              <div className="flex w-full items-center rounded-md p-2.5 transition-all duration-300 cursor-pointer hover:bg-[#1c1c1c] text-white">
                <div className="flex items-center w-full overflow-hidden">
                  <div className="flex-shrink-0 mr-3">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-white bg-gray-700">
                      <FiSettings className="text-sm" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-sm">Configuración</p>
                    <p className="truncate text-xs text-gray-400">Ajustes personales</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón de logout */}
          <div className="px-4 pb-4 border-t border-gray-800 pt-4">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md font-medium shadow-lg hover:from-red-500 hover:to-red-600 transition-all duration-300 text-sm"
            >
              <div className="flex items-center justify-center">
                <FiLogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col ml-[280px]">
          {/* Header */}
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-[#1f1f1f] to-[#2a2a2a] border-b border-gray-800 px-8 py-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Gestión de Chatbots
                </h1>
                <p className="text-gray-400 mt-2">
                  Administra y accede a tus chatbots asignados, {user?.username}.
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-400">Chatbots disponibles</p>
                  <p className="text-white font-medium">{chatbots.filter(c => c.is_active).length}/{chatbots.length}</p>
                </div>
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </motion.div>

          {/* Contenido del dashboard */}
          <div className="flex-1 p-8 space-y-8">
            {/* Estadísticas de Chatbots */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Total de Chatbots */}
              <div className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                      <FiMessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Total</p>
                      <p className="text-2xl font-bold text-white">{chatbots.length}</p>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Chatbots asignados
                </div>
              </div>

              {/* Chatbots Activos */}
              <div className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                      <FiActivity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Activos</p>
                      <p className="text-2xl font-bold text-white">{chatbots.filter(c => c.is_active).length}</p>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Disponibles para uso
                </div>
              </div>

              {/* Último Acceso */}
              <div className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                      <FiClock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Último Acceso</p>
                      <p className="text-lg font-bold text-white">Hoy</p>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Actividad reciente
                </div>
              </div>
            </motion.div>

            {/* Lista de Chatbots */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 shadow-lg"
            >
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <FiMessageSquare className="w-5 h-5 mr-2" />
                Tus Chatbots Asignados
              </h2>
              
              {chatbots.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiMessageSquare className="w-10 h-10 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No hay chatbots asignados</h3>
                  <p className="text-gray-400 mb-6">Contacta a tu administrador para obtener acceso a los chatbots.</p>
                  <button
                    onClick={() => router.push('/dashboard/user')}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all duration-300"
                  >
                    Ir al Dashboard
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {chatbots.map((chatbot, index) => (
                    <motion.div
                      key={chatbot.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-6 hover:border-purple-500 transition-all duration-300 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                            <FiMessageSquare className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{chatbot.chatbot_name}</h4>
                            <p className="text-xs text-gray-400">{chatbot.gcp_name}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          chatbot.is_active 
                            ? 'bg-green-900/20 text-green-400 border border-green-900/30' 
                            : 'bg-red-900/20 text-red-400 border border-red-900/30'
                        }`}>
                          {chatbot.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm text-gray-400 mb-1">ID del Chatbot</p>
                        <p className="text-sm font-mono text-gray-300 bg-gray-800 p-2 rounded">
                          {chatbot.chatbot_id}
                        </p>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-400 mb-1">Asignado el</p>
                        <p className="text-sm text-gray-300">
                          {new Date(chatbot.assigned_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleChatbotAccess(chatbot)}
                        disabled={!chatbot.is_active}
                        className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                          chatbot.is_active
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-500 hover:to-purple-600 shadow-lg'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <span>{chatbot.is_active ? 'Acceder al Chatbot' : 'No Disponible'}</span>
                        {chatbot.is_active && <FiArrowRight className="w-4 h-4" />}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Información Adicional */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 shadow-lg"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <FiShield className="w-5 h-5 mr-2" />
                Información de Acceso
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Usuario Activo</p>
                  <p className="text-white font-medium">{user?.username}</p>
                  <p className="text-gray-400 text-sm">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Cliente</p>
                <p className="text-white font-medium">{user?.client?.nombre}</p>
                <p className="text-gray-400 text-sm">{user?.client?.descripcion || 'Sin descripción'}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotManagementPage;