'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, HelpCircle, RotateCcw } from 'lucide-react';

interface RestartTourDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RestartTourDialog({ isOpen, onClose, onConfirm }: RestartTourDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-[10000] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-minddash-card border border-minddash-border rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Tour de bienvenida
                    </h3>
                    <p className="text-sm text-gray-400">
                      Guía interactiva de la plataforma
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                  ¿Deseas ver el tour de bienvenida nuevamente?
                </p>
                <p className="text-gray-400 text-xs leading-relaxed">
                  El tour te guiará paso a paso por las funciones principales de la plataforma,
                  mostrándote cómo navegar entre organizaciones, proyectos y chatbots.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                  className="border-gray-700 hover:bg-gray-800"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  size="sm"
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <RotateCcw className="w-4 h-4" />
                  Iniciar tour
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
