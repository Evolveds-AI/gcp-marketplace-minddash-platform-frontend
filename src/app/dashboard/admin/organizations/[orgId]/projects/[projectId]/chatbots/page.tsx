'use client';

import { motion } from 'framer-motion';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProjectChatbotsView from '@/components/admin-client/ProjectChatbotsView';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import { ArrowLeft as FiArrowLeft, Bot } from 'lucide-react';

export default function ChatbotsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const basePath = '/dashboard/admin';
  const { applyThemeClass } = useThemeMode();
  const [projectName, setProjectName] = useState<string>('');

  useEffect(() => {
    // Obtener nombre del proyecto del session storage
    const storedProjectName = sessionStorage.getItem('selectedProjectName');
    if (storedProjectName) {
      setProjectName(storedProjectName);
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

  const handleSelectChatbot = (chatbotId: string, chatbotName?: string) => {
    // Navegar al detalle del chatbot
    router.push(`${basePath}/organizations/${params.orgId}/projects/${params.projectId}/chatbots/${chatbotId}`);
    toast(
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 shrink-0" />
        Chatbot "{chatbotName || 'Sin nombre'}" seleccionado
      </div>
    );
  };

  const handleBack = () => {
    router.push(`${basePath}/organizations/${params.orgId}/projects`);
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
              onClick={handleBack}
              className={`flex items-center space-x-2 mb-2 ${applyThemeClass('text-gray-400 hover:text-white', 'text-gray-600 hover:text-gray-900')} transition-colors`}
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>Volver a Proyectos</span>
            </button>
            <h1 className={`text-3xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>
              {projectName || 'Chatbots'}
            </h1>
            <p className={`mt-2 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
              Chatbots del proyecto
            </p>
          </div>
        </div>
      </motion.div>

      {/* Contenido */}
      <div className={`flex-1 px-8 py-6 overflow-y-auto ${applyThemeClass('', 'bg-white')}`}>
        <ProjectChatbotsView 
          projectId={params.projectId as string}
          projectName={projectName}
          onBack={handleBack}
          onSelectChatbot={handleSelectChatbot}
          showNotification={handleNotification}
        />
      </div>
    </>
  );
}
