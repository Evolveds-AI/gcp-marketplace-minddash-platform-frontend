'use client';

import { useState, useEffect } from 'react';
import { ChatHeaderProps } from '@/lib/types';
import { motion } from 'framer-motion';
import { FiMenu, FiLogOut } from '@/lib/icons';
import { useRouter } from 'next/navigation';

const ChatHeader: React.FC<ChatHeaderProps> = ({ username, onToggleSidebar }) => {
  const [greeting, setGreeting] = useState('Buenos días');
  const router = useRouter();
  
  // Función para cerrar sesión
  const handleLogout = () => {
    // Redirigir a la página de login con parámetro de logout
    router.push('/login?logout=true');
  };

  useEffect(() => {
    // Set greeting based on time of day
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) {
      setGreeting('Buenos días');
    } else if (currentHour >= 12 && currentHour < 20) {
      setGreeting('Buenas tardes');
    } else {
      setGreeting('Buenas noches');
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0c0c0c]/80 border-b border-white/5 py-3 px-4 transition-all duration-300">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <motion.button
            className="text-gray-400 hover:text-white mr-3 p-2 rounded-xl hover:bg-white/10 transition-colors xl:hidden flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <FiMenu size={20} />
          </motion.button>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-full tracking-tight">
              <span className="hidden sm:inline bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{greeting}, </span> 
              <span className="sm:inline">{username}</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-medium hidden sm:block">
              Asistente Virtual Inteligente
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Evolve AI</span>
          </div>
          <motion.button
            className="text-gray-400 hover:text-red-400 p-2.5 rounded-xl hover:bg-red-500/10 transition-colors flex-shrink-0 border border-transparent hover:border-red-500/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <FiLogOut size={18} />
          </motion.button>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
