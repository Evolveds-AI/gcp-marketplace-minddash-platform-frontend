'use client';

import { motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import OrganizationList from '@/components/admin-client/OrganizationList';
import SuperAdminOrganizationManagement from '@/components/admin/SuperAdminOrganizationManagement';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import { Building2 } from 'lucide-react';

export default function OrganizationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = '/dashboard/admin';
  const { applyThemeClass } = useThemeMode();
  const [userRole, setUserRole] = useState<string>('');

  // Check user role to determine which component to show
  useEffect(() => {
    const authData = localStorage.getItem('evolve-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      setUserRole(parsed.role || '');
    }
  }, []);

  // If user is super_admin, show the enhanced organization management
  if (userRole === 'super_admin') {
    return <SuperAdminOrganizationManagement />;
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

  const handleSelectOrganization = (orgId: string, orgName: string) => {
    // Almacenar en session storage para mantener contexto
    sessionStorage.setItem('selectedOrgId', orgId);
    sessionStorage.setItem('selectedOrgName', orgName);
    
    // Navegar a la vista de proyectos de la organización
    router.push(`${basePath}/organizations/${orgId}/projects`);
    toast(
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 shrink-0" />
        Organización "{orgName}" seleccionada
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`px-8 py-6 shadow-sm border-b ${applyThemeClass(
                'bg-minddash-surface border-minddash-border',
                'bg-white border-gray-200 text-gray-900'
              )}`
        }
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>
              Organizaciones
            </h1>
            <p className={`mt-2 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
              Estructura de tu empresa y sus proyectos
            </p>
          </div>
        </div>
      </motion.div>

      {/* Contenido */}
      <div className={`flex-1 px-8 py-6 overflow-y-auto ${applyThemeClass('', 'bg-white')}`}>
        <OrganizationList
          showNotification={handleNotification}
          onSelectOrganization={handleSelectOrganization}
        />
      </div>
    </>
  );
}
