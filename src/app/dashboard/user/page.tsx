'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedSpinner } from '@/components/loaders';
import UserChatbotSelector from '@/components/UserChatbotSelector';

export default function UserDashboardPage() {
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUserAccess = () => {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        router.push('/login');
        return;
      }

      try {
        const auth = JSON.parse(authData);
        const allowedRoles = ['super_admin', 'admin', 'user'];
        
        if (!allowedRoles.includes(auth.role)) {
          router.push('/login');
          return;
        }

        setUserRole(auth.role);
      } catch (e) {
        console.error('Error al verificar rol:', e);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUserAccess();
  }, [router]);

  if (loading) {
    return (
      <UnifiedSpinner 
        size="medium" 
        fullScreen={true}
        message="Cargando dashboard de usuario..."
      />
    );
  }

  if (!userRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserChatbotSelector onLogout={() => {
        localStorage.removeItem('evolve-auth');
        localStorage.removeItem('evolve-selected-client');
        router.push('/login');
      }} />
    </div>
  );
}