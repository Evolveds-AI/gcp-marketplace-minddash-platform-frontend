'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FiFile, FiDatabase, FiInfo } from '@/lib/icons';

interface KnowledgeIndicatorProps {
  knowledgeUsed: boolean;
  className?: string;
}

export default function KnowledgeIndicator({ knowledgeUsed, className = '' }: KnowledgeIndicatorProps) {
  if (!knowledgeUsed) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 ${className}`}
    >
      <FiDatabase className="w-4 h-4" />
      <span className="font-medium">Respuesta basada en archivos de conocimiento</span>
      <div className="group relative">
        <FiInfo className="w-4 h-4 cursor-help" />
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          Esta respuesta se basa únicamente en los archivos adjuntos al producto
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </motion.div>
  );
}

// Componente para mostrar en la lista de mensajes
export function MessageKnowledgeIndicator({ knowledgeUsed }: { knowledgeUsed?: boolean }) {
  if (!knowledgeUsed) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600">
      <FiFile className="w-3 h-3" />
      <span>Basado en archivos de conocimiento</span>
    </div>
  );
}