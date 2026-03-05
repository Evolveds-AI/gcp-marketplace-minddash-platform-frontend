'use client';

import { useState, useRef, useEffect } from 'react';
import { FiSend, FiPaperclip, FiMaximize2, FiMinimize2, FiImage, IconMappings, TbSend } from '@/lib/icons';
import { ChatInputProps } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import PromptIcon from './icons/PromptIcon';
import EmojiPicker, { EmojiClickData, Theme, Categories, EmojiStyle } from 'emoji-picker-react';

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, inputValue, setInputValue, suggestedPrompts }) => {
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const promptsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [message]);
  
  // Cerrar selectores cuando se hace clic fuera de ellos
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Cerrar selector de emojis
      if (showEmoji && emojiPickerRef.current && 
          !emojiPickerRef.current.contains(event.target as Node) &&
          event.target instanceof Element && 
          !event.target.closest('button')?.title?.includes('emoji')) {
        setShowEmoji(false);
      }
      
      // Cerrar selector de prompts
      if (showPrompts && promptsRef.current && 
          !promptsRef.current.contains(event.target as Node) &&
          event.target instanceof Element && 
          !event.target.closest('button')?.title?.includes('prompt')) {
        setShowPrompts(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmoji, showPrompts]);
  
  // Simplificar la sincronización con inputValue del padre
  useEffect(() => {
    if (inputValue && inputValue !== message && !isSubmitting) {
      setMessage(inputValue);
      // Limpiar el valor del padre para evitar loops
      if (setInputValue) {
        setInputValue('');
      }
    }
  }, [inputValue, setInputValue, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Prevenir múltiples envíos
    if (!message.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    const messageToSend = message;
    setMessage(''); // Limpiar el input inmediatamente
    setShowEmoji(false);
    setShowPrompts(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    try {
      await onSendMessage(messageToSend);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Manejar la selección de emojis
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    // Obtener la posición actual del cursor
    const cursorPosition = textareaRef.current?.selectionStart || message.length;
    const textBeforeCursor = message.slice(0, cursorPosition);
    const textAfterCursor = message.slice(cursorPosition);
    
    // Insertar el emoji en la posición del cursor
    const newMessage = textBeforeCursor + emojiData.emoji + textAfterCursor;
    setMessage(newMessage);
    
    // Opcional: mantener el foco en el textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Colocar el cursor después del emoji insertado
        const newCursorPosition = cursorPosition + emojiData.emoji.length;
        textareaRef.current.selectionStart = newCursorPosition;
        textareaRef.current.selectionEnd = newCursorPosition;
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <motion.div 
      className="px-2 pb-4 sm:pb-4 mx-auto w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-3xl mx-auto relative">
        <form onSubmit={handleSubmit}>
          {/* Emoji Picker - Posicionado a nivel de formulario */}
          <AnimatePresence>
            {showEmoji && (
              <motion.div 
                ref={emojiPickerRef}
                className="absolute bottom-[calc(100%+10px)] right-4 z-[9999] shadow-2xl rounded-xl overflow-hidden border border-gray-700"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ type: 'spring', bounce: 0.3, duration: 0.3 }}
                style={{ boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
              >
                <EmojiPicker 
                  theme={Theme.DARK}
                  onEmojiClick={handleEmojiClick}
                  width={300}
                  height={400}
                  lazyLoadEmojis={true}
                  skinTonesDisabled
                  emojiStyle={EmojiStyle.NATIVE}
                  previewConfig={{ showPreview: false }}
                  searchDisabled={false}
                  searchPlaceHolder="Buscar emoji..." 
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Selector de Prompts Sugeridos */}
          <AnimatePresence>
            {showPrompts && (
              <motion.div 
                ref={promptsRef}
                className="absolute bottom-[calc(100%+10px)] right-4 z-[9999] shadow-2xl rounded-xl overflow-hidden border border-gray-700 bg-gray-900 w-80"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ type: 'spring', bounce: 0.3, duration: 0.3 }}
                style={{ boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
              >
                <div className="p-3 border-b border-gray-800">
                  <h3 className="text-sm text-gray-300 font-medium flex items-center">
                    <IconMappings.Lightbulb className="mr-2 text-yellow-500" size={16} />
                    Instrucciones sugeridas
                  </h3>
                </div>
                <div className="py-2">
                  {suggestedPrompts && suggestedPrompts.map((prompt, index) => (
                    <motion.button
                      key={index}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-gray-800/50 text-sm text-gray-300 transition-colors"
                      onClick={() => {
                        setMessage(prompt);
                        setShowPrompts(false);
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                        }
                      }}
                      whileHover={{ x: 4 }}
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Main Chat Input Container - Floating Island Style */}
          <motion.div 
            className="flex-1 relative floating-island rounded-2xl overflow-hidden transition-all duration-300"
            ref={inputContainerRef}
            animate={{ height: expanded ? 'auto' : 'auto' }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Utilities Bar - Glass Style */}
            <AnimatePresence>
              {expanded && (
                <motion.div 
                  className="flex items-center justify-between py-2 px-4 border-b border-white/5 bg-white/5"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-xs text-blue-400 font-medium tracking-wide">
                    EDITOR DE MENSAJE
                  </div>
                  <div className="flex space-x-2">
                    <motion.button
                      type="button"
                      className="glass-button p-1.5 rounded-lg text-gray-400 hover:text-blue-400"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowPrompts(!showPrompts)}
                      title="Instrucciones sugeridas"
                    >
                      <PromptIcon size={16} />
                    </motion.button>
                    <motion.button
                      type="button"
                      className="glass-button p-1.5 rounded-lg text-gray-400 hover:text-blue-400"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Adjuntar archivo"
                    >
                      <FiPaperclip size={16} />
                    </motion.button>
                    <motion.button
                      type="button"
                      className="glass-button p-1.5 rounded-lg text-gray-400 hover:text-blue-400"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowEmoji(!showEmoji)}
                      title="Insertar emoji"
                    >
                      <IconMappings.Emoji size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Main Input Area - Transparent for Glass Effect */}
            <div className="flex items-center relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setExpanded(true)}
                placeholder="Escribe un mensaje..."
                className="w-full py-4 pl-4 pr-[100px] text-white bg-transparent resize-none focus:outline-none min-h-[56px] max-h-[120px] transition-all text-sm sm:text-base placeholder-gray-500/80"
                rows={expanded ? 3 : 1}
              />
              
              {/* Action Buttons Container */}
              <div className="absolute right-2 flex items-center space-x-2">
                {/* Show prompts button when not expanded */}
                {!expanded && (
                  <motion.button
                    type="button"
                    className="text-gray-400 hover:text-blue-400 p-2 rounded-full hover:bg-white/10 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPrompts(!showPrompts)}
                    title="Instrucciones sugeridas"
                  >
                    <PromptIcon size={18} />
                  </motion.button>
                )}
                
                {/* Minimize/Expand Button */}
                <motion.button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="text-gray-400 hover:text-blue-400 p-2 rounded-full hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  title={expanded ? "Minimizar" : "Expandir"}
                >
                  {expanded ? 
                    <FiMinimize2 size={18} /> : 
                    <FiMaximize2 size={18} />}
                </motion.button>

                {/* Send Button - Modern Gradient */}
                <motion.button
                  type="submit"
                  className={`p-2 rounded-xl focus:outline-none flex items-center justify-center shadow-lg transition-all duration-300 ${
                    message.trim() && !isSubmitting
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/30'
                      : 'bg-white/5 text-gray-500 border border-white/5'
                  }`}
                  disabled={!message.trim() || isSubmitting}
                  aria-label="Enviar mensaje"
                  whileHover={{ scale: !isSubmitting ? 1.05 : 1 }}
                  whileTap={{ scale: !isSubmitting ? 0.95 : 1 }}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                  ) : message.trim() ? (
                    <TbSend size={18} className="ml-0.5" />
                  ) : (
                    <FiSend size={18} />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </form>
      </div>
      
      {/* Custom CSS */}
      <style jsx global>{`
        textarea::placeholder {
          color: #94a3b8;
          opacity: 0.7;
        }
      `}</style>
    </motion.div>
  );
};

export default ChatInput;
