'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle } from '@/lib/icons';
import ModalPortal from '@/components/ui/ModalPortal';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'danger'
}) => {
  // Determinar colores basados en el tipo
  const getButtonColor = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'danger':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-blue-500';
    }
  };

  // Cerrar el modal al presionar Escape
  React.useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onCancel]);

  return (
    <ModalPortal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCancel}
            >
              {/* Modal */}
              <motion.div
                className="glass-panel rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-white/10"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/5 flex items-center bg-white/5">
                <div className={`mr-4 p-2 rounded-full bg-white/5 ${getIconColor()}`}>
                  <FiAlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                <p className="text-gray-300 leading-relaxed text-sm">{message}</p>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-black/20 flex justify-end space-x-3 border-t border-white/5">
                <motion.button
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg transition-colors hover:bg-white/5"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                >
                  {cancelText}
                </motion.button>
                <motion.button
                  className={`px-5 py-2 text-sm font-medium text-white rounded-lg shadow-lg ${getButtonColor()} transition-all`}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 15px rgba(0,0,0,0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  autoFocus
                >
                  {confirmText}
                </motion.button>
              </div>
            </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};

export default ConfirmationModal;
