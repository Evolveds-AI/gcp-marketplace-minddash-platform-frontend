'use client';

import ChatBotBase from '@/components/chatbots/ChatbotBase';
import { useAuthAndClientCheck } from '@/hooks/useAuthAndClientCheck';

export default function RestobarChatbotPage() {
  const {isLoading, isAuthenticated} = useAuthAndClientCheck('chatbotID9292')
  console.log('chatbotID9292','CHATBOT ID');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    );
  }

  const suggestedPrompts = [
    "¿Cuánto se vendió en total esta semana?",
    "¿Cuáles fueron los productos más vendidos?",
    "¿Qué mozos atendieron más mesas en mayo?"
  ];

  const exampleQuestions = [
    "¿Cuánto se vendió en total esta semana?",
    "¿Cuáles fueron los productos más vendidos?",
    "¿Qué mozos atendieron más mesas en mayo?",
    "¿Cuál es el ticket promedio por orden?"
  ]

  return isAuthenticated ? (
    <ChatBotBase
      clientId="chatbotID9292"
      clientWelcomeMessage="Soy REMO, tu Chatbot especializado en el Restobar."
      suggestedPrompts={suggestedPrompts}
      clientAbout="Tu asistente virtual especializado en el Restobar."
      exampleQuestions={exampleQuestions}
    />
  ) : null;
}
