'use client';

import { ChatbotComingSoon } from '@/components/chatbots/ChatbotComingSoon';
import { useAuthAndClientCheck } from '@/hooks/useAuthAndClientCheck';

export default function HelpDeskChatbotPage() {
  const {isLoading, isAuthenticated} = useAuthAndClientCheck('chatbotID6789')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    );
  }

  return isAuthenticated ? (
    <ChatbotComingSoon/>
  ) : null;
}
