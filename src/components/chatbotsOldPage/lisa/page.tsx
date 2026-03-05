'use client';

import ChatBotBase from '@/components/chatbots/ChatbotBase';
import { useAuthAndClientCheck } from '@/hooks/useAuthAndClientCheck';

export default function LisaChatbotPage() {
  const {isLoading, isAuthenticated} = useAuthAndClientCheck('chatbotLisa')

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black">
        <div className="w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] md:w-[600px] md:h-[600px] flex items-center justify-center">
          <video 
            className="w-full h-full object-contain"
            autoPlay 
            loop 
            muted 
            playsInline
          >
            <source src="https://res.cloudinary.com/dwgu8k7ba/video/upload/v1747668947/loader2_fk8hh2.mp4" type="video/mp4" />
            Tu navegador no soporta videos HTML5.
          </video>
        </div>
      </div>
    );
  }

  const suggestedPrompts = [
    "¿Cuáles son los consultores con menos de 50 horas de asignación este mes?",
    "¿Qué tareas tengo pendientes?",
    "Muéstrame mis tareas ordenadas por prioridad"
  ];

  const exampleQuestions = [
    "¿Cuáles son los consultores con menos de 50 horas de asignación este mes?",
    "¿Puedes mostrarme un resumen de las ventas del último trimestre?",
    "¿Cuáles son las tareas pendientes con mayor prioridad?",
    "¿Cómo se comparan las métricas de este mes con las del mes anterior?"
  ]

  return isAuthenticated ? (
    <ChatBotBase
      clientId="chatbotLisa"
      clientWelcomeMessage="Soy LISA, tu Chatbot especializado en análisis de datos."
      suggestedPrompts={suggestedPrompts}
      clientAbout="Tu asistente virtual especializado en análisis de datos."
      exampleQuestions={exampleQuestions}
    />
  ) : null;
}
