'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatSidebar from '../../../../components/ChatSidebar';
import DashboardCanvas from '../../../../components/DashboardCanvas';
import { Conversation } from '@/lib/types';
import { FiMessageSquare } from '@/lib/icons';
import { usePersistedConversations } from '@/hooks/usePersistedConversations';

type Props = {
  config: {
    productId: string;
    clientId: string;
    client: {
      id: string;
      name: string;
      companyName: string;
      description: string;
    };
    productName: string;
    welcomeMessage: string;
    about: string;
    suggestedPrompts: string[];
    exampleQuestions: string[];
    component?: string;
    apiEndpoint?: string;
  };
};

export default function ClientSideDashboardPage({ config }: Props) {
  const router = useRouter();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState<string>('Usuario');
  const [userEmail, setUserEmail] = useState<string>('usuario@minddash.ai');
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const isProductChatbot = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.productId);

  const {
    conversations: persistedConversations,
    loadConversations: loadPersistedConversations,
    deleteConversation: deletePersistedConversation,
  } = usePersistedConversations({ productId: config.productId, enabled: isProductChatbot });

  const getActiveConversationStorageKey = () => {
    return config.productId ? `chatbot-${config.productId}-active-conversation-id` : 'chatbot-generic-active-conversation-id';
  };

  const writeStoredActiveConversationId = (conversationId: string) => {
    try {
      localStorage.setItem(getActiveConversationStorageKey(), conversationId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1280;
      setSidebarVisible(isDesktop);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let authUserId: string | undefined;
    if (isProductChatbot) {
      try {
        const authData = localStorage.getItem('evolve-auth');
        if (authData) {
          const auth = JSON.parse(authData);
          if (auth.userId) authUserId = auth.userId;
          if (auth.username) setUserName(auth.username);
          if (auth.email) setUserEmail(auth.email);
        }
      } catch (error) {
        console.warn('No se pudo leer evolve-auth', error);
      }
    }

    if (authUserId) {
      if (userId !== authUserId) setUserId(authUserId);
      return;
    }

    if (!userId) {
      const key = config.productId ? `chatbot-${config.productId}-local-user-id` : 'chatbot-generic-local-user-id';
      let existing: string | null = null;
      try {
        existing = localStorage.getItem(key);
      } catch (error) {
        console.warn('No se pudo leer localStorage para userId local', error);
      }
      if (existing) {
        setUserId(existing);
      } else {
        const generated = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
        try {
          localStorage.setItem(key, generated);
        } catch (error) {
          console.warn('No se pudo guardar userId local', error);
        }
        setUserId(generated);
      }
    }
  }, [isProductChatbot, config.productId, userId]);

  useEffect(() => {
    if (!isProductChatbot) return;
    loadPersistedConversations();
  }, [isProductChatbot, loadPersistedConversations]);

  useEffect(() => {
    if (!isProductChatbot) return;
    setConversations(persistedConversations);
  }, [isProductChatbot, persistedConversations]);

  const handleBackToChat = () => {
    router.push(`/chatbot/${config.productId}`);
  };

  const handleSelectConversation = (conversationId: string) => {
    writeStoredActiveConversationId(conversationId);
    router.push(`/chatbot/${config.productId}`);
  };

  const handleNewConversation = () => {
    writeStoredActiveConversationId('');
    router.push(`/chatbot/${config.productId}`);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!isProductChatbot) return;
    const ok = await deletePersistedConversation(conversationId);
    if (ok) {
      await loadPersistedConversations();
    }
  };

  return (
    <div className="flex h-screen bg-[#111111] overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        visible={sidebarVisible}
        onToggle={() => setSidebarVisible(!sidebarVisible)}
        conversations={conversations}
        activeConversationId={''}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        productId={config.productId}
        userId={userId}
        userName={userName}
        userEmail={userEmail}
        onLogout={() => {
          localStorage.removeItem('evolve-auth');
          localStorage.removeItem('evolve-selected-client');
          window.location.href = '/login';
        }}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#0c0c0c]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="xl:hidden p-2 rounded-lg hover:bg-gray-800 text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white">
              Mis Dashboards
            </h1>
            <span className="text-sm text-gray-500">
              {config.productName}
            </span>
          </div>
          <button
            onClick={handleBackToChat}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors text-sm"
          >
            <FiMessageSquare className="w-4 h-4" />
            Volver al chat
          </button>
        </div>

        {/* Dashboard Canvas */}
        <div className="flex-1 overflow-auto">
          <DashboardCanvas
            userId={userId}
            productId={config.productId}
          />
        </div>
      </div>
    </div>
  );
}
