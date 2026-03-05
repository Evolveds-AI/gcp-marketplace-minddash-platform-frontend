'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiArrowLeft } from '@/lib/icons';

export const ChatbotComingSoon = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center p-4">
      <motion.div 
        className="max-w-md w-full bg-[#1f1f1f] rounded-xl shadow-lg overflow-hidden border border-gray-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center text-gray-200 mb-4">
            Próximamente
          </h1>
          
          <div className="text-center mb-8">
            <p className="text-gray-400 mb-4">
              Este chatbot está en desarrollo y estará disponible en breve.
            </p>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[#3978d5]"
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              75% completado
            </p>
          </div>
          
          <button
            onClick={() => router.push('/selector')}
            className="w-full flex items-center justify-center py-3 px-4 bg-[#3978d5] hover:bg-[#4a88e5] text-white rounded-md transition"
          >
            <FiArrowLeft className="mr-2" /> Volver al selector
          </button>
        </div>
      </motion.div>
    </div>
  )
}
