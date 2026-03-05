'use client';

import { motion } from 'framer-motion';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProjectList from '@/components/admin-client/ProjectList';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import { ArrowLeft as FiArrowLeft, FolderKanban } from 'lucide-react';

export default function ProjectsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const basePath = '/dashboard/admin';
  const { applyThemeClass } = useThemeMode();
  const [orgName, setOrgName] = useState<string>('');

  useEffect(() => {
    // Obtener nombre de la organización del session storage
    const storedOrgName = sessionStorage.getItem('selectedOrgName');
    if (storedOrgName) {
      setOrgName(storedOrgName);
    }
  }, []);

  const handleNotification = (type: 'success' | 'error' | 'info', message: string) => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast.info(message);
    }
  };

  const handleSelectProject = (projectId: string, projectName: string) => {
    // Almacenar en session storage
    sessionStorage.setItem('selectedProjectId', projectId);
    sessionStorage.setItem('selectedProjectName', projectName);
    
    // Navegar a la vista de chatbots del proyecto
    router.push(`${basePath}/organizations/${params.orgId}/projects/${projectId}/chatbots`);
    toast(
      <div className="flex items-center gap-2">
        <FolderKanban className="h-5 w-5 shrink-0" />
        Proyecto "{projectName}" seleccionado
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
            <button
              onClick={() => router.push(`${basePath}/organizations`)}
              className={`flex items-center space-x-2 mb-2 ${applyThemeClass('text-gray-400 hover:text-white', 'text-gray-600 hover:text-gray-900')} transition-colors`}
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>Volver a Organizaciones</span>
            </button>
            <h1 className={`text-3xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>
              {orgName || 'Proyectos'}
            </h1>
            <p className={`mt-2 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
              Proyectos de la organización
            </p>
          </div>
        </div>
      </motion.div>

      {/* Contenido */}
      <div className={`flex-1 px-8 py-6 overflow-y-auto ${applyThemeClass('', 'bg-white')}`}>
        <ProjectList 
          showNotification={handleNotification}
          onSelectProject={handleSelectProject}
          organizationId={params.orgId as string}
        />
      </div>
    </>
  );
}
