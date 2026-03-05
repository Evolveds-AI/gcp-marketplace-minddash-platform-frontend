'use client';

import { useState, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import ClientSelector, { Client } from '@/components/ClientSelector';
import ChatHeader from '@/components/ChatHeader';
import ChatInput from '@/components/ChatInput';
import MessageList from '@/components/MessageList';
import FeatureButtons from '@/components/FeatureButtons';
import ChatSidebar from '@/components/ChatSidebar';
import Loader from '@/components/Loader';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import EmptyChat from '@/components/EmptyChat';
import { Message, Conversation } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomeClient() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [initialMessage, setInitialMessage] = useState(true);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [editText, setEditText] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>('current');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('Usuario');
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const router = useRouter();

  // Configurar sidebar según el tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1280; // xl breakpoint
      setSidebarVisible(isDesktop);
    };

    // Configurar al montar el componente
    handleResize();

    // Escuchar cambios de tamaño
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Verificar autenticación
  useEffect(() => {
    // Evitar redirecciones múltiples
    if (hasRedirected) return;
    
    const checkAuth = () => {
      const authData = localStorage.getItem('evolve-auth');
      if (authData) {
        try {
          const auth = JSON.parse(authData);
          // Verificar si el token sigue siendo válido (24 horas)
          const now = new Date().getTime();
          const authTime = auth.timestamp || 0;
          const isValid = now - authTime < 24 * 60 * 60 * 1000; // 24 horas
          
          if (auth.isAuthenticated && isValid) {
            setIsAuthenticated(true);
            // Obtener el nombre del usuario
            if (auth.username) {
              setUserName(auth.username);
            }
            return true;
          }
        } catch (e) {
          console.error('Error al verificar autenticación:', e);
        }
      }
      return false;
    };

    // Cargar cliente seleccionado previamente
    const loadSelectedClient = () => {
      const savedClient = localStorage.getItem('evolve-selected-client');
      if (savedClient) {
        try {
          const client = JSON.parse(savedClient);
          setSelectedClient(client);
        } catch (e) {
          console.error('Error al cargar cliente:', e);
        }
      }
    };

    const isAuth = checkAuth();
    if (!isAuth) {
      // Redirigir a la página de login si no está autenticado
      if (!hasRedirected) {
        setHasRedirected(true);
        router.push('/login');
      }
      return;
    }
    
    setIsAuthenticated(true);
    
    // Verificar si hay un cliente seleccionado
    const savedClient = localStorage.getItem('evolve-selected-client');
    if (!savedClient) {
      // Si no hay cliente seleccionado, redirigir al selector
      if (!hasRedirected) {
        setHasRedirected(true);
        router.push('/selector');
      }
      return;
    }
    
    try {
      // Verificar que el cliente seleccionado sea Cliente 1
      const client = JSON.parse(savedClient);
      if (client.id !== 'chatbotLisa') {
        // Si no es Cliente 1, redirigir a la URL con ID correspondiente
        if (!hasRedirected) {
          setHasRedirected(true);
          if (client.id === 'chatbotID3456') {
            router.push('/chatbot/chatbotID3456');
          } else if (client.id === 'chatbotID6789') {
            router.push('/chatbot/chatbotID6789');
          } else if (client.id === 'chatbotID9292') {
            router.push('/chatbot/chatbotID9292');
          } else if (client.id === 'chatbotID8787') {
            router.push('/chatbot/chatbotID8787');
          } else {
            router.push('/selector');
          }
        }
        return;
      }
      // Si es Cliente 1, cargar el cliente seleccionado
      loadSelectedClient();
    } catch (e) {
      console.error('Error al verificar cliente:', e);
      if (!hasRedirected) {
        setHasRedirected(true);
        router.push('/selector');
      }
    }
  }, [router, hasRedirected]);

  // Efecto para el loader principal y verificar si mostrar el tutorial
  useEffect(() => {
    // Solo ejecutar si el usuario está autenticado
    if (isAuthenticated) {
      // Simulamos un tiempo mínimo de carga para mostrar el loader
      const timer = setTimeout(() => {
        setLoading(false);
        
        // Verificar si el usuario ya ha visto el tutorial
        const tutorialCompleted = localStorage.getItem('lisa-tutorial-completed');
        if (!tutorialCompleted) {
          setShowTutorial(true);
        }
      }, 2500); // 2.5 segundos mínimo de loader para verlo bien
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);
  
  // Cargar conversaciones desde localStorage al iniciar
  useEffect(() => {
    const savedConversations = localStorage.getItem('chatbot-conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        if (parsed.length === 0) {
          // Si el array está vacío, mostrar la pantalla vacía
          setActiveConversationId('');
          setMessages([]);
          return;
        }
        
        const validConversations = parsed.map((conv: any) => ({
          ...conv,
          timestamp: new Date(conv.timestamp)
        }));
        setConversations(validConversations);
        
        // Buscar la conversación activa
        const activeConv = validConversations.find((c: Conversation) => c.id === activeConversationId);
        if (activeConv) {
          setMessages(activeConv.messages);
          setInitialMessage(false);
        } else if (validConversations.length > 0) {
          // Si no se encuentra la conversación activa pero hay otras, seleccionar la primera
          setActiveConversationId(validConversations[0].id);
          setMessages(validConversations[0].messages);
          setInitialMessage(false);
        }
      } catch (error) {
        console.error('Error parsing saved conversations:', error);
        // Mostrar pantalla vacía en caso de error
        setActiveConversationId('');
        setMessages([]);
      }
    } else {
      // Si no hay conversaciones guardadas, mostrar la pantalla vacía
      setActiveConversationId('');
      setMessages([]);
    }
  }, []);
  
  // Actualizar conversaciones en localStorage cuando cambien
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('chatbot-conversations', JSON.stringify(conversations));
    }
  }, [conversations]);
  
  // Función auxiliar para actualizar una conversación en el historial
  const updateConversationHistory = (updatedMessages: Message[]) => {
    if (!activeConversationId) return;
    
    const updatedConversations = conversations.map(conv => {
      if (conv.id === activeConversationId) {
        return {
          ...conv,
          messages: updatedMessages,
          lastMessage: updatedMessages[updatedMessages.length - 1]?.content?.split('\n')[0] || 'Nueva conversación',
          timestamp: new Date()
        };
      }
      return conv;
    });
    
    setConversations(updatedConversations);
  };
  
  // Inicializar una nueva conversación con mensaje de bienvenida
  const initNewConversation = () => {
    // Saludo basado en la hora del día
    const currentHour = new Date().getHours();
    const greeting = currentHour >= 5 && currentHour < 12 
      ? 'Buenos días' 
      : currentHour >= 12 && currentHour < 20 
        ? 'Buenas tardes' 
        : 'Buenas noches';
    
    // Obtener el nombre del usuario desde localStorage
    let userName = 'Usuario'; // Valor por defecto
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (authData) {
        const auth = JSON.parse(authData);
        if (auth.username) {
          userName = auth.username;
        }
      }
    } catch (error) {
      console.error('Error al obtener el nombre del usuario:', error);
    }
    
    const welcomeMessage: Message = {
      id: nanoid(),
      role: 'assistant' as const,
      type: 'assistant' as const,
      content: `${greeting}, ${userName}\n\nSoy LISA, tu Chatbot especializado en análisis de datos.\n\n¿En qué puedo ayudarte hoy?`,
      createdAt: new Date(),
    };
    
    const newConversationId = nanoid();
    const newConversation = {
      id: newConversationId,
      title: 'Nueva conversación',
      lastMessage: welcomeMessage.content.split('\n')[0],
      timestamp: new Date(),
      messages: [welcomeMessage]
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversationId);
    setMessages([welcomeMessage]);
    setInitialMessage(false);
  };
  
  // Manejar la selección de una conversación
  const handleSelectConversation = (conversationId: string) => {
    if (conversationId === activeConversationId) return;
    
    const selectedConversation = conversations.find(conv => conv.id === conversationId);
    if (selectedConversation) {
      setMessages(selectedConversation.messages);
      setActiveConversationId(conversationId);
    }
  };
  
  // Eliminar una conversación individual
  const handleDeleteConversation = (conversationId: string) => {
    // Filtrar la conversación eliminada
    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
    setConversations(updatedConversations);
    
    // Si la conversación activa es la que se está eliminando, cambiar a otra
    if (conversationId === activeConversationId) {
      if (updatedConversations.length > 0) {
        // Seleccionar la primera conversación disponible
        setActiveConversationId(updatedConversations[0].id);
        setMessages(updatedConversations[0].messages);
      } else {
        // Si no quedan conversaciones, mostrar la pantalla vacía
        setActiveConversationId('');
        setMessages([]);
      }
    }
  };
  
  // Limpiar todo el historial de conversaciones
  const handleClearAllConversations = () => {
    setConversations([]);
    setActiveConversationId('');
    setMessages([]);
  };
  
  // Actualizar la conversación actual con los nuevos mensajes
  const updateCurrentConversation = (updatedMessages: Message[]) => {
    if (!activeConversationId) return;
    
    const lastMessageContent = updatedMessages[updatedMessages.length - 1]?.content || '';
    const title = conversations.find(c => c.id === activeConversationId)?.title || 'Nueva conversación';
    
    const updatedConversations = conversations.map(conv => 
      conv.id === activeConversationId 
        ? {
            ...conv,
            messages: updatedMessages,
            lastMessage: lastMessageContent.length > 60 
              ? lastMessageContent.substring(0, 60) + '...' 
              : lastMessageContent,
            timestamp: new Date()
          }
        : conv
    );
    
    setConversations(updatedConversations);
  };

  // Resto del código del componente original...
  // (Aquí iría todo el resto de la lógica del componente original)
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Contenido del componente original */}
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Cargando...</h1>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}