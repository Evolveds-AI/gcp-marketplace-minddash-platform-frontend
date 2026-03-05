'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedSpinner } from '@/components/loaders';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authData = localStorage.getItem('evolve-auth');
        if (!authData) {
          router.push('/login');
          return;
        }

        const auth = JSON.parse(authData);
        const now = new Date().getTime();
        const authTime = auth.timestamp || 0;
        const isValid = now - authTime < 24 * 60 * 60 * 1000;
        
        if (!auth.isAuthenticated || !isValid) {
          router.push('/login');
          return;
        }

        setIsAuthenticated(true);
      } catch (e) {
        console.error('Error al verificar autenticación:', e);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <UnifiedSpinner 
        size="medium" 
        fullScreen={true}
        message="Verificando acceso..."
      />
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}