'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageListProps, Message as MessageType } from '@/lib/types';
import { FiEdit2, FiTrash2, FiCopy, FiCheck, FiMessageSquare, FiSend, IconMappings, TbRobot } from '@/lib/icons';
import { MessageKnowledgeIndicator } from './KnowledgeIndicator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { UnifiedTimeout } from './loaders';
import FallbackChart from './charts/FallbackChart';
import ShadcnChartTabs from './charts/ShadcnChartTabs';
import { motion, AnimatePresence } from 'framer-motion';
import ChartRenderer from './ChartRenderer';
import { BrainIcon } from 'lucide-react';
import { Shimmer } from './ai/shimmer';



const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isTyping, 
  messagesEndRef,
  onEditMessage,
  onDeleteMessage,
  onCopyMessage
}) => {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copiedMessages, setCopiedMessages] = useState<{[key: string]: boolean}>({});
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Copiar el mensaje al portapapeles
  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMessages({ ...copiedMessages, [id]: true });
      
      // Restablecer el estado después de 2 segundos
      setTimeout(() => {
        setCopiedMessages((prev) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }, 2000);
    });
  };
  
  // Función para empezar a editar un mensaje
  const handleStartEditing = (message: MessageType) => {
    if (editingMessageId !== null) return;
    
    setEditingMessageId(message.id);
    setEditContent(message.content);
    
    // Focus en el textarea con un pequeño delay para asegurar que el DOM está listo
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus();
      }
    }, 50);
  };
  
  // Función para guardar el mensaje editado directamente sin abrir el editor antiguo
  const handleSaveEdit = (id: string) => {
    if (!editContent.trim()) {
      return;
    }
    
    // Verificar si el contenido realmente cambió
    const originalMessage = messages.find(msg => msg.id === id);
    if (originalMessage && originalMessage.content.trim() === editContent.trim()) {
      // Si no hay cambios, simplemente cancela la edición
      handleCancelEdit();
      return;
    }
    
    if (onEditMessage && originalMessage) {
      // Crear un nuevo mensaje con los campos requeridos preservando los originales
      const updatedMessage: MessageType = {
        ...originalMessage,
        content: editContent,
        isEdited: true,
        updatedAt: new Date().toISOString()
      };
      
      // Enviar al callback para edición
      onEditMessage(updatedMessage);
      
      // Limpiar estado de edición
      setEditingMessageId(null);
      setEditContent('');
    }
  };
  
  // Función para cancelar la edición
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };
  
  // Manejar teclas en el editor inline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };
  
  // Ajusta la altura del textarea automáticamente
  useEffect(() => {
    if (editTextareaRef.current && editingMessageId) {
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
    }
  }, [editContent, editingMessageId]);
  
  // Formatear la fecha del mensaje
  const formatDate = (date: Date | string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return `Hoy ${format(messageDate, 'HH:mm')}`;
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return `Ayer ${format(messageDate, 'HH:mm')}`;
    } else {
      return format(messageDate, "d 'de' MMMM, HH:mm", { locale: es });
    }
  };
  
  return (
    <div className="flex flex-col space-y-4 mb-4">
      {messages.map((message) => {
        const isUser = message.role === 'user';
        const isFunction = message.type === 'function';
        const isEditing = editingMessageId === message.id;
        const messageDate = message.createdAt ? formatDate(message.createdAt) : '';
        
        return (
          <div 
            key={message.id} 
            className={`flex items-start mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
            id={message.id}
          >
            {/* Message container with styling */}
            <div className={`group relative flex items-start max-w-full ${isUser ? 'flex-row' : 'flex-row'}`}>
              
              {/* BOT AVATAR */}
              {!isUser && (
                <motion.div 
                  className="relative flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full overflow-hidden border border-white/10 shadow-lg mr-3 sm:mr-4 bg-[#111]"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
                  whileHover={{ y: -2, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-blue-600/20 backdrop-blur-sm">
                    <TbRobot className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                  </div>
                </motion.div>
              )}
              
              {/* Message content and editing interface */}
              <motion.div 
                className={`relative max-w-[90%] xs:max-w-[85%] md:max-w-[75%] lg:max-w-[65%]`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Message bubble */}
                {isEditing ? (
                  // Editor inline para el mensaje
                  <div className="relative glass-panel rounded-xl p-1">
                    <textarea
                      ref={editTextareaRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, message.id)}
                      className="w-full min-h-[80px] p-3 text-sm bg-transparent text-white rounded-lg focus:outline-none resize-none placeholder-gray-500"
                      placeholder="Edita tu mensaje..."
                    />
                    <div className="flex justify-end gap-2 p-2 border-t border-white/5">
                      <motion.button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 text-xs rounded-lg hover:bg-white/5 text-gray-300 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Cancelar
                      </motion.button>
                      <motion.button
                        onClick={() => handleSaveEdit(message.id)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Guardar
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  // Mensaje normal
                  <div 
                    className={`p-4 shadow-lg backdrop-blur-sm ${isFunction 
                      ? 'bg-[#1c1c1c]/90 text-gray-300 border border-white/5 rounded-2xl' 
                      : isUser 
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-blue-900/20'
                        : 'bg-[#1c1c1c]/80 text-gray-200 border border-white/5 rounded-2xl rounded-tl-sm'
                    }`}
                  >
                    {/* Contenido del mensaje */}
                    <div className="relative">
                      <div className={`prose prose-invert prose-sm ${isUser ? 'text-white/95' : 'text-gray-200'} max-w-none whitespace-pre-wrap leading-relaxed`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          children={message.content}
                          components={{
                            p: ({ node, children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            code: ({ node, className, children, ...props }: any) => {
                              const match = /language-(\w+)/.exec(className || '');
                              return !className?.includes('language-') ? (
                                <code className={`px-1.5 py-0.5 rounded ${isUser ? 'bg-white/20' : 'bg-black/30'} text-[0.9em] font-mono`} {...props}>
                                  {children}
                                </code>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                            pre: ({ node, children }) => (
                              <div className="relative my-3 rounded-lg overflow-hidden bg-[#0c0c0c] border border-white/10 shadow-inner">
                                <pre className="p-3 overflow-x-auto text-sm scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                                  {children}
                                </pre>
                              </div>
                            ),
                            table: ({ node, children }) => (
                              <div className="overflow-x-auto my-4 rounded-xl border border-white/5 bg-[#0c0c0c]/50">
                                <table className="min-w-full text-sm">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ node, children }) => (
                              <thead className="bg-white/5">
                                {children}
                              </thead>
                            ),
                            tbody: ({ node, children }) => (
                              <tbody className="divide-y divide-white/5">
                                {children}
                              </tbody>
                            ),
                            tr: ({ node, children }) => (
                              <tr className="hover:bg-white/5 transition-colors">
                                {children}
                              </tr>
                            ),
                            th: ({ node, children }) => (
                              <th className="px-4 py-3 text-left font-semibold text-gray-200 whitespace-nowrap">
                                {children}
                              </th>
                            ),
                            td: ({ node, children }) => (
                              <td className="px-4 py-3 text-gray-300">
                                {children}
                              </td>
                            ),
                            a: ({ node, href, children }) => (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`${isUser ? 'text-white underline decoration-white/30 hover:decoration-white' : 'text-blue-400 hover:text-blue-300'} transition-colors`}
                              >
                                {children}
                              </a>
                            ),
                            ul: ({ node, children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>,
                            ol: ({ node, children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">{children}</ol>,
                            li: ({ node, children }) => <li className="pl-1">{children}</li>,
                            blockquote: ({ node, children }) => (
                              <blockquote className={`border-l-4 ${isUser ? 'border-white/30' : 'border-blue-500/50'} pl-4 py-1 my-2 italic ${isUser ? 'text-white/80' : 'text-gray-400'}`}>
                                {children}
                              </blockquote>
                            ),
                          }}
                        />
                      </div>

                      {/* {message.chart && (
                        <div className="mt-3 space-y-3">
                          {Array.isArray(message.chart) ? (
                            message.chart.map((chartData, index) => (
                              <ShadcnChartTabs
                                key={`chart-${index}`}
                                chartData={chartData}
                                height={600}
                                className=""
                              />
                            ))
                          ) : (
                            <ShadcnChartTabs
                              chartData={message.chart}
                              height={600}
                              className=""
                            />
                          )}
                        </div>
                      )} */}

                      {/* Mostrar el gráfico si existe */}
                      {message.chartSpec && message.chartSpec.labels[0] !== 'Sin datos' && (
                        <div className="mt-2">
                          <ChartRenderer spec={message.chartSpec} />
                        </div>
                      )}
                      
                      {/* Indicador de conocimiento para respuestas del asistente */}
                      {!isUser && (
                        <MessageKnowledgeIndicator knowledgeUsed={message.knowledgeUsed} />
                      )}
                      
                      {/* Etiqueta para mensajes editados o respuestas actualizadas */}
                      {(message.isEdited || message.isUpdatedResponse) && (
                        <div className="mt-1 text-xs">
                          {message.isUpdatedResponse && (
                            <span className="inline-block text-[10px] bg-blue-600/30 text-blue-300 rounded-sm px-1">2/2</span>
                          )}
                          {message.isEdited && !message.isUpdatedResponse && (
                            <span className="text-gray-400 italic">(editado)</span>
                          )}
                        </div>
                      )}
                      
                      {/* Mostrar errores si existen */}
                      {message.error && (
                        <motion.details
                          className="mt-3 text-xs border-t border-red-400 pt-2"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3 }}
                        >
                          <summary className="cursor-pointer font-medium flex items-center gap-1">
                            <motion.div 
                              animate={{ rotate: [0, 15, 0, -15, 0] }}
                              transition={{ repeat: 2, duration: 1.5 }}
                            >
                              <IconMappings.Lightbulb className="w-4 h-4" />
                            </motion.div>
                            Ver detalles del error
                          </summary>
                          <motion.pre 
                            className="mt-2 whitespace-pre-wrap bg-red-700/50 p-3 rounded-lg"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.3 }}
                          >
                            {message.error}
                          </motion.pre>
                        </motion.details>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Message Actions */}
                <motion.div 
                  className="flex items-center mt-1.5 space-x-2 text-xs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-gray-400 font-light">{messageDate}</span>
                  
                  <motion.div 
                    className="flex space-x-1.5"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {/* Copy button */}
                    {!isFunction && message.content && (
                      <motion.button 
                        onClick={() => handleCopyMessage(message.id, message.content)} 
                        className="p-1 hover:text-blue-400 transition-colors rounded-full hover:bg-gray-800/40"
                        title="Copiar mensaje"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {copiedMessages[message.id] ? 
                          <FiCheck className="w-3.5 h-3.5" /> : 
                          <FiCopy className="w-3.5 h-3.5" />
                        }
                      </motion.button>
                    )}
                    
                    {/* Edit and Delete buttons - only for user messages */}
                    {isUser && (
                      <motion.button 
                        onClick={() => handleStartEditing(message)} 
                        className={`p-1 transition-colors rounded-full ${editingMessageId !== null ? 'text-gray-500 cursor-not-allowed' : 'hover:text-blue-400 hover:bg-gray-800/40'}`}
                        title="Editar mensaje"
                        whileHover={editingMessageId === null ? { scale: 1.2 } : undefined}
                        whileTap={editingMessageId === null ? { scale: 0.9 } : undefined}
                        disabled={editingMessageId !== null}
                      >
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </motion.button>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
              
              {/* USER AVATAR - Aparece a la DERECHA del globo de mensaje del usuario */}
              {isUser && (
                <motion.div 
                  className="relative flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full overflow-hidden border border-white/20 shadow-lg ml-3 sm:ml-4 bg-black"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
                  whileHover={{ y: -2, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                    <svg 
                      className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" 
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Thinking indicator - Reasoning style */}
      {isTyping && (
        <motion.div 
          className="py-2 px-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <BrainIcon className="size-4 animate-pulse" />
            <Shimmer>Pensando...</Shimmer>
          </div>
        </motion.div>
      )}
      
      {/* Ref para el desplazamiento automático */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
