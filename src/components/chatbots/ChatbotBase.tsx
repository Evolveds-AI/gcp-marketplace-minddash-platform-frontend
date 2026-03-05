'use client';

import { useState, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import ClientSelector, { Client } from '@/components/ClientSelector';
import ChatHeader from '@/components/ChatHeader';
import ChatInput from '@/components/ChatInput';
import MessageList from '@/components/MessageList';
import FeatureButtons from '@/components/FeatureButtons';
import ChatSidebar from '../ChatSidebar';
import Loader from '@/components/Loader';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import EmptyChat from '@/components/EmptyChat';
import { Message, Conversation, ChartSpec } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { chartUrl } from '@/lib/utils/endpoints';
import { isTableMessage, separateTableMessage, parseMarkdownTable } from '@/lib/uiMessages/tables/tableFormatterMessages';
import { usePersistedConversations } from '@/hooks/usePersistedConversations';


export default function ChatBotBase({ clientId, clientWelcomeMessage, clientAbout, suggestedPrompts, exampleQuestions, isProductChatbot = false, productName, productId, clientName, useDatabase = false, conversationsHook }: { clientId: string, clientWelcomeMessage: string, clientAbout: string, suggestedPrompts: string[], exampleQuestions: string[], isProductChatbot?: boolean, productName?: string, productId?: string, clientName?: string, useDatabase?: boolean, conversationsHook?: any }) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [initialMessage, setInitialMessage] = useState(true);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [editText, setEditText] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [userName, setUserName] = useState('Usuario');
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const agentEndpoint = '/api/agent/chat';

  const isValidChartSpec = (spec: any): spec is ChartSpec => {
    return !!spec && Array.isArray(spec.labels) && Array.isArray(spec.series) && spec.labels.length > 0 && spec.series.length > 0;
  };

  const fetchWithRetry = async (url: string, init: RequestInit, maxAttempts = 3) => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(url, init);
        if (res.status >= 500 && res.status <= 599 && attempt < maxAttempts) {
          const delayMs = attempt === 1 ? 500 : attempt === 2 ? 1500 : 3000;
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        return res;
      } catch (e) {
        lastError = e;
        if (attempt < maxAttempts) {
          const delayMs = attempt === 1 ? 500 : attempt === 2 ? 1500 : 3000;
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        throw lastError;
      }
    }
    throw lastError;
  };

  const parseNumericCell = (raw: string) => {
    const s = String(raw ?? '').trim();
    if (!s) return { value: NaN, unit_type: undefined as any, currency: undefined as any };

    const isPercent = /%/.test(s);
    const currencyMatch = s.match(/\b(USD|CLP|ARS|EUR|BRL|MXN|GBP|JPY|CNY)\b/i);
    const hasDollar = /\$/.test(s);

    const cleaned = s
      .replace(/\(([^)]+)\)/g, '$1')
      .replace(/[^0-9,\.\-]/g, '')
      .replace(/,(?=\d{3}(\D|$))/g, '')
      .replace(/,/g, '');

    const n = Number.parseFloat(cleaned);
    const unit_type = isPercent ? 'percent' : (hasDollar || currencyMatch) ? 'currency' : 'number';
    const currency = currencyMatch?.[1]?.toUpperCase() || (hasDollar ? 'USD' : undefined);
    return { value: n, unit_type, currency };
  };

  const buildChartSpecFromTable = (tableMarkdown: string, title?: string | null): ChartSpec | null => {
    const parsed = parseMarkdownTable(tableMarkdown);
    if (!parsed?.headers?.length || !Array.isArray(parsed.rows) || parsed.rows.length === 0) return null;

    const headers: string[] = parsed.headers;
    const rows: Record<string, string>[] = parsed.rows;

    const labelKey = headers[0];
    const numericKeys = headers.slice(1);
    if (!numericKeys.length) return null;

    const labels = rows.map((r) => String(r[labelKey] ?? '').trim()).filter(Boolean);
    if (!labels.length) return null;

    const metaCandidates = rows.flatMap((r) => numericKeys.map((k) => parseNumericCell(r[k])));
    const firstMeta = metaCandidates.find((m) => Number.isFinite(m.value));

    const series = numericKeys
      .map((key) => {
        const data = rows.map((r) => parseNumericCell(r[key]).value);
        const finiteCount = data.filter((v) => Number.isFinite(v)).length;
        return {
          name: String(key ?? '').trim() || 'Serie',
          data,
          _finiteCount: finiteCount,
        };
      })
      .filter((s) => s._finiteCount > 0)
      .map(({ _finiteCount, ...rest }) => rest);

    if (!series.length) return null;

    const meta: Record<string, any> = {};
    if (firstMeta?.unit_type) meta.unit_type = firstMeta.unit_type;
    if (firstMeta?.currency) meta.currency = firstMeta.currency;

    return {
      type: 'bar',
      mark: 'bar',
      title: title ?? null,
      labels,
      series,
      meta,
    };
  };

  const generateSessionId = () => {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch (e) {
      console.warn('Fallo al generar UUID con crypto.randomUUID, usando nanoid:', e);
    }
    return nanoid();
  };

  const ensureLocalUserId = () => {
    const key = productId ? `chatbot-${productId}-local-user-id` : 'chatbot-generic-local-user-id';
    let existing: string | null = null;
    try {
      existing = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (error) {
      console.warn('No se pudo leer localStorage para userId local', error);
    }

    if (existing) {
      setUserId(existing);
      return existing;
    }

    const generated = generateSessionId();
    try {
      localStorage.setItem(key, generated);
    } catch (error) {
      console.warn('No se pudo guardar userId local', error);
    }
    setUserId(generated);
    return generated;
  };

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
            // Obtener datos del usuario
            if (auth.username) {
              setUserName(auth.username);
            }
            if (auth.email) {
              setUserEmail(auth.email);
            }
            if (auth.userId) {
              setUserId(auth.userId);
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

    // Para productos dinámicos, omitir verificaciones de autenticación
    if (isProductChatbot) {
      setIsAuthenticated(true);
      // Configurar un cliente mock para productos dinámicos
      const mockClient = {
        id: clientId,
        gcpName: `product-${productId || clientId}`,
        name: productName || 'Producto Dinámico',
        displayName: productName || 'Producto Dinámico'
      };
      setSelectedClient(mockClient);

      // Intentar recuperar info de usuario si ya existe sesión previa (evolve-auth)
      try {
        const authData = localStorage.getItem('evolve-auth');
                if (authData) {
          const auth = JSON.parse(authData);
                    if (auth.username) setUserName(auth.username);
          if (auth.email) setUserEmail(auth.email);
          if (auth.userId) {
            setUserId(auth.userId);
          } else {
            ensureLocalUserId();
          }
        } else {
                    ensureLocalUserId();
        }
      } catch (error) {
        console.warn('No se pudo leer evolve-auth para producto dinámico', error);
        ensureLocalUserId();
      }

      return;
    }

    const isAuth = checkAuth();
    if (!isAuth) {
      // Redirigir a la página de login si no está autenticado
      router.push('/login');
      return;
    }

    // Si hay sesión válida, NO generar IDs locales (evita pisar el userId real por estado stale)
    try {
      const authData = localStorage.getItem('evolve-auth');
      const auth = authData ? JSON.parse(authData) : null;
      if (!auth?.userId) {
        ensureLocalUserId();
      }
    } catch {
      ensureLocalUserId();
    }

    // Verificar si hay un cliente seleccionado
    const savedClient = localStorage.getItem('evolve-selected-client');
    if (!savedClient) {
      // Si no hay cliente seleccionado, redirigir al selector
      router.push('/selector');
      return;
    }

    try {
      // Verificar que el cliente seleccionado sea Cliente 1
      const client = JSON.parse(savedClient);
      if (client.id !== clientId) {
        // Si no coincide el id del cliente, redirigir al login
        return router.push('/login');
      }
      // Sino, cargar el cliente seleccionado
      loadSelectedClient();
    } catch (e) {
      console.error('Error al verificar cliente:', e);
      router.push('/selector');
    }
  }, [router]);

  // Efecto para el loader principal y verificar si mostrar el tutorial
  useEffect(() => {
    // Solo ejecutar si el usuario está autenticado
    if (isAuthenticated) {
      // Simulamos un tiempo mínimo de carga para mostrar el loader
      const timer = setTimeout(() => {
        setLoading(false);

        // Verificar si el usuario ya ha visto el tutorial
        const tutorialCompleted = localStorage.getItem(`${selectedClient?.gcpName}-tutorial-completed`);
        if (!tutorialCompleted) {
          setShowTutorial(true);
        }
      }, 2500); // 2.5 segundos mínimo de loader para verlo bien

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Hook para persistencia de conversaciones en la base de datos
  const { 
    conversations: persistedConversations, 
    loadConversations: loadPersistedConversations,
    createConversation: createPersistedConversation,
    addMessage: addPersistedMessage,
    loadMessages: loadPersistedMessages,
    renameConversation: renamePersistedConversation,
    deleteConversation: deletePersistedConversation
  } = usePersistedConversations({ productId, enabled: isProductChatbot });

  const getActiveConversationStorageKey = () => {
    return productId ? `chatbot-${productId}-active-conversation-id` : 'chatbot-generic-active-conversation-id';
  };

  const readStoredActiveConversationId = () => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(getActiveConversationStorageKey());
    } catch {
      return null;
    }
  };

  const writeStoredActiveConversationId = (conversationId: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(getActiveConversationStorageKey(), conversationId);
    } catch {
      // ignore
    }
  };

  // Cargar conversaciones desde localStorage (fallback) o desde la API
  useEffect(() => {
    const loadConversationsData = async () => {
      if (isProductChatbot) {
        setConversations(persistedConversations);

        if (persistedConversations.length === 0) {
          setActiveConversationId('');
          setMessages([]);
          return;
        }

        const storedId = readStoredActiveConversationId();
        const exists = storedId ? persistedConversations.some((c) => c.id === storedId) : false;
        const targetConversationId = exists ? (storedId as string) : persistedConversations[0].id;

        if (targetConversationId !== activeConversationId) {
          setActiveConversationId(targetConversationId);
        }

        const msgs = await loadPersistedMessages(targetConversationId);
        const formatted = msgs.map(m => ({
          id: m.id,
          type: m.role,
          role: m.role,
          content: m.content,
          chartSpec: (m as any).metadata?.chartSpec,
          timestamp: m.createdAt,
          createdAt: m.createdAt
        }));
        setMessages(formatted);
        setInitialMessage(false);
        writeStoredActiveConversationId(targetConversationId);

        setConversations((prev) => prev.map((c) => (c.id === targetConversationId ? { ...c, messages: formatted } : c)));
        return;
      }

      // Fallback a localStorage
      const savedConversations = localStorage.getItem(`${selectedClient?.gcpName}-conversations`);
      if (savedConversations) {
        try {
          const parsed = JSON.parse(savedConversations);
          if (parsed.length === 0) {
            setActiveConversationId('');
            setMessages([]);
            return;
          }

          const validConversations = parsed.map((conv: any) => ({
            ...conv,
            timestamp: new Date(conv.timestamp)
          }));
          setConversations(validConversations);

          const activeConv = validConversations.find((c: Conversation) => c.id === activeConversationId);
          if (activeConv) {
            setMessages(activeConv.messages);
            setInitialMessage(false);
          } else if (validConversations.length > 0) {
            setActiveConversationId(validConversations[0].id);
            setMessages(validConversations[0].messages);
            setInitialMessage(false);
          }
        } catch (error) {
          console.error('Error parsing saved conversations:', error);
          setActiveConversationId('');
          setMessages([]);
        }
      } else {
        setActiveConversationId('');
        setMessages([]);
      }
    };

    loadConversationsData();
  }, [selectedClient?.gcpName, isProductChatbot, persistedConversations]);

  // Actualizar conversaciones en localStorage (mantener como backup)
  useEffect(() => {
    if (!selectedClient?.gcpName) return;
    if (conversations.length > 0) {
      localStorage.setItem(`${selectedClient?.gcpName}-conversations`, JSON.stringify(conversations));
      return;
    }
    localStorage.removeItem(`${selectedClient?.gcpName}-conversations`);
  }, [conversations, selectedClient?.gcpName]);

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
  const initNewConversation = async () => {
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

    const trimmedWelcome = clientWelcomeMessage?.trim();
    const content = trimmedWelcome && trimmedWelcome.length > 0
      ? trimmedWelcome
      : `${greeting}, ${userName}. ¿En qué puedo ayudarte hoy?`;

    const welcomeMessage: Message = {
      id: nanoid(),
      role: 'assistant' as const,
      type: 'assistant' as const,
      content,
      createdAt: new Date(),
    };

    let newConversationId = generateSessionId();
    if (isProductChatbot) {
      const dbId = await createPersistedConversation('Nueva conversación', welcomeMessage.content);
      if (dbId) {
        newConversationId = dbId;
      }
    }

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

    writeStoredActiveConversationId(newConversationId);
  };

  // Manejar la selección de una conversación
  const handleSelectConversation = async (conversationId: string) => {
    if (conversationId === activeConversationId) return;

    const selectedConversation = conversations.find(conv => conv.id === conversationId);
    if (selectedConversation) {
      setActiveConversationId(conversationId);
      writeStoredActiveConversationId(conversationId);

      if (isProductChatbot) {
        const msgs = selectedConversation.messages?.length
          ? selectedConversation.messages
          : (await loadPersistedMessages(conversationId)).map(m => ({
            id: m.id,
            type: m.role,
            role: m.role,
            content: m.content,
            chartSpec: (m as any).metadata?.chartSpec,
            timestamp: m.createdAt,
            createdAt: m.createdAt
          }));
        setMessages(msgs);
        setInitialMessage(false);
        setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, messages: msgs } : c)));
        return;
      }

      setMessages(selectedConversation.messages);
      setInitialMessage(false);
    }
  };

  // Eliminar una conversación individual
  const handleDeleteConversation = async (conversationId: string) => {
    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);

    // Si la conversación activa es la que se está eliminando, cambiar a otra
    if (conversationId === activeConversationId) {
      if (updatedConversations.length > 0) {
        // Seleccionar la primera conversación disponible
        const nextId = updatedConversations[0].id;
        setActiveConversationId(nextId);
        writeStoredActiveConversationId(nextId);
        if (isProductChatbot) {
          const msgs = await loadPersistedMessages(nextId);
          const formatted = msgs.map(m => ({
            id: m.id,
            type: m.role,
            role: m.role,
            content: m.content,
            chartSpec: (m as any).metadata?.chartSpec,
            timestamp: m.createdAt,
            createdAt: m.createdAt
          }));
          setMessages(formatted);
          setInitialMessage(false);
          setConversations(updatedConversations.map((c) => (c.id === nextId ? { ...c, messages: formatted } : c)));
        } else {
          setMessages(updatedConversations[0].messages);
        }
      } else {
        // Si no quedan conversaciones, mostrar la pantalla vacía
        setActiveConversationId('');
        writeStoredActiveConversationId('');
        setMessages([]);
      }
    }

    setConversations(updatedConversations);

    if (isProductChatbot) {
      const ok = await deletePersistedConversation(conversationId);
      if (ok) {
        await loadPersistedConversations();
      }
    }
  };

  // Limpiar todo el historial de conversaciones
  const handleClearAllConversations = async () => {
    const idsToDelete = conversations.map((c) => c.id);
    setConversations([]);
    setActiveConversationId('');
    writeStoredActiveConversationId('');
    setMessages([]);

    if (isProductChatbot) {
      await Promise.all(idsToDelete.map((id) => deletePersistedConversation(id)));
      await loadPersistedConversations();
    }
  };

  // Renombrar una conversación
  const handleRenameConversation = async (conversationId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, title: trimmed } : conv
      )
    );

    if (isProductChatbot) {
      await renamePersistedConversation(conversationId, trimmed);
    }
  };

  // Auto-generar título basado en el primer mensaje del usuario
  const generateAutoTitle = (userMessage: string): string => {
    // Limpiar el mensaje
    let title = userMessage.trim();
    // Remover saltos de línea
    title = title.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    // Truncar a ~50 chars en el último espacio
    if (title.length > 50) {
      title = title.substring(0, 50);
      const lastSpace = title.lastIndexOf(' ');
      if (lastSpace > 20) {
        title = title.substring(0, lastSpace);
      }
      title += '...';
    }
    return title;
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
            ? lastMessageContent.substring(0, 57) + '...'
            : lastMessageContent,
          timestamp: new Date()
        }
        : conv
    );

    setConversations(updatedConversations);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Edit functionality
  const handleEditMessage = async (messageToEdit: Message) => {
    // Si el mensaje tiene la bandera _skipEditorUI, simplemente actualiza el mensaje sin mostrar el editor
    if (messageToEdit && messageToEdit._skipEditorUI) {
      // Actualizar directamente el mensaje en el array de mensajes
      setMessages(messages.map(msg =>
        msg.id === messageToEdit.id
          ? { ...msg, content: messageToEdit.content, isEdited: true }
          : msg
      ));

      // Enviar el mensaje editado al chatbot automáticamente
      try {
        await handleSendEditedMessage(messageToEdit.content, messageToEdit.id);
      } catch (error) {
        // Error silencioso - el usuario verá el error en la UI
      }

      return; // Salir temprano sin activar el editor
    }

    // Comportamiento normal del editor antiguo
    if (messageToEdit && messageToEdit.role === 'user') {
      setEditingMessage(messageToEdit.id);
      setEditText(messageToEdit.content);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  // Manejar la finalización del tutorial
  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  // Mostrar el tutorial de onboarding
  const handleShowTutorial = () => {
    setShowTutorial(true);
  };

  // Función para abortar la respuesta del bot
  const handleAbortResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsTyping(false);
      setIsWaitingForResponse(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editingMessage) {
      // Encontrar el mensaje original
      const originalMessage = messages.find(msg => msg.id === editingMessage);
      if (!originalMessage) {
        return;
      }

      // Actualizar el mensaje en la lista
      const updatedMessages = messages.map(msg =>
        msg.id === editingMessage
          ? { ...msg, content: editText, isEdited: true }
          : msg
      );
      setMessages(updatedMessages);

      // Cerrar el editor
      setEditingMessage(null);
      setEditText('');

      // Reenviar el mensaje editado al chatbot automáticamente
      try {
        await handleSendEditedMessage(editText, editingMessage);
      } catch (error) {
        // Error silencioso - el usuario verá el error en la UI
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  // Copy message functionality
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // Could add toast notification here
  };

  // Delete message functionality
  const handleDeleteMessage = (messageId: string) => {
    setMessages(messages.filter(msg => msg.id !== messageId));
  };

  // Función auxiliar para obtener los datos del usuario desde la vista
  const getUserAgentData = async () => {
    try {
      // Obtener el email del usuario desde localStorage
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        throw new Error('No se encontró información de autenticación');
      }

      const auth = JSON.parse(authData);
            const userId = auth.userId;

      if (!userId) {
        throw new Error('No se encontró el userId del usuario');
      }

      // Obtener el token de autenticación
      const token = auth.accessToken || '';
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      // Llamar a la API para obtener los datos del usuario
      const response = await fetch('/api/user/agent-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, productId })
      });

      if (!response.ok) {
        throw new Error(`Error al obtener datos del usuario: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error('No se pudieron obtener los datos del usuario');
      }

      return result.data;
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      throw error;
    }
  };

  // Función específica para enviar mensajes editados
  const handleSendEditedMessage = async (message: string, messageId: string) => {
    if (message.trim() === '') {
      return;
    }

    // Encontrar el mensaje original en la lista
    const originalMessageIndex = messages.findIndex(msg => msg.id === messageId);
    if (originalMessageIndex === -1) {
      return;
    }

    try {
      // Mostrar indicador de typing
      setIsTyping(true);

      // Scroll hasta el final de los mensajes
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }

      // Obtener datos del usuario desde la vista
      const userDataDB = await getUserAgentData();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 25 segundos de timeout

      // Para evitar problemas de CORS, usamos la función serverless como intermediario
      // Determinar API específica según el tipo de chatbot
      // let agentUrl;
      // if (isProductChatbot) {
      //   // Para chatbots de productos, usar la API personalizada que integra archivos de conocimiento
      //   agentUrl = '/api/chat/personalized';
      // } else if (clientId === 'bayer') {
      //   // Para Bayer, usar su API específica
      //   agentUrl = '/api/bayer/chat';
      // } else {
      //   // Para otros clientes, usar la API general
      //   agentUrl = '/api/messages';
      // }

      
      // Preparar los datos con la información del usuario desde la vista
      // Para otros chatbots, usar el formato con datos del usuario desde la vista
      const requestBody = {
        message: message,
        needChart: false,
        client: userDataDB.client,
        // Access
        table_names: userDataDB.table_names,
        role_name: userDataDB.role_name,
        data_access: userDataDB.data_access,
        metrics_access: userDataDB.metrics_access,
        // User
        user_id: userDataDB.id_user,
        session_id: activeConversationId,
        client_id: userDataDB.client_id,
        product_id: userDataDB.product_id,
        // Bucket Config
        bucket_config: userDataDB.bucket_config,
        gs_examples_agent: userDataDB.gs_examples_agent,
        gs_prompt_agent: userDataDB.gs_prompt_agent,
        gs_prompt_sql: userDataDB.gs_prompt_sql,
        gs_profiling_agent: userDataDB.gs_profiling_agent,
        gs_metrics_config_agent: userDataDB.gs_metrics_config_agent,
        gs_semantic_config: userDataDB.gs_semantic_config,
        // Extra Config
        alert_event: false,
        search_knowledge_config: { rag_active: true },
        // Connection Config
        config_connection: userDataDB.config_connection || null,

        // Message Config
        isEdited: true,
        originalMessageId: messageId
      };

      
            const authData = localStorage.getItem('evolve-auth');
            const token = authData ? (JSON.parse(authData)?.accessToken || '') : '';

            const response = await fetchWithRetry(agentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `Error en la respuesta: ${response.status} ${response.statusText}`;

        try {
          // Intentar leer el cuerpo de la respuesta de error
          const errorText = await response.text();

          try {
            // Intentar parsear como JSON
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
              errorMessage += ` - ${errorJson.error}`;
            }
          } catch (parseError) {
            if (errorText.includes('<!DOCTYPE')) {
              errorMessage += ' - Recibido HTML en lugar de JSON. Posible problema con la función serverless.';
            } else {
              errorMessage += ` - ${errorText.substring(0, 100)}...`;
            }
          }
        } catch (readError) {
          // Error al leer la respuesta
        }

        throw new Error(errorMessage);
      }

      // Procesar la respuesta
      let data;
      try {
        const responseText = await response.text();

        if (!responseText.trim()) {
          throw new Error('La respuesta está vacía');
        }

        data = JSON.parse(responseText);
      } catch (error) {
        const jsonError = error as Error;
        throw new Error(`Error al procesar la respuesta JSON: ${jsonError.message}`);
      }

      // Crear el objeto de mensaje para el asistente con indicador de respuesta actualizada
      // La API devuelve la respuesta en data.reply (no en data.response)
      const responseText = data.reply || data.response || 'No se recibió respuesta';

      // En lugar de crear un nuevo mensaje, vamos a encontrar el último mensaje del asistente
      // y actualizarlo con la nueva respuesta
      const messageCopy = [...messages];

      // Buscar el último mensaje del asistente antes del mensaje editado
      let lastAssistantIndex = -1;
      const foundUserMessage = false;

      // Recorremos el array de mensajes desde el mensaje editado hacia atrás
      // para encontrar el último mensaje del asistente
      for (let i = originalMessageIndex + 1; i < messageCopy.length; i++) {
        if (messageCopy[i].role === 'assistant' && messageCopy[i].type === 'assistant') {
          lastAssistantIndex = i;
          break;
        }
      }

      if (lastAssistantIndex !== -1) {
        // Actualizar el mensaje existente del asistente
        messageCopy[lastAssistantIndex] = {
          ...messageCopy[lastAssistantIndex],
          content: responseText,
          isUpdatedResponse: true, // Para mostrar la etiqueta 2/2
          updatedAt: new Date(), // Añadimos timestamp de actualización
          knowledgeUsed: data.knowledgeUsed || false
        };
      } else {
        // Si no encontramos un mensaje del asistente después del mensaje editado,
        // añadimos uno nuevo al final
        const newAssistantMessage: Message = {
          id: nanoid(),
          role: 'assistant' as const,
          type: 'assistant' as const,
          content: responseText,
          createdAt: new Date(),
          isUpdatedResponse: true,
          knowledgeUsed: data.knowledgeUsed || false
        };
        messageCopy.push(newAssistantMessage);
      }

      // Actualizar el estado de los mensajes
      setMessages(messageCopy);

      // Detener indicador de typing antes de buscar el chart
      setIsTyping(false);
      setIsWaitingForResponse(false);

      // Intentar obtener chartSpec del backend para la nueva respuesta
      let resolvedChartSpec: any = undefined;
      try {
        // Detectar si la respuesta es una tabla
        const isTable = isTableMessage(responseText);
        let columnCount = 0;
        let tableMarkdown = '';
        let tableTitle: string | null = null;

        if (isTable) {
          const { soloTabla, textoInicial } = separateTableMessage(responseText);
          tableMarkdown = soloTabla;
          tableTitle = textoInicial || null;
          const parsed = parseMarkdownTable(soloTabla);
          if (parsed && parsed.headers) {
            columnCount = parsed.headers.length; // Contar columnas reales de la tabla para que el servicio pueda decidir pivot/apilado
          }
        }

        // Obtener el último mensaje del usuario (el mensaje editado)
        const userPrompt = message;

        // Preparar el body para el servicio de charts
        const chartRequestBody = {
          agent_reply: data.reply,
          user_prompt: userPrompt,
          preferred_types: ['bar', 'line', 'pie'],
          is_table: isTable,
          column_count: columnCount
        };

        const cr = await fetch(chartUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chartRequestBody)
        });
        if (cr.ok) {
          const spec = await cr.json();
          if (isValidChartSpec(spec)) {
            resolvedChartSpec = spec;
          }
        }

        if (!resolvedChartSpec && isTable && tableMarkdown) {
          const fallbackSpec = buildChartSpecFromTable(tableMarkdown, tableTitle || userPrompt);
          if (fallbackSpec) {
            resolvedChartSpec = fallbackSpec;
          }
        }

        if (resolvedChartSpec) {
          const finalMsgs = [...messageCopy];
          if (lastAssistantIndex !== -1) {
            finalMsgs[lastAssistantIndex] = { ...finalMsgs[lastAssistantIndex], chartSpec: resolvedChartSpec } as any;
          } else {
            finalMsgs[finalMsgs.length - 1] = { ...finalMsgs[finalMsgs.length - 1], chartSpec: resolvedChartSpec } as any;
          }
          setMessages(finalMsgs);
        }
      } catch (e) {
        console.warn('Chart spec fallback/no-op (edited):', e);
      }

      // Para mantener la referencia en las variables locales
      const updatedWithAssistantResponse = messageCopy;

      // Actualizar la conversación en el historial
      const updatedConversations = conversations.map(conv => {
        if (conv.id === activeConversationId) {
          return {
            ...conv,
            messages: updatedWithAssistantResponse,
            lastMessage: message, // Actualizamos con el mensaje editado
            timestamp: new Date()
          };
        }
        return conv;
      });
      setConversations(updatedConversations);

    } catch (error) {
      console.error('Error al enviar mensaje editado:', error);

      // Crear mensaje de error
      const errorMessage: Message = {
        id: nanoid(),
        role: 'assistant' as const,
        type: 'error' as const,
        content: `Error al procesar el mensaje editado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        createdAt: new Date(),
        error: error instanceof Error ? error.message : 'Error desconocido'
      };

      // Añadir el mensaje de error a la lista
      const updatedWithError = [...messages, errorMessage];
      setMessages(updatedWithError);

      // Actualizar la conversación en el historial
      const updatedConversations = conversations.map(conv => {
        if (conv.id === activeConversationId) {
          return {
            ...conv,
            messages: updatedWithError,
            timestamp: new Date()
          };
        }
        return conv;
      });
      setConversations(updatedConversations);

    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (message.trim() === '') return;

    // Si estamos editando un mensaje, usamos handleSaveEdit
    if (editingMessage) {
      handleSaveEdit();
      return;
    }

    // Crear el objeto de mensaje para el usuario
    const userMessage: Message = {
      id: nanoid(),
      role: 'user' as const,
      type: 'user' as const,
      content: message,
      createdAt: new Date(),
    };

    // Guardamos el ID del usuario para asegurar que no se pierda en caso de error
    const userMessageId = userMessage.id;

    // Añadirlo a la lista de mensajes y actualizar la conversación activa
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Actualizar conversación en el historial
    const updatedConversations = conversations.map(conv => {
      if (conv.id === activeConversationId) {
        return {
          ...conv,
          messages: updatedMessages,
          lastMessage: message,
          timestamp: new Date()
        };
      }
      return conv;
    });
    setConversations(updatedConversations);

    // Persistir mensaje del usuario en la base de datos
    if (isProductChatbot && activeConversationId) {
      addPersistedMessage(activeConversationId, 'user', message);
    }

    // Auto-generar título si la conversación aún se llama "Nueva conversación"
    const currentConv = conversations.find(c => c.id === activeConversationId);
    if (currentConv && currentConv.title === 'Nueva conversación') {
      const autoTitle = generateAutoTitle(message);
      handleRenameConversation(activeConversationId, autoTitle);
    }

    // Limpiar el input, mostrar indicador de typing y activar estado de espera
    setInputMessage('');
    setIsTyping(true);
    setIsWaitingForResponse(true);

    // Scroll hasta el final de los mensajes
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    try {
      // Guardar referencia a los mensajes locales actualizados para asegurar que se mantienen
      const currentMessagesSnapshot = [...updatedMessages];

      // Obtener datos del usuario desde la vista
      const userDataDB = await getUserAgentData();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 segundos de timeout (aumentado para primer mensaje)

      // Para evitar problemas de CORS, usamos la función serverless como intermediario
      // Esta es la ruta relativa que será redirigida a la función serverless por Netlify
      // Determinar API específica según el tipo de chatbot
      // let agentUrl;
      // if (isProductChatbot) {
      //   // Para chatbots de productos, usar la API personalizada que integra archivos de conocimiento
      //   agentUrl = '/api/chat/personalized';
      // } else if (clientId === 'bayer') {
      //   // Para Bayer, usar su API específica
      //   agentUrl = '/api/bayer/chat';
      // } else {
      //   // Para otros clientes, usar la API general
      //   agentUrl = '/api/messages';
      // }



      // Preparar los datos según el tipo de chatbot

      // Para otros chatbots, usar el formato con datos del usuario desde la vista
      const requestData = {
        message: message,
        needChart: false,
        client: userDataDB.client,
        // Access
        table_names: userDataDB.table_names,
        role_name: userDataDB.role_name,
        data_access: userDataDB.data_access,
        metrics_access: userDataDB.metrics_access,
        // User
        user_id: userDataDB.id_user,
        session_id: activeConversationId,
        client_id: userDataDB.client_id,
        product_id: userDataDB.product_id,
        // Bucket Config
        bucket_config: userDataDB.bucket_config,
        gs_examples_agent: userDataDB.gs_examples_agent,
        gs_prompt_agent: userDataDB.gs_prompt_agent,
        gs_prompt_sql: userDataDB.gs_prompt_sql,
        gs_profiling_agent: userDataDB.gs_profiling_agent,
        gs_metrics_config_agent: userDataDB.gs_metrics_config_agent,
        gs_semantic_config: userDataDB.gs_semantic_config,
        // Extra Config
        alert_event: false,
        search_knowledge_config: { rag_active: true },
        // Connection Config
        config_connection: userDataDB.config_connection || null,
      };

      // const tokenRes = await fetch(`/api/token?audience=${encodeURIComponent(agentUrl)}`);
      // const { token: idToken } = await tokenRes.json();
      // console.log('idToken',idToken);

      // if (!idToken) {
      //   throw new Error('No se pudo obtener el ID Token desde /api/token');
      // }

      // const response = await fetch('/api/token', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(requestData),
      //   signal: controller.signal
      // });

      const authData = localStorage.getItem('evolve-auth');
      const token = authData ? (JSON.parse(authData)?.accessToken || '') : '';

      const response = await fetchWithRetry(agentEndpoint, {
        method: 'POST',
        headers: {
          // 'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      // Asegurar que los mensajes locales no se han perdido mientras esperábamos la respuesta
      setMessages(currentMessagesSnapshot);

      clearTimeout(timeoutId);

      // Leer el cuerpo de la respuesta UNA SOLA VEZ
      let responseText = '';
      try {
        responseText = await response.text();
      } catch (readError) {
        console.error('Error al leer la respuesta:', readError);
        throw new Error('No se pudo leer la respuesta del servidor');
      }

      if (!response.ok) {
        let errorMessage = `Error en la respuesta: ${response.status} ${response.statusText}`;
        let userFriendlyMessage = '';

        try {
          try {
            // Intentar parsear como JSON
            const errorJson = JSON.parse(responseText);
            if (errorJson.error) {
              errorMessage += ` - ${errorJson.error}`;
            }
          } catch (parseError) {
            // No es JSON, usar como texto de error
            if (responseText.includes('<!DOCTYPE')) {
              errorMessage += ' - Recibido HTML en lugar de JSON. Posible problema con la función serverless.';
            } else {
              errorMessage += ` - ${responseText.substring(0, 500)}...`;
            }
          }
        } catch (readError) {
          // Error al leer la respuesta
        }

        if (response.status >= 500) {
          errorMessage += ` (upstream: ${agentEndpoint})`;
        }

        // Configurar mensajes de error específicos
        if (response.status >= 500) {
          userFriendlyMessage = 'El servicio está temporalmente no disponible. Por favor, intenta de nuevo en unos momentos.';
        } else if (response.status === 404) {
          userFriendlyMessage = 'El servicio solicitado no está disponible en este momento.';
        } else if (response.status === 429) {
          userFriendlyMessage = 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.';
        }

        throw new Error(errorMessage);
      }

      // Intenta parsear la respuesta como JSON
      let data;
      try {
        // Ya tenemos responseText leído anteriormente

        // Si la respuesta está vacía o no es JSON válido
        if (!responseText.trim()) {
          throw new Error('La respuesta está vacía');
        }

        data = JSON.parse(responseText);
      } catch (error) {
        const jsonError = error as Error;
        throw new Error(`Error al procesar la respuesta: ${jsonError.message}`);
      }

      // Verificar si es un mensaje de error
      if (data.isError) {
        // Crear mensaje de error
        const errorMsg: Message = {
          id: nanoid(),
          role: 'assistant',
          type: 'error', // Tipo especial para errores
          content: data.reply || 'Hubo un problema con la conexión al servicio de chat.',
          createdAt: new Date(),
          error: data.error || 'Error desconocido',
        };

        // Actualizar mensajes usando el snapshot que incluye el mensaje del usuario
        const updatedMsgs = [...currentMessagesSnapshot, errorMsg];
        setMessages(updatedMsgs);

        // Actualizar conversación en el historial
        updateConversationHistory(updatedMsgs);
      } else {
        // Usar el snapshot de mensajes que incluye el mensaje del usuario
        let updatedMsgs = [...currentMessagesSnapshot];

        // Check if we have function details to show
        if (data.functionDetails) {
          // Add a function message first
          const functionMsg: Message = {
            id: nanoid(),
            role: 'system',
            type: 'function',
            content: 'Procesando...',
            name: 'analisis_datos',
            createdAt: new Date(),
          };

          updatedMsgs = [...updatedMsgs, functionMsg];
          // Aplicar la actualización inmediatamente
          setMessages(updatedMsgs);

          // Short delay to show the processing message
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Add the assistant response
        const assistantMsg: Message = {
          id: nanoid(),
          role: 'assistant',
          type: 'assistant',
          content: data.reply || `No se recibió respuesta del Chatbot ${selectedClient?.name}`,
          chart: data.chart || null,
          createdAt: new Date(),
          functionDetails: data.functionDetails || null,
          knowledgeUsed: data.knowledgeUsed || false,
        };

        // Asegurarse de nuevo que estamos usando los mensajes actualizados que incluyen el mensaje del usuario
        updatedMsgs = [...currentMessagesSnapshot, assistantMsg];

        // Aplicar la actualización y actualizar el historial
        setMessages(updatedMsgs);

        // Detener indicador de typing antes de buscar el chart
        setIsTyping(false);
        setIsWaitingForResponse(false);

        // Intentar obtener chartSpec del backend
        let resolvedChartSpec: any = undefined;
        let finalMsgs = updatedMsgs;
        try {
          // Detectar si la respuesta es una tabla
          const replyText = data.reply || '';
          const isTable = isTableMessage(replyText);
          let columnCount = 0;
          let tableMarkdown = '';
          let tableTitle: string | null = null;

          if (isTable) {
            const { soloTabla, textoInicial } = separateTableMessage(replyText);
            tableMarkdown = soloTabla;
            tableTitle = textoInicial || null;
            const parsed = parseMarkdownTable(soloTabla);
            if (parsed && parsed.headers) {
              columnCount = parsed.headers.length; // Contar columnas reales de la tabla para que el servicio pueda decidir pivot/apilado
            }
          }

          // Obtener el último mensaje del usuario
          const userPrompt = message;

          // Preparar el body para el servicio de charts
          const chartRequestBody = {
            agent_reply: data.reply,
            user_prompt: userPrompt,
            preferred_types: ['bar', 'line', 'pie'],
            is_table: isTable,
            column_count: columnCount
          };

          const cr = await fetch(chartUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chartRequestBody)
          });
          if (cr.ok) {
            const spec = await cr.json();
            if (isValidChartSpec(spec)) {
              resolvedChartSpec = spec;
            }
          }

          if (!resolvedChartSpec && isTable && tableMarkdown) {
            const fallbackSpec = buildChartSpecFromTable(tableMarkdown, tableTitle || userPrompt);
            if (fallbackSpec) {
              resolvedChartSpec = fallbackSpec;
            }
          }

          if (resolvedChartSpec) {
            finalMsgs = updatedMsgs.map((m, i) => i === updatedMsgs.length - 1 ? { ...m, chartSpec: resolvedChartSpec } : m);
            setMessages(finalMsgs);
          }
        } catch (e) {
          console.warn('Chart spec fallback/no-op:', e);
        }

        // Actualizar conversación en el historial
        updateConversationHistory(finalMsgs);

        // Persistir mensaje del asistente en la base de datos (incluyendo chartSpec si existe)
        if (isProductChatbot && activeConversationId) {
          const metadata = resolvedChartSpec ? { chartSpec: resolvedChartSpec } : undefined;
          addPersistedMessage(activeConversationId, 'assistant', assistantMsg.content, 'text', metadata);
        }
      }
    } catch (error) {
      console.error('Error:', error);

      // Verificar que el mensaje del usuario esté todavía en los mensajes actuales
      // Si por alguna razón no está, asegurarse de que permanezca
      const currentMessages = [...messages];
      const userMessageExists = currentMessages.some(msg => msg.role === 'user' && msg.content.trim() === userMessage.content.trim());

      // Si el mensaje del usuario no existe en los mensajes actuales (por algún problema de estado),
      // lo agregamos de nuevo para asegurar que esté presente
      if (!userMessageExists) {
        currentMessages.push(userMessage);
      }

      // Crear mensaje de error basado en el tipo
      let errorMsg: Message;

      // Verificar si es un error de timeout (AbortController)
      if (error instanceof DOMException && error.name === 'AbortError') {
        errorMsg = {
          id: nanoid(),
          role: 'assistant',
          type: 'error',
          content: 'La respuesta está tomando más tiempo del esperado. El chatbot podría estar procesando una consulta compleja o experimentando alta carga. Por favor, intenta una pregunta más corta o específica.',
          createdAt: new Date(),
          error: 'Timeout: La solicitud excedió el límite de tiempo (25 segundos)',
        };
      } else {
        // Manejo mejorado de errores con mensajes más amigables
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        let userFriendlyContent = '';

        // Detectar errores específicos de Bayer 422
        if (errorMessage.includes('422') && errorMessage.includes('Bayer')) {
          userFriendlyContent = 'El servicio de Bayer está experimentando dificultades técnicas temporales. Hemos activado nuestro sistema de respaldo para proporcionarte una respuesta alternativa. Si el problema persiste, por favor intenta reformular tu pregunta o contacta al soporte técnico.';
        } else if (errorMessage.includes('422')) {
          userFriendlyContent = 'Hubo un problema al procesar tu solicitud. Por favor, verifica que tu mensaje esté bien formateado e intenta de nuevo.';
        } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
          userFriendlyContent = 'El servicio está temporalmente no disponible debido a mantenimiento o alta carga. Por favor, intenta de nuevo en unos momentos.';
        } else if (errorMessage.includes('404')) {
          userFriendlyContent = 'El servicio solicitado no está disponible en este momento. Por favor, contacta al administrador del sistema.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
          userFriendlyContent = 'La conexión ha excedido el tiempo límite. Esto puede deberse a una consulta compleja o problemas de conectividad. Por favor, intenta con una pregunta más específica.';
        } else {
          userFriendlyContent = `Ocurrió un error inesperado: ${errorMessage}. Por favor, intenta de nuevo o contacta al soporte técnico si el problema persiste.`;
        }

        errorMsg = {
          id: nanoid(),
          role: 'assistant',
          type: 'error',
          content: userFriendlyContent,
          createdAt: new Date(),
          error: error instanceof Error ? error.stack : 'No hay detalles adicionales',
        };
      }

      // Agregar el mensaje de error a los mensajes actuales (que ya incluyen el mensaje del usuario)
      const updatedMsgs = [...currentMessages, errorMsg];
      setMessages(updatedMsgs);
      updateConversationHistory(updatedMsgs);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.main
      className="flex h-screen overflow-hidden bg-[#111111]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <AnimatePresence>
        <Loader
          loading={loading}
          onTransitionComplete={() => {
            // Una vez completada la transición, nos aseguramos que el sidebar esté visible
            setSidebarVisible(true);
          }}
        />
      </AnimatePresence>
      {/* Sidebar - Responsive */}
      <ChatSidebar
        visible={sidebarVisible}
        onToggle={() => setSidebarVisible(!sidebarVisible)}
        onSelectConversation={handleSelectConversation}
        activeConversationId={activeConversationId}
        conversations={conversations}
        onNewConversation={initNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onClearAllConversations={handleClearAllConversations}
        onShowTutorial={handleShowTutorial}
        className="z-20"
        clientName={selectedClient?.name}
        chatbotName={selectedClient?.gcpName}
        productId={productId}
        userId={userId}
        userName={userName}
        userEmail={userEmail}
        onLogout={() => {
                    localStorage.removeItem('evolve-auth');
          localStorage.removeItem('evolve-selected-client');
                    window.location.href = '/login';
        }}
        onProfileClick={() => {
          router.push('/dashboard/admin');
        }}
      />

      {/* Main content - Responsive */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        {/* Chat Header */}
        <ChatHeader
          username={userName}
          onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        />

        {/* Espacio para información contextual */}

        <motion.div
          className="flex-1 overflow-y-auto px-2 sm:px-4 pb-4 chat-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="w-full max-w-3xl mx-auto">
            {/* Editing interface */}
            {editingMessage && (
              <motion.div
                className="bg-[#1f1f1f] p-4 rounded-lg mb-4 glass-effect"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-white mb-2 font-medium">Editar mensaje</h3>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-3 bg-[#2e2e2e] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 border border-gray-700"
                  rows={4}
                />
                <motion.div className="flex gap-3">
                  <motion.button
                    onClick={handleSaveEdit}
                    className="bg-[#3978d5] hover:bg-[#4a88e5] text-white px-4 py-2 rounded-md"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Guardar
                  </motion.button>
                  <motion.button
                    onClick={handleCancelEdit}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Cancelar
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

            {/* Mostrar pantalla vacía cuando no hay conversaciones */}
            {activeConversationId === '' ? (
              <EmptyChat onNewChat={initNewConversation} />
            ) : (
              <>
                <MessageList
                  messages={messages}
                  isTyping={isTyping}
                  messagesEndRef={messagesEndRef}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onCopyMessage={handleCopyMessage}
                />

                <div ref={messagesEndRef}></div>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          className="bg-[#111111] border-t border-gray-800"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="max-w-3xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
            {/* Mostrar input solo cuando hay una conversación activa */}
            {activeConversationId !== '' && (
              <>
                <FeatureButtons onSuggestionClick={handleSuggestionClick} />

                <ChatInput onSendMessage={handleSendMessage} inputValue={inputMessage} setInputValue={setInputMessage} suggestedPrompts={suggestedPrompts} />
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Tutorial de onboarding para nuevos usuarios */}
      {showTutorial && (
        <OnboardingTutorial
          onComplete={handleTutorialComplete}
          onSuggestionClick={handleSuggestionClick}
          hasActiveConversation={activeConversationId !== ''}
          onNewConversation={initNewConversation}
          clientName={selectedClient?.gcpName!}
          chatbotName={selectedClient?.name!}
          clientDescription={clientAbout}
          exampleQuestions={exampleQuestions}
        />
      )}
    </motion.main>
  );
}