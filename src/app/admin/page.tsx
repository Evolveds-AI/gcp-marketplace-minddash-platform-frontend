'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedSpinner } from '@/components/loaders';
import AdminPanel from '@/components/admin/AdminPanel';

export default function AdminPage() {
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSuperAdminAccess = () => {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        router.push('/login');
        return;
      }

      try {
        const auth = JSON.parse(authData);
        
        // Solo super_admin puede acceder a /admin
        if (auth.role !== 'super_admin') {
          // Redirigir según el rol
          if (auth.role === 'admin') {
            router.push('/dashboard/admin'); // Panel limitado para admin
          } else {
            router.push('/dashboard/user'); // Dashboard de usuario para otros
          }
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

    checkSuperAdminAccess();
  }, [router]);

  if (loading) {
    return (
      <UnifiedSpinner 
        size="medium" 
        fullScreen={true}
        message="Verificando permisos de super administrador..."
      />
    );
  }

  if (!userRole) {
    return null;
  }

  return <AdminPanel />;
}