'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ChatSidebar from '../../../../components/ChatSidebar';
import ChartRenderer from '../../../../components/ChartRenderer';
import { Conversation } from '@/lib/types';
import { FiLoader, FiMessageSquare, FiTrendingUp, FiSend, FiRefreshCw, FiChevronDown, FiChevronUp, FiZap, FiBarChart2, FiPieChart, FiMinimize2 } from '@/lib/icons';
import { usePersistedConversations } from '@/hooks/usePersistedConversations';
import { motion, AnimatePresence } from 'framer-motion';
import { useInsightContext } from '@/contexts/InsightContext';

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

const SUGGESTED_INSIGHTS = [
  { label: 'KPIs principales', prompt: 'Genera un dashboard con los KPIs principales del negocio', icon: FiBarChart2 },
  { label: 'Tendencias recientes', prompt: 'Muéstrame las tendencias más relevantes de los últimos meses', icon: FiTrendingUp },
  { label: 'Distribución de datos', prompt: 'Crea gráficos de distribución de las métricas más importantes', icon: FiPieChart },
  { label: 'Análisis comparativo', prompt: 'Genera un análisis comparativo de las principales categorías', icon: FiZap },
];

export default function ClientSideInsightPage({ config }: Props) {
  const router = useRouter();
  const { task, generateInsight, clearTask } = useInsightContext();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState<string>('Usuario');
  const [userEmail, setUserEmail] = useState<string>('usuario@minddash.ai');
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [prompt, setPrompt] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Restore prompt from context if local state is empty (e.g. after page reload)
  useEffect(() => {
    if (!prompt && task.productId === config.productId && task.result.queryUsed) {
      setPrompt(task.result.queryUsed);
    }
  }, [task.productId, task.result.queryUsed, config.productId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived state from context — scoped to current product
  const isCurrentProduct = task.productId === config.productId;
  const loading = isCurrentProduct && task.status === 'loading';
  const error = isCurrentProduct && task.status === 'error' ? task.error : null;
  const result = isCurrentProduct && task.status === 'success' ? task.result : { replyText: null, charts: [], raw: null, queryUsed: '' };
  const elapsedSeconds = isCurrentProduct ? task.elapsedSeconds : 0;

  const isProductChatbot = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.productId);

  const {
    conversations: persistedConversations,
    loadConversations: loadPersistedConversations,
    deleteConversation: deletePersistedConversation,
  } = usePersistedConversations({ productId: config.productId, enabled: isProductChatbot });

  const authAccessToken = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('evolve-auth') : null;
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.accessToken || '';
    } catch {
      return '';
    }
  }, []);

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
      } catch {
        // ignore
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
      } catch {
        // ignore
      }
      if (existing) {
        setUserId(existing);
      } else {
        const generated = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
        try {
          localStorage.setItem(key, generated);
        } catch {
          // ignore
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

  const handleGenerateInsight = (overridePrompt?: string) => {
    const finalPrompt = overridePrompt ?? prompt;
    if (!finalPrompt.trim()) return;

    if (overridePrompt) setPrompt(overridePrompt);
    setShowRawJson(false);

    generateInsight({
      prompt: finalPrompt,
      productId: config.productId,
      productName: config.productName,
      authAccessToken,
    });
  };

  const handleReset = () => {
    setPrompt('');
    setShowRawJson(false);
    clearTask();
  };

  // Auto-scroll to results when they arrive
  useEffect(() => {
    if (isCurrentProduct && task.status === 'success') {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [isCurrentProduct, task.status]);

  const hasResults = result.replyText || result.charts.length > 0;

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
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

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="xl:hidden p-2 rounded-lg hover:bg-white/5 text-gray-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <FiTrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-white leading-tight">Insights</h1>
                <span className="text-[11px] text-gray-500 leading-tight">{config.productName}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleBackToChat}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-400 hover:text-white transition-all text-sm"
          >
            <FiMessageSquare className="w-3.5 h-3.5" />
            Chat
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

            {/* Prompt Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5"
            >
              {/* Title area */}
              {!hasResults && !loading && (
                <div className="mb-5 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
                    <FiZap className="w-3 h-3" />
                    Análisis con MindDash Agent
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-1">Genera insights de tus datos</h2>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Describe lo que quieres analizar y la IA creará un dashboard con gráficos y explicaciones. Es una consulta única, no un chat.
                  </p>
                </div>
              )}

              {/* Input area */}
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !loading && prompt.trim()) {
                      e.preventDefault();
                      handleGenerateInsight();
                    }
                  }}
                  rows={hasResults ? 2 : 3}
                  disabled={loading}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 pr-24 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none disabled:opacity-50"
                  placeholder="Ej: Crea un dashboard con los principales KPIs de ventas del último trimestre..."
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                  {hasResults && (
                    <button
                      onClick={handleReset}
                      disabled={loading}
                      className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
                      title="Nueva consulta"
                    >
                      <FiRefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleGenerateInsight()}
                    disabled={loading || !prompt.trim()}
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
                    title="Generar Insight"
                  >
                    {loading ? (
                      <FiLoader className="w-4 h-4 animate-spin" />
                    ) : (
                      <FiSend className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Auth warning */}
              {!authAccessToken && (
                <div className="mt-3 text-xs text-yellow-200/80 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                  Inicia sesión para habilitar Insights.
                </div>
              )}

              {/* Suggested prompts */}
              {!hasResults && !loading && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {SUGGESTED_INSIGHTS.map((suggestion, i) => {
                    const Icon = suggestion.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => handleGenerateInsight(suggestion.prompt)}
                        disabled={!authAccessToken}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] text-left transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <div className="w-7 h-7 rounded-md bg-white/[0.04] flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/10 transition-colors">
                          <Icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors leading-tight">
                          {suggestion.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Loading state */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-white/[0.06] bg-[#111111] p-8"
                >
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FiZap className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Generando insight...</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {isCurrentProduct ? task.progressStep : 'La IA está analizando tus datos y creando visualizaciones'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="tabular-nums">{elapsedSeconds}s</span>
                      <span>transcurridos</span>
                    </div>
                    <div className="w-48 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ width: '60%' }}
                      />
                    </div>
                    <button
                      onClick={() => router.push(`/chatbot/${config.productId}`)}
                      className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-400 hover:text-white text-sm transition-all"
                    >
                      <FiMinimize2 className="w-3.5 h-3.5" />
                      Minimizar y seguir navegando
                    </button>
                    <p className="text-[11px] text-gray-600 mt-2">
                      Te notificaremos cuando esté listo.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error state */}
            <AnimatePresence>
              {error && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-6"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white mb-1.5">No se pudo completar el análisis</p>
                      <p className="text-sm text-gray-400 max-w-md">{error}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleGenerateInsight()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
                      >
                        <FiRefreshCw className="w-3.5 h-3.5" />
                        Intentar de nuevo
                      </button>
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-400 hover:text-white text-sm transition-all"
                      >
                        Nueva consulta
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results */}
            {hasResults && !loading && (
              <div ref={resultsRef} className="space-y-4">
                {/* Query badge */}
                {result.queryUsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-xs text-gray-500"
                  >
                    <span className="w-1 h-1 rounded-full bg-blue-500" />
                    <span className="truncate">Consulta: &ldquo;{result.queryUsed}&rdquo;</span>
                    {elapsedSeconds > 0 && (
                      <span className="text-gray-600 flex-shrink-0">({elapsedSeconds}s)</span>
                    )}
                  </motion.div>
                )}

                {/* Explanation Card */}
                {result.replyText && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                        <FiZap className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Análisis</span>
                    </div>
                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{result.replyText}</div>
                  </motion.div>
                )}

                {/* Charts Grid */}
                {result.charts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
                        <FiBarChart2 className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Dashboard ({result.charts.length} {result.charts.length === 1 ? 'gráfico' : 'gráficos'})
                      </span>
                    </div>
                    <div className={`grid gap-4 ${result.charts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                      {result.charts.map((chart, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                        >
                          <ChartRenderer spec={chart} />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Technical details (dev only, very subtle) */}
                {result.raw && process.env.NODE_ENV === 'development' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <button
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="flex items-center gap-1.5 text-[11px] text-gray-700 hover:text-gray-500 transition-colors opacity-60 hover:opacity-100"
                    >
                      {showRawJson ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />}
                      {showRawJson ? 'Ocultar' : 'Ver'} detalles técnicos
                    </button>
                    <AnimatePresence>
                      {showRawJson && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden"
                        >
                          <pre className="text-[11px] text-gray-600 overflow-auto p-4 max-h-96">
                            {typeof result.raw === 'string' ? result.raw : JSON.stringify(result.raw, null, 2)}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
