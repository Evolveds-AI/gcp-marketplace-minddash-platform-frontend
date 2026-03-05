'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FiSearch,
  FiArrowLeft,
  FiMessageSquare,
  FiTrash2,
  FiEdit2,
  FiCheck,
  FiX,
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiMessageCircleOff,
  FiDownload,
} from '@/lib/icons';
import { usePersistedConversations } from '@/hooks/usePersistedConversations';
import ConfirmationModal from '@/components/ConfirmationModal';
import { exportConversationAsTxt, exportConversationAsCsv, exportConversationsAsCsv } from '@/lib/utils/exportConversations';

interface HistoryConfig {
  productId: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    companyName: string;
    description: string;
  };
  productName: string;
}

interface MessagePreview {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

export default function ClientSideHistoryPage({ config }: { config: HistoryConfig }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<MessagePreview[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [exportMenuOpen, setExportMenuOpen] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);

  const {
    conversations,
    loading,
    loadConversations,
    loadMessages,
    searchConversations,
    renameConversation,
    deleteConversation,
  } = usePersistedConversations({ productId: config.productId, enabled: isAuthenticated });

  // Check auth
  useEffect(() => {
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (authData) {
        const auth = JSON.parse(authData);
        if (auth.isAuthenticated && auth.accessToken) {
          setIsAuthenticated(true);
          return;
        }
      }
    } catch (e) {
      console.error('Error checking auth:', e);
    }
    router.push('/login');
  }, [router]);

  // Debounced server-side full-text search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchConversations(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults(null);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, searchConversations]);

  // Use search results when searching, otherwise use all conversations
  const baseConversations = searchResults !== null ? searchResults : conversations;

  // Apply date filter
  const filteredConversations = baseConversations.filter(conv => {
    if (dateFilter === 'all') return true;

    const now = new Date();
    const convDate = new Date(conv.timestamp);
    const diffDays = (now.getTime() - convDate.getTime()) / (1000 * 60 * 60 * 24);

    if (dateFilter === 'today') return diffDays < 1;
    if (dateFilter === 'week') return diffDays < 7;
    if (dateFilter === 'month') return diffDays < 30;
    if (dateFilter === 'custom') {
      if (customDateFrom) {
        const from = new Date(customDateFrom);
        from.setHours(0, 0, 0, 0);
        if (convDate < from) return false;
      }
      if (customDateTo) {
        const to = new Date(customDateTo);
        to.setHours(23, 59, 59, 999);
        if (convDate > to) return false;
      }
      return true;
    }
    return true;
  });

  // Group conversations by date
  const groupedConversations = filteredConversations.reduce<Record<string, typeof filteredConversations>>((groups, conv) => {
    const date = new Date(conv.timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    let groupKey: string;
    if (diffDays === 0) groupKey = 'Hoy';
    else if (diffDays === 1) groupKey = 'Ayer';
    else if (diffDays < 7) groupKey = 'Esta semana';
    else if (diffDays < 30) groupKey = 'Este mes';
    else groupKey = format(date, 'MMMM yyyy', { locale: es });

    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(conv);
    return groups;
  }, {});

  // Expand/collapse conversation to show messages
  const toggleExpand = useCallback(async (conversationId: string) => {
    if (expandedId === conversationId) {
      setExpandedId(null);
      setExpandedMessages([]);
      return;
    }

    setExpandedId(conversationId);
    setLoadingMessages(true);
    try {
      const msgs = await loadMessages(conversationId);
      setExpandedMessages(msgs.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: new Date(m.createdAt),
      })));
    } catch (err) {
      console.error('Error loading messages:', err);
      setExpandedMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [expandedId, loadMessages]);

  // Rename
  const startRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentTitle);
  };

  const submitRename = async () => {
    if (renamingId && renameValue.trim()) {
      await renameConversation(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); submitRename(); }
    else if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
  };

  // Delete
  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (conversationToDelete) {
      await deleteConversation(conversationToDelete);
      if (expandedId === conversationToDelete) {
        setExpandedId(null);
        setExpandedMessages([]);
      }
    }
    setDeleteModalOpen(false);
    setConversationToDelete(null);
  };

  // Export single conversation
  const handleExportConversation = async (convId: string, format: 'txt' | 'csv') => {
    setExportMenuOpen(null);
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;

    const msgs = await loadMessages(convId);
    const exportData = {
      id: conv.id,
      title: conv.title,
      timestamp: conv.timestamp,
      messages: msgs.map(m => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
    };

    if (format === 'txt') exportConversationAsTxt(exportData);
    else exportConversationAsCsv(exportData);
  };

  // Export all conversations
  const handleExportAll = async () => {
    const allExportData: any[] = [];
    for (const conv of conversations) {
      const msgs = await loadMessages(conv.id);
      allExportData.push({
        id: conv.id,
        title: conv.title,
        timestamp: conv.timestamp,
        messages: msgs.map(m => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
      });
    }
    exportConversationsAsCsv(allExportData);
  };

  // Navigate to chat
  const openInChat = (conversationId: string) => {
    // Store the conversation ID so the chatbot page picks it up
    const storageKey = `chatbot-${config.productId}-active-conversation-id`;
    localStorage.setItem(storageKey, conversationId);
    router.push(`/chatbot/${config.productId}`);
  };

  const formatFullDate = (date: Date) => {
    return format(new Date(date), "d 'de' MMMM, yyyy · HH:mm", { locale: es });
  };

  const formatTime = (date: Date) => {
    return format(new Date(date), 'HH:mm', { locale: es });
  };

  // Stats
  const totalConversations = conversations.length;
  const thisWeekCount = conversations.filter(c => {
    const diff = (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return diff < 7;
  }).length;

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push(`/chatbot/${config.productId}`)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="Volver al chat"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">Historial de Conversaciones</h1>
              <p className="text-xs text-gray-500 mt-0.5">{config.productName}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg">
                <FiMessageSquare className="w-3.5 h-3.5" />
                <span>{totalConversations} total</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg">
                <FiClock className="w-3.5 h-3.5" />
                <span>{thisWeekCount} esta semana</span>
              </div>
              {totalConversations > 0 && (
                <button
                  onClick={handleExportAll}
                  className="flex items-center gap-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 px-3 py-1.5 rounded-lg text-blue-400 transition-colors"
                  title="Exportar todo como CSV"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  <span>Exportar</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              {searching ? (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              )}
              <input
                type="text"
                placeholder="Buscar dentro de los mensajes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161616] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center bg-[#161616] border border-white/5 rounded-xl p-1">
              {(['all', 'today', 'week', 'month', 'custom'] as const).map((filter) => {
                const labels = { all: 'Todas', today: 'Hoy', week: 'Semana', month: 'Mes', custom: 'Rango' };
                return (
                  <button
                    key={filter}
                    onClick={() => setDateFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      dateFilter === filter
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {labels[filter]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom date range inputs */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Desde</span>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="bg-[#161616] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 [color-scheme:dark]"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Hasta</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="bg-[#161616] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 [color-scheme:dark]"
                />
              </div>
              {(customDateFrom || customDateTo) && (
                <button
                  onClick={() => { setCustomDateFrom(''); setCustomDateTo(''); }}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500">Cargando historial...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <FiMessageCircleOff className="w-7 h-7 text-gray-600" />
            </div>
            <p className="text-lg text-gray-400 font-medium mb-1">
              {searchQuery ? 'Sin resultados' : 'No hay conversaciones'}
            </p>
            <p className="text-sm text-gray-600">
              {searchQuery
                ? 'Intenta con otros términos de búsqueda'
                : 'Las conversaciones que tengas con el chatbot aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedConversations).map(([groupLabel, convs]) => (
              <div key={groupLabel}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <FiCalendar className="w-3.5 h-3.5 text-gray-600" />
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{groupLabel}</h2>
                  <span className="text-[10px] text-gray-700 bg-white/5 px-2 py-0.5 rounded-full">{convs.length}</span>
                </div>

                <div className="space-y-2">
                  {convs.map((conv) => (
                    <motion.div
                      key={conv.id}
                      layout
                      className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors"
                    >
                      {/* Conversation header row */}
                      <div
                        className="flex items-center gap-4 p-4 cursor-pointer group"
                        onClick={() => toggleExpand(conv.id)}
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                          {conv.title.charAt(0).toUpperCase()}
                        </div>

                        {/* Title & meta */}
                        <div className="flex-1 min-w-0">
                          {renamingId === conv.id ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={handleRenameKeyDown}
                                onBlur={submitRename}
                                autoFocus
                                className="flex-1 bg-[#1a1a1a] border border-blue-500/50 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                              />
                              <button onClick={submitRename} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400">
                                <FiCheck className="w-4 h-4" />
                              </button>
                              <button onClick={() => { setRenamingId(null); setRenameValue(''); }} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500">
                                <FiX className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h3 className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                                {conv.title}
                              </h3>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {conv.lastMessage || 'Sin mensajes'}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Date */}
                        <div className="flex-shrink-0 text-right hidden sm:block">
                          <p className="text-xs text-gray-500">{formatFullDate(conv.timestamp)}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openInChat(conv.id)}
                            className="p-2 rounded-lg hover:bg-blue-500/20 text-gray-500 hover:text-blue-400 transition-colors"
                            title="Abrir en chat"
                          >
                            <FiMessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => startRename(conv.id, conv.title, e)}
                            className="p-2 rounded-lg hover:bg-blue-500/20 text-gray-500 hover:text-blue-400 transition-colors"
                            title="Renombrar"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setExportMenuOpen(exportMenuOpen === conv.id ? null : conv.id)}
                              className="p-2 rounded-lg hover:bg-green-500/20 text-gray-500 hover:text-green-400 transition-colors"
                              title="Exportar"
                            >
                              <FiDownload className="w-4 h-4" />
                            </button>
                            {exportMenuOpen === conv.id && (
                              <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                                <button
                                  onClick={() => handleExportConversation(conv.id, 'txt')}
                                  className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                  Exportar como TXT
                                </button>
                                <button
                                  onClick={() => handleExportConversation(conv.id, 'csv')}
                                  className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                  Exportar como CSV
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => confirmDelete(conv.id, e)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Expand indicator */}
                        <div className="flex-shrink-0 text-gray-600">
                          {expandedId === conv.id ? (
                            <FiChevronUp className="w-4 h-4" />
                          ) : (
                            <FiChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>

                      {/* Expanded messages preview */}
                      <AnimatePresence>
                        {expandedId === conv.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-white/5 bg-[#0d0d0d] px-4 py-3 max-h-80 overflow-y-auto">
                              {loadingMessages ? (
                                <div className="flex items-center justify-center py-6">
                                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                              ) : expandedMessages.length === 0 ? (
                                <p className="text-xs text-gray-600 text-center py-4">Sin mensajes en esta conversación</p>
                              ) : (
                                <div className="space-y-3">
                                  {expandedMessages.map((msg) => (
                                    <div
                                      key={msg.id}
                                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                      <div
                                        className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                                          msg.role === 'user'
                                            ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100'
                                            : 'bg-white/5 border border-white/5 text-gray-300'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                            msg.role === 'user' ? 'text-blue-400' : 'text-gray-500'
                                          }`}>
                                            {msg.role === 'user' ? 'Tú' : 'Asistente'}
                                          </span>
                                          <span className="text-[10px] text-gray-600">{formatTime(msg.createdAt)}</span>
                                        </div>
                                        <p className="whitespace-pre-wrap break-words">
                                          {msg.content.length > 500
                                            ? msg.content.substring(0, 500) + '...'
                                            : msg.content}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Open in chat button */}
                              {expandedMessages.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/5 flex justify-center">
                                  <button
                                    onClick={() => openInChat(conv.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-lg text-xs text-blue-400 font-medium transition-colors"
                                  >
                                    <FiMessageSquare className="w-3.5 h-3.5" />
                                    Continuar conversación
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onCancel={() => { setDeleteModalOpen(false); setConversationToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar conversación"
        message="¿Estás seguro de que deseas eliminar esta conversación? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
