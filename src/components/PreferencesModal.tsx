'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSettings, FiRefreshCw, FiInfo } from '@/lib/icons';
import ModalPortal from '@/components/ui/ModalPortal';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatbotName: string;
}

// Interfaz para las preferencias del usuario
interface UserPreferences {
  fontSize: 'small' | 'medium' | 'large';
  autoSave: boolean;
  apiResponseTimeout: number; // en segundos
  showTimestamps: boolean;
}

const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose, chatbotName }) => {
  // Estado para las preferencias
  const [preferences, setPreferences] = useState<UserPreferences>({
    fontSize: 'medium',
    autoSave: true,
    apiResponseTimeout: 20,
    showTimestamps: true
  });
  
  // Cargar preferencias almacenadas al abrir el modal
  useEffect(() => {
    if (isOpen) {
      const savedPrefs = localStorage.getItem(`${chatbotName}-user-preferences`);
      if (savedPrefs) {
        try {
          setPreferences(JSON.parse(savedPrefs));
        } catch (e) {
          console.error('Error al cargar preferencias:', e);
        }
      }
    }
  }, [isOpen, chatbotName]);
  
  // Guardar preferencias cuando cambian
  const savePreferences = () => {
    try {
      localStorage.setItem(`${chatbotName}-user-preferences`, JSON.stringify(preferences));
      // Aquí podríamos aplicar los cambios a la aplicación
      // Por ejemplo, actualizar el tema, tamaño de fuente, etc.
      onClose();
    } catch (e) {
      console.error('Error al guardar preferencias:', e);
    }
  };
  
  // Restaurar valores predeterminados
  const restoreDefaults = () => {
    const defaultPrefs: UserPreferences = {
      fontSize: 'medium',
      autoSave: true,
      apiResponseTimeout: 20,
      showTimestamps: true
    };
    
    setPreferences(defaultPrefs);
  };
  
  return (
    <ModalPortal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
          <motion.div 
            className="glass-panel w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FiSettings className="text-blue-400" size={20} />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">Preferencias</h2>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            
            {/* Contenido */}
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

              {/* Tamaño de fuente */}
              <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Tamaño de texto</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${preferences.fontSize === 'small' ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'}`}
                    onClick={() => setPreferences({...preferences, fontSize: 'small'})}
                  >
                    <span className="text-xs mb-1 opacity-50">Aa</span>
                    <span className={`text-sm font-medium ${preferences.fontSize === 'small' ? 'text-blue-400' : 'text-gray-300'}`}>Pequeño</span>
                  </button>
                  
                  <button 
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${preferences.fontSize === 'medium' ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'}`}
                    onClick={() => setPreferences({...preferences, fontSize: 'medium'})}
                  >
                    <span className="text-sm mb-1 opacity-70">Aa</span>
                    <span className={`text-sm font-medium ${preferences.fontSize === 'medium' ? 'text-blue-400' : 'text-gray-300'}`}>Mediano</span>
                  </button>
                  
                  <button 
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${preferences.fontSize === 'large' ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'}`}
                    onClick={() => setPreferences({...preferences, fontSize: 'large'})}
                  >
                    <span className="text-base mb-1">Aa</span>
                    <span className={`text-sm font-medium ${preferences.fontSize === 'large' ? 'text-blue-400' : 'text-gray-300'}`}>Grande</span>
                  </button>
                </div>
              </div>
              
              {/* Opciones adicionales */}
              <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">General</h3>
                
                <div className="space-y-4">
                  {/* Autoguardado */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <p className="text-gray-200 text-sm font-medium">Autoguardado</p>
                      <p className="text-gray-500 text-xs mt-0.5">Guardar conversaciones automáticamente</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={preferences.autoSave}
                        onChange={() => setPreferences({...preferences, autoSave: !preferences.autoSave})}
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>
                  
                  {/* Mostrar timestamps */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <p className="text-gray-200 text-sm font-medium">Timestamps</p>
                      <p className="text-gray-500 text-xs mt-0.5">Mostrar hora en los mensajes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={preferences.showTimestamps}
                        onChange={() => setPreferences({...preferences, showTimestamps: !preferences.showTimestamps})}
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>
                  
                  {/* Tiempo de espera */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-gray-200 text-sm font-medium">Timeout de respuesta</p>
                      <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded text-blue-400 border border-blue-500/20">{preferences.apiResponseTimeout}s</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="60" 
                      value={preferences.apiResponseTimeout}
                      onChange={(e) => setPreferences({...preferences, apiResponseTimeout: parseInt(e.target.value)})}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-medium">
                      <span>Rápido (10s)</span>
                      <span>Lento (60s)</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Info adicional */}
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex items-start">
                <FiInfo className="text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-blue-200/70 text-xs leading-relaxed">
                  Estas preferencias se guardarán localmente en este dispositivo y se aplicarán de inmediato a tu experiencia de chat.
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between p-5 border-t border-white/10 bg-black/20">
              <button 
                onClick={restoreDefaults}
                className="flex items-center text-xs font-medium px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <FiRefreshCw className="mr-2" size={12} />
                <span>Restaurar</span>
              </button>
              
              <div className="flex space-x-3">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={savePreferences}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-900/20 transition-all transform hover:scale-105"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};

export default PreferencesModal;
