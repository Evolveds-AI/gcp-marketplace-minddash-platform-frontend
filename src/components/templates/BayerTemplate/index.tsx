'use client';

import React from 'react';
import { useAccess } from '@/hooks/useAccess';
import ChatBotBase from '@/components/chatbots/ChatbotBase';

interface BayerTemplateProps {
  clientId: string;
  productId: string;
  userId: string;
}

export default function BayerTemplate({ clientId, productId, userId }: BayerTemplateProps) {
  const { hasAccess, isLoading, error } = useAccess(userId, 'product', 'id', productId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-8 text-center max-w-md">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2 text-white">Error de Verificación</h2>
          <p className="text-gray-300 mb-4">No se pudo verificar el acceso al producto.</p>
          <p className="text-sm text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-8 text-center max-w-md">
          <div className="text-red-400 text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold mb-2 text-white">Sin Acceso</h2>
          <p className="text-gray-300 mb-4">
            No tienes permisos para acceder a este producto.
          </p>
          <p className="text-sm text-gray-400">
            Cliente: {clientId} | Producto: {productId}
          </p>
        </div>
      </div>
    );
  }

  // Configuración específica para Bayer
  const bayerConfig = {
    clientId: 'bayer',
    welcomeMessage: 'Hola! Soy tu Asistente Virtual de Bayer. Te ayudo con información sobre productos agrícolas, innovaciones y soluciones para el campo.',
    about: 'Asistente especializado en productos y soluciones agrícolas de Bayer.',
    suggestedPrompts: [
      '¿Qué productos de protección de cultivos tiene Bayer?',
      '¿Cuáles son las últimas innovaciones en semillas?',
      '¿Cómo puedo mejorar el rendimiento de mis cultivos?'
    ],
    exampleQuestions: [
      '¿Qué productos de protección de cultivos tiene Bayer?',
      '¿Cuáles son las últimas innovaciones en semillas?',
      '¿Cómo puedo mejorar el rendimiento de mis cultivos?',
      '¿Qué soluciones digitales ofrece Bayer para la agricultura?',
      '¿Cómo funciona la tecnología de edición genética en las semillas?'
    ]
  };

  return (
    <div className="min-h-screen bg-[#111111]">
      <ChatBotBase
        clientId={bayerConfig.clientId}
        clientWelcomeMessage={bayerConfig.welcomeMessage}
        clientAbout={bayerConfig.about}
        suggestedPrompts={bayerConfig.suggestedPrompts}
        exampleQuestions={bayerConfig.exampleQuestions}
      />
    </div>
  );
}
