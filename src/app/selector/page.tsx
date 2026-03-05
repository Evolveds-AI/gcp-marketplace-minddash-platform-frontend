'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiChevronDown, FiLogOut, FiSettings } from '@/lib/icons';
import { Spotlight } from '@/components/ui/spotlight-new';
import ClientOnly from '@/components/ClientOnly';
import { UnifiedSpinner } from '@/components/loaders';

interface ChatbotOption {
  id: string;
  name: string;
  path: string;
  gcpName: string;
  productId: string;
}


export default function ClientSelectorPage() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ChatbotOption | null>(null);
  const [availableChatbots, setAvailableChatbots] = useState<ChatbotOption[]>([]);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGreeting, setShowGreeting] = useState(true);
  const router = useRouter();

  // Verificar autenticación y cargar chatbots disponibles
  useEffect(() => {
    const checkAuthAndLoadChatbots = async () => {
      try {
        const authData = localStorage.getItem('evolve-auth');
        if (!authData) {
          router.push('/login');
          return;
        }

        const auth = JSON.parse(authData);
        const now = new Date().getTime();
        const authTime = auth.timestamp || 0;
        const isValid = now - authTime < 24 * 60 * 60 * 1000;
        
        if (!auth.isAuthenticated || !isValid) {
          router.push('/login');
          return;
        }

        // Permitir acceso a SuperAdmin, Admin y User (case-insensitive)
        const allowedRoles = ['superadmin', 'admin', 'user', 'super_admin'];
        const normalizedRole = (auth.role || '').toLowerCase();
        if (!allowedRoles.includes(normalizedRole)) {
          router.push('/login');
          return;
        }

        setIsAuthenticated(true);
        setUsername(auth.username || 'Usuario');
        setUserRole(auth.role);
        
        // Cargar chatbots disponibles según el rol
        await loadAvailableChatbots(auth.accessToken);
        
      } catch (e) {
        console.error('Error al verificar autenticación:', e);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadChatbots();
  }, [router]);

  // Mostrar la animación completa solo una vez y luego revelar el selector
  useEffect(() => {
    // Evita que el saludo se muestre dos veces por montajes dobles (StrictMode) o reentradas rápidas
    if (typeof window !== 'undefined' && sessionStorage.getItem('selector-greeting-shown')) {
      setShowGreeting(false);
      return;
    }

    if (loading) return;
    if (!isAuthenticated) return;
    if (!showGreeting) return;

    // Marcar inmediatamente para evitar re-montajes (StrictMode) que dupliquen la animación
    sessionStorage.setItem('selector-greeting-shown', '1');

    // Ocultar al terminar la animación completa (mantener duración original)
    const timer = setTimeout(() => {
      setShowGreeting(false);
    }, 2600);
    return () => clearTimeout(timer);
  }, [loading, isAuthenticated, showGreeting]);

  // Función para cargar chatbots disponibles
  const loadAvailableChatbots = async (token: string) => {
    try {
      const response = await fetch('/api/selector/chatbots', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableChatbots(data.data.chatbots);
          
          // Si no hay chatbots asignados, mostrar mensaje
          if (data.data.chatbots.length === 0 && data.data.userRole !== 'SuperAdmin') {
            // No hacer nada, el componente manejará la visualización
          }
        }
      } else {
        console.error('Error al cargar chatbots');
      }
    } catch (error) {
      console.error('Error al cargar chatbots:', error);
    }
  };

  // Cargar cliente seleccionado previamente
  useEffect(() => {
    if (availableChatbots.length > 0) {
      const savedClient = localStorage.getItem('evolve-selected-client');
      if (savedClient) {
        try {
          const client = JSON.parse(savedClient);
          // Si encontramos un cliente guardado, lo seleccionamos
          const matchedClient = availableChatbots.find(c => c.id === client.id);
          if (matchedClient) {
            setSelectedClient(matchedClient);
          }
        } catch (e) {
          console.error('Error al cargar cliente:', e);
        }
      }
    }
  }, [availableChatbots]);

  const handleSelectClient = (client: ChatbotOption) => {
    setSelectedClient(client);
    setIsDropdownOpen(false);
    
    // Guardar cliente seleccionado en localStorage
    localStorage.setItem('evolve-selected-client', JSON.stringify(client));
  };

  const handleContinue = () => {
    if (selectedClient) {
      // Redirigir a la URL con ID único
      if (selectedClient.id) {
        router.push(selectedClient.path);
      } else {
        router.push('/selector');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('evolve-auth');
    router.push('/login');
  };

  const GreetingLoader = () => {
    const letters = ['H', 'o', 'l', 'a'];
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center relative overflow-hidden">
        <Spotlight
          gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .08) 0, hsla(210, 100%, 55%, .04) 50%, hsla(210, 100%, 45%, 0) 80%)"
          gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .05) 0, hsla(210, 100%, 55%, .02) 80%, transparent 100%)"
          gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 45%, .015) 80%, transparent 100%)"
          translateY={-200}
          width={480}
          height={1100}
          smallWidth={220}
          duration={9}
          xOffset={60}
        />
        <div className="relative z-20 flex flex-col items-center gap-8">
          <div className="flex items-center gap-0 tracking-tight leading-none">
            {letters.map((letter, index) => (
              <motion.span
                key={letter + index}
                className="font-bold text-6xl sm:text-7xl bg-gradient-to-b from-[#9df5ff] via-[#7cd7ff] to-[#4fb6ff] bg-clip-text text-transparent inline-block drop-shadow-[0_0_18px_rgba(79,182,255,0.45)]"
                initial={{ opacity: 0, y: 36, rotateX: 25, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.12 * index, duration: 0.7, ease: 'easeOut' }}
              >
                {letter}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ClientOnly fallback={
      <UnifiedSpinner 
        size="medium" 
        fullScreen={true}
        message="Inicializando..."
      />
    }>
      {showGreeting ? (
        <GreetingLoader />
      ) : loading ? (
        <UnifiedSpinner
          size="medium"
          fullScreen={true}
          message="Cargando..."
        />
      ) : !isAuthenticated ? (
        <UnifiedSpinner
          size="medium"
          fullScreen={true}
          message="Redirigiendo..."
        />
      ) : (
        <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center relative overflow-hidden">
          {/* Componente Spotlight como fondo */}
          <Spotlight
          gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .06) 0, hsla(210, 100%, 55%, .02) 50%, hsla(210, 100%, 45%, 0) 80%)"
          gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 55%, .02) 80%, transparent 100%)"
          gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .03) 0, hsla(210, 100%, 45%, .01) 80%, transparent 100%)"
          translateY={-250}
          width={400}
          height={1000}
          smallWidth={180}
          duration={8}
          xOffset={80}
        />
        
        <div className="w-full max-w-md p-8 relative z-20">
          <motion.div 
            className="bg-[#1f1f1f] rounded-xl shadow-lg overflow-hidden border border-gray-800 h-[38rem]" 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-16 h-16">
                  <Image 
                    src="/images/Evolve.png" 
                    alt="Logo"
                    width={64}
                    height={64}
                    className="mx-auto object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/placeholder.svg";
                    }}
                  />
                </div>
              </div>
            
            <h2 className="text-2xl font-bold text-center text-gray-200 mb-4">
              Selector de Chatbots
            </h2>
            <p className="text-sm text-gray-400 text-center mb-6">
              {['superadmin', 'super_admin'].includes(userRole.toLowerCase())
                ? 'Como super administrador, puedes acceder a cualquier chatbot del sistema'
                : userRole.toLowerCase() === 'admin'
                ? 'Accede a los chatbots que tienes asignados'
                : 'Selecciona uno de tus chatbots disponibles'
              }
            </p>
            
            <div className="mb-2 text-sm text-gray-400">
              <span>Bienvenido, {username}</span>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full py-3 px-4 border border-gray-700 rounded-md bg-[#2a2a2a] text-gray-200 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-[#333333] transition"
              >
                <span>{selectedClient ? selectedClient.name : 'Selecciona un cliente'}</span>
                <FiChevronDown className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <motion.div 
                  className="absolute top-full left-0 right-0 mt-1 bg-[#222222] border border-gray-700 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ul>
                    {availableChatbots.length === 0 ? (
                      <li className="py-3 px-4 text-gray-400 text-center">
                        {['superadmin', 'super_admin'].includes(userRole.toLowerCase()) ? 'No hay chatbots disponibles' : 'No tienes chatbots asignados'}
                      </li>
                    ) : (
                      availableChatbots.map((client) => (
                        <li key={client.id}>
                          <button
                            onClick={() => handleSelectClient(client)}
                            className={`w-full text-left py-3 px-4 hover:bg-[#333333] text-gray-200 ${
                              selectedClient?.id === client.id ? 'bg-[#3978d5] bg-opacity-20 text-[#4a88e5] font-medium' : ''
                            }`}
                          >
                            {client.name}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </motion.div>
              )}
            </div>
            
            <div className="mt-8">
              <button
                onClick={handleContinue}
                disabled={!selectedClient || availableChatbots.length === 0}
                className={`w-full py-3 px-4 rounded-md text-center text-white font-medium transition ${
                  selectedClient && availableChatbots.length > 0
                    ? 'bg-[#3978d5] hover:bg-[#4a88e5]' 
                    : 'bg-gray-700 cursor-not-allowed'
                }`}
              >
                {availableChatbots.length === 0 ? 'Sin chatbots disponibles' : 'Continuar'}
              </button>
            </div>
            
            <div className="mt-6 space-y-3">
              {/* Botón Panel Admin - solo para super_admin */}
              {['superadmin', 'super_admin'].includes(userRole.toLowerCase()) && (
                <motion.button 
                  onClick={() => router.push('/admin')}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600/20 to-purple-700/20 border border-purple-600/30 rounded-lg text-purple-300 hover:text-purple-200 hover:border-purple-500/50 transition-all duration-200 flex items-center justify-center space-x-2 text-sm font-medium group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.1 }}
                >
                  <FiSettings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Ir al Panel Admin</span>
                </motion.button>
              )}
              
              {/* Botón Panel Admin Cliente - solo para Admin */}
              {(userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'editor') && (
                <motion.button 
                  onClick={() => router.push('/dashboard/admin')}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600/20 to-blue-700/20 border border-blue-600/30 rounded-lg text-blue-300 hover:text-blue-200 hover:border-blue-500/50 transition-all duration-200 flex items-center justify-center space-x-2 text-sm font-medium group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.1 }}
                >
                  <FiSettings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  <span>{userRole.toLowerCase() === 'editor' ? 'Panel Editor' : 'Panel de Administración'}</span>
                </motion.button>
              )}
              
              {/* Botón Dashboard Usuario - solo para User */}
              {userRole.toLowerCase() === 'user' && (
                <motion.button 
                  onClick={() => router.push('/dashboard/user')}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-green-600/20 to-green-700/20 border border-green-600/30 rounded-lg text-green-300 hover:text-green-200 hover:border-green-500/50 transition-all duration-200 flex items-center justify-center space-x-2 text-sm font-medium group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.1 }}
                >
                  <FiSettings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Mi Dashboard</span>
                </motion.button>
              )}
              
              {/* Botón Cerrar sesión */}
              <button 
                onClick={handleLogout}
                className="w-full py-2 px-4 text-gray-400 hover:text-gray-200 text-sm flex items-center justify-center space-x-2 transition-colors duration-200"
              >
                <FiLogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
      )}
    </ClientOnly>
  );
}
