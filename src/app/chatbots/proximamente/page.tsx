'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatbotComingSoon } from '@/components/chatbots/ChatbotComingSoon';

export default function ComingSoonPage() {
  const router = useRouter();

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem('evolve-auth');
      if (authData) {
        try {
          const auth = JSON.parse(authData);
          const now = new Date().getTime();
          const authTime = auth.timestamp || 0;
          const isValid = now - authTime < 24 * 60 * 60 * 1000;
          
          return auth.isAuthenticated && isValid;
        } catch (e) {
          console.error('Error al verificar autenticación:', e);
        }
      }
      return false;
    };

    const isAuth = checkAuth();
    if (!isAuth) {
      router.push('/login');
    }
  }, [router]);

  return (
    <ChatbotComingSoon />
  );
}
