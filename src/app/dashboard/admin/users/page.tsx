'use client';

import { motion } from 'framer-motion';
import ClientUsersManagement from '@/components/admin-client/ClientUsersManagement';
import SuperAdminUserManagement from '@/components/admin/SuperAdminUserManagement';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const router = useRouter();
  const { applyThemeClass } = useThemeMode();
  const [clientId, setClientId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const authData = localStorage.getItem('evolve-auth');
    if (authData) {
      const auth = JSON.parse(authData);
      setClientId(auth.clientId?.toString() || '');
      setUserRole(auth.role || '');
    }
  }, []);

  useEffect(() => {
    if (userRole && userRole.toLowerCase() === 'editor') {
      router.push('/dashboard/admin');
    }
  }, [router, userRole]);

  // If user is super_admin, show the enhanced user management
  if (userRole === 'super_admin') {
    return <SuperAdminUserManagement />;
  }

  if (userRole && userRole.toLowerCase() === 'editor') {
    return null;
  }

  const handleNotification = (type: 'success' | 'error' | 'info', message: string) => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast.info(message);
    }
  };

  return (
    <>
      {/* Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`px-8 py-6 shadow-sm border-b ${applyThemeClass(
          'bg-minddash-surface border-minddash-border',
          'bg-white border-gray-200 text-gray-900'
        )}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>
              Usuarios
            </h1>
            <p className={`mt-2 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
              Gestioná usuarios y permisos de tu empresa
            </p>
          </div>
        </div>
      </motion.div>

      {/* Contenido */}
      <div className={`flex-1 px-8 py-6 overflow-y-auto ${applyThemeClass('', 'bg-white')}`}>
        <ClientUsersManagement 
          clientId={clientId} 
          showNotification={handleNotification} 
        />
      </div>
    </>
  );
}
