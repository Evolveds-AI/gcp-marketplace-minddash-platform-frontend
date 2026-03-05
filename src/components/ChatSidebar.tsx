'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiMessageCircleOff, FiMessageSquare, FiSettings, FiHelpCircle, FiX, FiPlus, FiTrash2, FiDownload, FiUpload, FiClock, FiBarChart, FiGrid, FiTrendingUp, TbMessageDots, TbBell, TbMessagePlus, TbFilterSearch, FiEdit2, FiCheck } from '@/lib/icons';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChatSidebarProps, Conversation } from '@/lib/types';
import ConfirmationModal from './ConfirmationModal';
import PreferencesModal from './PreferencesModal';
import UserAlertsModal from './UserAlertsModal';
import UserDashboardsModal from './UserDashboardsModal';
import AdvancedSearch from './AdvancedSearch';
import { UserNav } from './UserNav';
import { exportConversationsAsCsv } from '@/lib/utils/exportConversations';

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  visible, 
  onToggle,
  onSelectConversation,
  activeConversationId,
  conversations,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onClearAllConversations,
  onShowTutorial,
  className = '',
  clientName = 'Evolve',
  chatbotName = 'evolve',
  productId,
  userId,
  userName = 'Usuario',
  userEmail = 'usuario@minddash.ai',
  userAvatar,
  onLogout,
  onProfileClick,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>(conversations);
  const [activeTab, setActiveTab] = useState('chats');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showUserAlerts, setShowUserAlerts] = useState(false);
  const [showUserDashboards, setShowUserDashboards] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // Filtrar conversaciones basadas en la búsqueda
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv => 
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);
  
  // Actualizar conversaciones filtradas cuando cambian las conversaciones
  useEffect(() => {
    setFilteredConversations(conversations);
  }, [conversations]);

  // Formatear fecha
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return format(date, 'h:mm a', { locale: es });
    } else if (days === 1) {
      return 'Ayer';
    } else if (days < 7) {
      return format(date, 'EEEE', { locale: es });
    } else {
      return format(date, 'd MMM', { locale: es });
    }
  };

  // Estados para los modales de confirmación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Función para cerrar automáticamente el sidebar en móvil
  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1280) { // xl breakpoint
      setTimeout(() => {
        onToggle();
      }, 100); 
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    onSelectConversation(conversationId);
    closeSidebarOnMobile();
  };

  const handleNewConversation = () => {
    onNewConversation();
    closeSidebarOnMobile();
  };

  const startRename = (conversationId: string, currentTitle: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setRenamingId(conversationId);
    setRenameValue(currentTitle);
  };

  const submitRename = () => {
    if (renamingId && renameValue.trim() && onRenameConversation) {
      onRenameConversation(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename();
    } else if (e.key === 'Escape') {
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const confirmDelete = (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setConversationToDelete(conversationId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (onDeleteConversation && conversationToDelete) {
      onDeleteConversation(conversationToDelete);
      setConversationToDelete(null);
    }
    setIsDeleteModalOpen(false);
  };

  const openClearAllModal = () => {
    setIsClearAllModalOpen(true);
  };

  const handleClearAllConfirm = () => {
    if (onClearAllConversations) {
      onClearAllConversations();
    }
    setIsClearAllModalOpen(false);
  };
  
  return (
    <>
      {/* Overlay para cerrar el sidebar en dispositivos pequeños */}
      <AnimatePresence>
        {visible && (
          <motion.div 
            className="fixed inset-0 z-30 h-full w-full bg-black/60 xl:hidden backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar principal - Modernized */}
      <motion.div 
        className={`fixed top-0 bottom-0 left-0 z-40 h-full flex-none flex flex-col overflow-hidden bg-[#0c0c0c] border-r border-white/5 shadow-2xl xl:shadow-none xl:relative xl:z-0 xl:translate-x-0 touch-none ${
          visible ? 'translate-x-0' : '-translate-x-full'
        } w-[85%] max-w-[280px] ${className}`}
        initial={{ x: '-100%' }}
        animate={{ x: visible ? 0 : '-100%' }}
        transition={{ duration: 0.3, ease: 'circOut' }}
      >
        {/* Header con gradiente sutil */}
        <div className="relative p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-75 group-hover:opacity-100 transition duration-200 blur-[2px]"></div>
              <div className="relative h-10 w-10 rounded-full overflow-hidden bg-black flex items-center justify-center ring-2 ring-black">
                <video 
                  className="h-full w-full object-cover opacity-90"
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  suppressHydrationWarning
                >
                  <source src="https://res.cloudinary.com/dwgu8k7ba/video/upload/v1747668947/loader2_fk8hh2.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-white tracking-tight truncate leading-none mb-1">{clientName}</h2>
              <p className="text-[10px] uppercase tracking-wider text-blue-400 font-medium">Asistente Virtual</p>
            </div>
            
            {/* Botón para cerrar en móvil */}
            <button 
              onClick={onToggle}
              className="xl:hidden text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Buscador y Tabs */}
        <div className="px-4 space-y-4 mb-2">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-500 group-focus-within:text-blue-400 transition-colors w-4 h-4" />
            </div>
            <input 
              type="text" 
              className="w-full bg-[#161616] border border-white/5 rounded-xl py-2 pl-9 pr-8 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              onClick={() => setShowAdvancedSearch(true)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-blue-400 transition-colors"
              title="Búsqueda avanzada"
            >
              <TbFilterSearch className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex p-1 bg-[#161616] rounded-lg border border-white/5">
            {[
              { id: 'chats', icon: TbMessageDots, label: 'Chats' },
              { id: 'tools', icon: FiSettings, label: 'Herram.' },
              { id: 'help', icon: FiHelpCircle, label: 'Ayuda' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-[#252525] text-white shadow-sm ring-1 ring-white/5' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5 mr-1.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Lista de conversaciones */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-2">
          {activeTab === 'chats' && (
            <div className="space-y-1">
              <div className="px-2 pb-2">
                 <button
                  onClick={handleNewConversation}
                  className="w-full group relative flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-900/20 transition-all duration-200 border border-blue-500/50 hover:border-blue-400"
                >
                  <TbMessagePlus className="w-4 h-4" />
                  <span className="text-sm font-medium">Nueva conversación</span>
                </button>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-3 mx-2"></div>

              {filteredConversations.length > 0 ? (
                <div className="space-y-0.5">
                  {filteredConversations.map((conversation) => (
                    <div 
                      key={conversation.id}
                      className={`group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                        activeConversationId === conversation.id 
                          ? 'bg-white/10 text-white border border-white/5 shadow-sm' 
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                      }`}
                      onClick={() => handleSelectConversation(conversation.id)}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                        activeConversationId === conversation.id 
                          ? 'bg-blue-600 text-white shadow-inner' 
                          : 'bg-[#1a1a1a] text-gray-500 group-hover:bg-[#252525] group-hover:text-gray-300'
                      }`}>
                        {conversation.title.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {renamingId === conversation.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={handleRenameKeyDown}
                              onBlur={submitRename}
                              autoFocus
                              className="flex-1 bg-[#1a1a1a] border border-blue-500/50 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 min-w-0"
                            />
                            <button
                              onClick={submitRename}
                              className="p-1 rounded-md hover:bg-blue-500/20 text-blue-400 transition-colors flex-shrink-0"
                              title="Confirmar"
                            >
                              <FiCheck className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center mb-0.5">
                              <h3 className={`text-xs font-medium truncate pr-2 ${
                                activeConversationId === conversation.id ? 'text-white' : 'text-gray-300 group-hover:text-white'
                              }`}>
                                {conversation.title}
                              </h3>
                              <span className="text-[10px] text-gray-600 flex-shrink-0 group-hover:text-gray-500">
                                {formatDate(conversation.timestamp)}
                              </span>
                            </div>
                            <p className="text-[10px] truncate opacity-60">
                              {conversation.lastMessage}
                            </p>
                          </>
                        )}
                      </div>
                      
                      {renamingId !== conversation.id && (
                        <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                          {onRenameConversation && (
                            <button 
                              onClick={(e) => startRename(conversation.id, conversation.title, e)}
                              className="p-1.5 rounded-md hover:bg-blue-500/20 text-gray-500 hover:text-blue-400 transition-all transform scale-90 hover:scale-100"
                              title="Renombrar"
                            >
                              <FiEdit2 className="w-3 h-3" />
                            </button>
                          )}
                          {onDeleteConversation && (
                            <button 
                              onClick={(e) => confirmDelete(conversation.id, e)}
                              className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all transform scale-90 hover:scale-100"
                              title="Eliminar"
                            >
                              <FiTrash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <FiMessageCircleOff className="w-5 h-5 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">No hay conversaciones</p>
                  <p className="text-xs text-gray-600 mt-1">Comienza una nueva para chatear</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'tools' && (
            <div className="space-y-4 px-1 py-2">
              <div className="space-y-1">
                <p className="px-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Gestión</p>
                <button
                  onClick={() => {
                    if (conversations.length === 0) {
                      toast.error('No hay conversaciones para exportar');
                      return;
                    }
                    const exportData = conversations.map(conv => ({
                      id: conv.id,
                      title: conv.title,
                      timestamp: conv.timestamp,
                      messages: (conv.messages || []).map(m => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
                    }));
                    exportConversationsAsCsv(exportData);
                    toast.success('Historial exportado correctamente');
                  }}
                  disabled={conversations.length === 0}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm transition-colors ${
                    conversations.length === 0
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <FiDownload className="w-4 h-4 text-gray-500" />
                  Exportar historial
                </button>
                <button className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                  <FiUpload className="w-4 h-4 text-gray-500" />
                  Importar chat
                </button>
                <button 
                  onClick={openClearAllModal}
                  disabled={!onClearAllConversations || conversations.length === 0}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm transition-colors ${
                    conversations.length === 0 
                      ? 'text-gray-600 cursor-not-allowed' 
                      : 'text-gray-300 hover:bg-white/5 hover:text-red-400 group'
                  }`}
                >
                  <FiTrash2 className={`w-4 h-4 ${conversations.length === 0 ? 'text-gray-600' : 'text-gray-500 group-hover:text-red-400'}`} />
                  Limpiar historial
                </button>
              </div>
              
              <div className="h-px bg-white/5 mx-2"></div>
              
              <div className="space-y-1">
                <p className="px-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Espacio de trabajo</p>
                <button 
                  onClick={() => setShowPreferences(true)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FiSettings className="w-4 h-4 text-gray-500" />
                  Preferencias
                </button>
                <button
                  onClick={() => {
                    if (!productId) {
                      toast.error('Producto no identificado');
                      return;
                    }
                    setShowUserDashboards(true);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FiBarChart className="w-4 h-4 text-gray-500" />
                  Mis Gráficos
                </button>
                <button
                  onClick={() => {
                    if (!productId) {
                      toast.error('Producto no identificado');
                      return;
                    }
                    router.push(`/chatbot/${productId}/dashboard`);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FiGrid className="w-4 h-4 text-gray-500" />
                  MindDash Canvas
                </button>
                <button
                  onClick={() => {
                    if (!productId) {
                      toast.error('Producto no identificado');
                      return;
                    }
                    router.push(`/chatbot/${productId}/insight`);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FiTrendingUp className="w-4 h-4 text-gray-500" />
                  Insight
                </button>
                <button 
                  onClick={() => {
                    if (!productId) {
                      toast.error('Producto no identificado');
                      return;
                    }
                    setShowUserAlerts(true);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <TbBell className="w-4 h-4 text-gray-500" />
                  Mis Alertas
                </button>
                <button
                  onClick={() => {
                    if (!productId) {
                      toast.error('Producto no identificado');
                      return;
                    }
                    router.push(`/chatbot/${productId}/history`);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FiClock className="w-4 h-4 text-gray-500" />
                  Historial de Conversaciones
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'help' && (
            <div className="space-y-4 px-1 py-2">
              <div className="space-y-1">
                <p className="px-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Recursos</p>
                <button 
                  onClick={onShowTutorial}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4 text-gray-500" />
                  Tutorial Interactivo
                </button>
                <button className="w-full flex items-center gap-3 p-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                  <FiMessageSquare className="w-4 h-4 text-gray-500" />
                  Guía de Comandos
                </button>
              </div>
              
              <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 mt-4">
                <h4 className="text-blue-400 text-xs font-bold mb-2">¿Necesitas ayuda?</h4>
                <p className="text-gray-400 text-xs leading-relaxed mb-3">
                  Contacta a soporte si tienes problemas técnicos o dudas sobre el uso del asistente.
                </p>
                <button className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-medium rounded-lg transition-colors border border-blue-500/30">
                  Contactar Soporte
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Nav */}
        <div className="p-4 border-t border-white/5 bg-[#0a0a0a]">
          <UserNav
            userName={userName}
            userEmail={userEmail}
            userAvatar={userAvatar}
            onLogout={onLogout}
            onProfileClick={onProfileClick}
            onSettingsClick={() => setShowPreferences(true)}
            onHelpClick={onShowTutorial}
          />
        </div>
      </motion.div>

      {/* Modales */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Eliminar conversación"
        message="¿Estás seguro que deseas eliminar esta conversación? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalOpen(false)}
        type="danger"
      />
      
      <ConfirmationModal
        isOpen={isClearAllModalOpen}
        title="Limpiar historial"
        message="¿Estás seguro que deseas eliminar todas las conversaciones? Perderás todo el historial."
        confirmText="Eliminar todo"
        cancelText="Cancelar"
        onConfirm={handleClearAllConfirm}
        onCancel={() => setIsClearAllModalOpen(false)}
        type="danger"
      />
      
      <PreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        chatbotName={chatbotName}
      />
      
      <AdvancedSearch
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSearch={setFilteredConversations}
        conversations={conversations}
      />

      <UserAlertsModal
        isOpen={showUserAlerts}
        onClose={() => setShowUserAlerts(false)}
        productId={productId || ''}
        chatbotName={clientName}
      />

      <UserDashboardsModal
        isOpen={showUserDashboards}
        onClose={() => setShowUserDashboards(false)}
        userId={userId}
        productId={productId}
      />
    </>
  );
};

export default ChatSidebar;
