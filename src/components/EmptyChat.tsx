import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface EmptyChatProps {
  onNewChat: () => void;
}

const EmptyChat: React.FC<EmptyChatProps> = ({ onNewChat }) => {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center h-full w-full text-center px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8 relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 opacity-40">
        <Image
          src="https://res.cloudinary.com/dwgu8k7ba/image/upload/v1747668946/emptychat_hxpaqh.svg"
          alt="Chat vacío"
          width={300}
          height={300}
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-200 mb-3">No hay mensajes</h2>
      <p className="text-gray-400 mb-8 max-w-md">
        Tu historial de chat está vacío. Crea una nueva conversación para comenzar a chatear.
      </p>
    </motion.div>
  );
};

export default EmptyChat;
