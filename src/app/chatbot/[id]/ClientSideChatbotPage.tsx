'use client';

import { ChatbotComingSoon } from '@/components/chatbots/ChatbotComingSoon';
import ChatbotBase from '@/components/chatbots/ChatbotBase';
import { useAuthAndClientCheck } from '@/hooks/useAuthAndClientCheck';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type Props = {
  config: {
    productId: string;
    clientId: string;
    client: {
      id: string;
      name: string;
      companyName: string;
      description: string;
    };
    productName: string;
    welcomeMessage: string;
    about: string;
    suggestedPrompts: string[];
    exampleQuestions: string[];
    component?: string;
    apiEndpoint?: string;
  };
};

export default function ClientSideChatbotPage({ config }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const isProductChatbot = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.productId);

  // Usar el hook siempre, pero con lógica condicional interna
  const { isLoading, isAuthenticated } = useAuthAndClientCheck(
    isProductChatbot ? 'SKIP_AUTH_CHECK' : config.clientId
  );

  // Para chatbots predefinidos, usar la lógica original
  if (!isProductChatbot) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-[#111111] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Cargando...</div>
        </div>
      );
    }

    if (!isAuthenticated) return null;
  }

  if (config.component === 'comingSoon') {
    return <ChatbotComingSoon />;
  }

  return (
    <ChatbotBase
      clientId={config.clientId}
      clientWelcomeMessage={config.welcomeMessage}
      suggestedPrompts={config.suggestedPrompts}
      clientAbout={config.about}
      exampleQuestions={config.exampleQuestions}
      isProductChatbot={isProductChatbot}
      productName={config.productName}
      productId={config.productId}
      clientName={config.client.name}
    />
  );
}
