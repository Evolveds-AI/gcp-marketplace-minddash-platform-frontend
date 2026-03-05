'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSearch, FiCalendar, FiFilter, FiChevronDown, FiChevronUp } from '@/lib/icons';
import { Conversation } from '@/lib/types';
import ModalPortal from '@/components/ui/ModalPortal';

interface AdvancedSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (results: Conversation[]) => void;
  conversations: Conversation[];
}

interface SearchFilters {
  dateFrom: string;
  dateTo: string;
  keywords: string;
  hasAttachments?: boolean;
  hasLinks?: boolean;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ 
  isOpen, 
  onClose, 
  onSearch,
  conversations 
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    dateFrom: '',
    dateTo: '',
    keywords: '',
    hasAttachments: false,
    hasLinks: false
  });
  
  const [showFilters, setShowFilters] = useState(false);
  
  // Búsqueda simple
  const handleSimpleSearch = () => {
    const searchText = filters.keywords.toLowerCase().trim();
    
    if (!searchText) {
      onSearch(conversations);
      return;
    }
    
    const results = conversations.filter(conv => 
      conv.title.toLowerCase().includes(searchText) || 
      conv.lastMessage.toLowerCase().includes(searchText) ||
      // También buscar en los mensajes (solo texto plano)
      conv.messages.some(msg => 
        msg.content.toLowerCase().includes(searchText)
      )
    );
    
    onSearch(results);
  };
  
  // Búsqueda avanzada con todos los filtros
  const handleAdvancedSearch = () => {
    let results = [...conversations];
    
    // Filtrar por palabras clave
    if (filters.keywords.trim()) {
      const keywords = filters.keywords.toLowerCase().trim();
      results = results.filter(conv => 
        conv.title.toLowerCase().includes(keywords) || 
        conv.lastMessage.toLowerCase().includes(keywords) ||
        conv.messages.some(msg => msg.content.toLowerCase().includes(keywords))
      );
    }
    
    // Filtrar por fecha desde
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      results = results.filter(conv => new Date(conv.timestamp) >= fromDate);
    }
    
    // Filtrar por fecha hasta
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      // Ajustar al final del día
      toDate.setHours(23, 59, 59, 999);
      results = results.filter(conv => new Date(conv.timestamp) <= toDate);
    }
    
    // Filtrar por presencia de enlaces
    if (filters.hasLinks) {
      results = results.filter(conv => 
        conv.messages.some(msg => 
          msg.content.includes('http://') || msg.content.includes('https://')
        )
      );
    }
    
    onSearch(results);
    onClose();
  };
  
  // Reset de los filtros
  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      keywords: '',
      hasAttachments: false,
      hasLinks: false
    });
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
                  <FiSearch className="text-blue-400" size={20} />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">Búsqueda avanzada</h2>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            
            {/* Contenido */}
            <div className="p-6">
              {/* Búsqueda básica */}
              <div className="mb-6">
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                    placeholder="Buscar en conversaciones..."
                    value={filters.keywords}
                    onChange={(e) => setFilters({...filters, keywords: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (showFilters) {
                          handleAdvancedSearch();
                        } else {
                          handleSimpleSearch();
                        }
                      }
                    }}
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-500">
                    <FiSearch className="w-5 h-5" />
                  </div>
                </div>
              </div>
              
              {/* Botón para mostrar/ocultar filtros avanzados */}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-between w-full text-blue-400 hover:text-blue-300 text-sm mb-4 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center font-medium">
                  <FiFilter className="mr-2" />
                  <span>Filtros avanzados</span>
                </div>
                {showFilters ? <FiChevronUp /> : <FiChevronDown />}
              </button>
              
              {/* Filtros avanzados */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-5 overflow-hidden"
                  >
                    {/* Rango de fechas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Desde</label>
                        <div className="relative">
                          <input 
                            type="date" 
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all [color-scheme:dark]"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                          />
                          <div className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-500">
                            <FiCalendar className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Hasta</label>
                        <div className="relative">
                          <input 
                            type="date" 
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all [color-scheme:dark]"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                          />
                          <div className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-500">
                            <FiCalendar className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Filtros adicionales */}
                    <div className="flex flex-col space-y-2 pt-2 border-t border-white/5">
                      <label className="flex items-center p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            id="hasLinks"
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/20 bg-white/5 checked:border-blue-500 checked:bg-blue-600 transition-all"
                            checked={filters.hasLinks}
                            onChange={(e) => setFilters({...filters, hasLinks: e.target.checked})}
                          />
                          <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                        <span className="ml-3 text-sm text-gray-300">Contiene enlaces</span>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Footer */}
            <div className="flex justify-between items-center p-5 border-t border-white/10 bg-[#0a0a0a]/50">
              <button 
                onClick={resetFilters}
                className="text-gray-400 hover:text-white text-xs font-medium hover:underline transition-all"
              >
                Limpiar filtros
              </button>
              
              <div className="flex space-x-3">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={showFilters ? handleAdvancedSearch : handleSimpleSearch}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-900/20 transition-all transform hover:scale-105"
                >
                  Buscar
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

export default AdvancedSearch;
