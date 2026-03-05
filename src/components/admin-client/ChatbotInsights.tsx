'use client';

import { motion } from 'framer-motion';
import { FiTarget } from '@/lib/icons';
import { useThemeMode } from '@/hooks/useThemeMode';

interface ChatbotInsightsProps {
  chatbotId: string;
  chatbotName: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function ChatbotInsights({ chatbotName }: ChatbotInsightsProps) {
  const { applyThemeClass } = useThemeMode();

  return (
    <div className="h-[420px] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className={applyThemeClass('mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center', 'mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center')}>
          <FiTarget className={applyThemeClass('w-7 h-7 text-primary', 'w-7 h-7 text-primary')} />
        </div>
        <div className="space-y-1">
          <h3 className={applyThemeClass('text-2xl font-semibold text-white', 'text-2xl font-semibold text-gray-900')}>Insights</h3>
          <p className={applyThemeClass('text-gray-400 text-sm', 'text-gray-600 text-sm')}>
            Próximamente...
          </p>
        </div>
        <p className={applyThemeClass('text-xs text-gray-500 max-w-sm', 'text-xs text-gray-500 max-w-sm')}>
          Muy pronto podrás consultar recomendaciones inteligentes y hallazgos sobre `{chatbotName}`.
        </p>
      </motion.div>
    </div>
  );
}
