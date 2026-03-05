'use client';

import { motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { useThemeMode } from '@/hooks/useThemeMode';
import { CreateChatbotWizardDialog } from '@/components/admin/ChatbotWizard/CreateChatbotWizardDialog';

export default function NewV2ChatbotPage() {
  const router = useRouter();
  const basePath = '/dashboard/admin';
  const { applyThemeClass } = useThemeMode();

  return (
    <>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`px-8 py-6 shadow-sm border-b ${applyThemeClass(
          'bg-minddash-surface border-minddash-border',
          'bg-white border-gray-200 text-gray-900'
        )}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push(`${basePath}/chatbots`)}
              className={`flex items-center space-x-2 mb-2 ${applyThemeClass('text-gray-400 hover:text-white', 'text-gray-600 hover:text-gray-900')} transition-colors`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver a Chatbots</span>
            </button>
            <h1 className={`text-3xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>Nuevo Chatbot</h1>
            <p className={`mt-2 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
              Creá un chatbot con el wizard v2.
            </p>
          </div>

          <CreateChatbotWizardDialog />
        </div>
      </motion.div>

      <div className={`flex-1 px-8 py-6 overflow-y-auto ${applyThemeClass('', 'bg-white')}`}>
        <div className={applyThemeClass('text-gray-300', 'text-gray-700')}>
          <div className="max-w-3xl">
            <p className="text-sm">
              Usá el botón <span className={applyThemeClass('text-white font-semibold', 'text-gray-900 font-semibold')}>Crear chatbot</span> para
              abrir el wizard.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
