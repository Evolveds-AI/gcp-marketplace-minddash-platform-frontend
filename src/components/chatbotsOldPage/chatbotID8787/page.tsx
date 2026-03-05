'use client';

import ChatBotBase from '@/components/chatbots/ChatbotBase';
import { useAuthAndClientCheck } from '@/hooks/useAuthAndClientCheck';

export default function MecanicChatbotPage() {
  const {isLoading, isAuthenticated} = useAuthAndClientCheck('chatbotID8787')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    );
  }

  const suggestedPrompts = [
    "¿Que modelos de vehiculos tiene?",
    "¿En que estados se encuentran los vehiculos del taller?",
    "¿Como puedo contactar?"
  ];

  const exampleQuestions = [
    "¿Que modelos de vehiculos tiene?",
    "¿En que estados se encuentran los vehiculos del taller?",
    "¿Como puedo contactar?",
    "¿Cual es el horario de atencion?"
  ]

  return isAuthenticated ? (
    <ChatBotBase
      clientId="chatbotID8787"
      clientWelcomeMessage="Soy Max, tu Chatbot especializado en el taller mecánico."
      suggestedPrompts={suggestedPrompts}
      clientAbout="Tu asistente virtual especializado en el taller mecánico."
      exampleQuestions={exampleQuestions}
    />
  ) : null;
}
