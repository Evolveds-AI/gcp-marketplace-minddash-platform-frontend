'use client';

import ChatBotBase from '@/components/chatbots/ChatbotBase';
import { useAuthAndClientCheck } from '@/hooks/useAuthAndClientCheck';

export default function CintacChatbotPage() {
  const {isLoading, isAuthenticated} = useAuthAndClientCheck('chatbotID3456')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    );
  }

  const suggestedPrompts = [
    "¿Qué es Metalcon y por qué debería usarlo en mi construcción?",
    "¿Los perfiles de Metalcon® son resistentes a la humedad?",
    "¿Para qué se utilizan los Aceros de Tabique?"
  ];

  const exampleQuestions = [
    "¿Qué es Metalcon y por qué debería usarlo en mi construcción?",
    "¿Los perfiles de Metalcon® son resistentes a la humedad?",
    "¿Para qué se utilizan los Aceros de Tabique?",
    "¿Sirve Metalcon para construir un segundo piso en mi casa?"
  ]

  return isAuthenticated ? (
    <ChatBotBase
      clientId="chatbotID3456"
      clientWelcomeMessage="Soy Cintac, tu Chatbot especializado en el sistema constructivo Metalcon® de Cintac."
      suggestedPrompts={suggestedPrompts}
      clientAbout="Tu asistente virtual especializado en el sistema constructivo Metalcon® de Cintac."
      exampleQuestions={exampleQuestions}
    />
  ) : null;
}
