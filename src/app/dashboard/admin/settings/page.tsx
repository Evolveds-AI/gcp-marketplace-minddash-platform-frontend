'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import ClientSettings from '@/components/admin-client/ClientSettings';
import SuperAdminSystemControl from '@/components/admin/SuperAdminSystemControl';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';

interface ClientUser {
  id: number;
  username: string;
  email: string;
  role: string;
  clientId: number;
}

export default function SettingsPage() {
  const { applyThemeClass } = useThemeMode();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const authData = localStorage.getItem('evolve-auth');
    if (authData) {
      const auth = JSON.parse(authData);
      const userData = {
        id: auth.userId,
        username: auth.username,
        email: auth.email || '',
        role: auth.role,
        clientId: auth.clientId
      };
      setClientUser(userData);
      setUserRole(auth.role || '');
    }
  }, []);

  // If user is super_admin, show the enhanced system control
  if (userRole === 'super_admin') {
    return <SuperAdminSystemControl />;
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
              Configuración
            </h1>
            <p className={`mt-2 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
              Preferencias del panel y personalización
            </p>
          </div>
        </div>
      </motion.div>

      {/* Contenido */}
      <div className={`flex-1 px-8 py-6 overflow-y-auto ${applyThemeClass('', 'bg-white')}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <ClientSettings 
            clientData={clientUser} 
            showNotification={handleNotification} 
          />
        </motion.div>
      </div>
    </>
  );
}
