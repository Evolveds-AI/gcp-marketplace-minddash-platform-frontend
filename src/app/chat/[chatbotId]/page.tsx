'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UnifiedSpinner } from '@/components/loaders';

export default function ChatbotPage() {
  const params = useParams();
  const router = useRouter();
  
  useEffect(() => {
    if (!params || !params.chatbotId) {
      return;
    }
    
    const chatbotId = params.chatbotId as string;
    // Redirigir a la ruta correcta del chatbot
    router.replace(`/chatbot/${chatbotId}`);
  }, [params, router]);

  return (
    <UnifiedSpinner 
      size="medium" 
      fullScreen={true}
      message="Redirigiendo..."
    />
  );
}