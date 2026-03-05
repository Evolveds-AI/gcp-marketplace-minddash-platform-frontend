'use client';

import { motion } from 'framer-motion';
import { usePathname, useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bot, BotMessageSquare, Building2, FolderKanban, LayoutDashboard } from 'lucide-react';
import ChatbotDetail from '@/components/admin-client/ChatbotDetail';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useChatbotHistory } from '@/hooks/useChatbotHistory';
import { useBreadcrumbData } from '@/hooks/useBreadcrumbData';
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ChatbotDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const basePath = '/dashboard/admin';
  const { applyThemeClass } = useThemeMode();
  const { recordVisit } = useChatbotHistory();
  const [activeSection, setActiveSection] = useState<string>('general');
  const [chatbotMeta, setChatbotMeta] = useState<{
    description: string | null;
    tipo: string | null;
    label?: string | null;
    label_color?: string | null;
    created_at: string;
    updated_at: string;
  } | null>(null);
  
  // Usar hook para cargar datos de breadcrumbs dinámicamente
  const breadcrumbData = useBreadcrumbData(
    params.orgId as string,
    params.projectId as string,
    params.chatbotId as string
  );

  useEffect(() => {
    // Leer sección activa de URL query params
    const section = searchParams.get('section');
    if (section) {
      setActiveSection(section);
    }
  }, [searchParams]);

  // Registrar visita al chatbot cuando se carga el nombre
  useEffect(() => {
    const chatbotId = params.chatbotId as string;
    const orgId = params.orgId as string;
    const projectId = params.projectId as string;

    if (chatbotId && orgId && projectId && breadcrumbData.chatbotName) {
      // Registrar la visita con el nombre cargado
      recordVisit({
        id: chatbotId,
        name: breadcrumbData.chatbotName,
        organizationId: orgId,
        projectId: projectId
      });
    }
  }, [params.chatbotId, params.orgId, params.projectId, breadcrumbData.chatbotName, recordVisit]);

  const handleNotification = (type: 'success' | 'error' | 'info', message: string) => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast.info(message);
    }
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    // Actualizar URL con el query param
    router.push(`${basePath}/organizations/${params.orgId}/projects/${params.projectId}/chatbots/${params.chatbotId}?section=${section}`);
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
        <div className="flex flex-col gap-4">
          {/* Breadcrumbs */}
          <TooltipProvider>
            <Breadcrumb>
              <BreadcrumbList className={applyThemeClass('text-gray-400', 'text-gray-600')}>
                <BreadcrumbItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <BreadcrumbLink
                        aria-label="Dashboard"
                        onClick={() => router.push(`${basePath}`)}
                        className={`group flex items-center gap-1 cursor-pointer ${applyThemeClass('hover:text-white', 'hover:text-gray-900')}`}
                      >
                        <motion.span
                          initial="closed"
                          whileHover="open"
                          className="inline-flex items-center gap-1"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          <motion.span
                            variants={{
                              closed: { opacity: 0, maxWidth: 0 },
                              open: { opacity: 1, maxWidth: 96 },
                            }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="overflow-hidden whitespace-nowrap text-xs"
                          >
                            Dashboard
                          </motion.span>
                        </motion.span>
                      </BreadcrumbLink>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>Dashboard</span>
                    </TooltipContent>
                  </Tooltip>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <BreadcrumbLink
                        aria-label="Chatbots"
                        onClick={() => router.push(`${basePath}/chatbots`)}
                        className={`group flex items-center gap-1 cursor-pointer ${applyThemeClass('hover:text-white', 'hover:text-gray-900')}`}
                      >
                        <motion.span
                          initial="closed"
                          whileHover="open"
                          className="inline-flex items-center gap-1"
                        >
                          <BotMessageSquare className="h-4 w-4" />
                          <motion.span
                            variants={{
                              closed: { opacity: 0, maxWidth: 0 },
                              open: { opacity: 1, maxWidth: 96 },
                            }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="overflow-hidden whitespace-nowrap text-xs"
                          >
                            Chatbots
                          </motion.span>
                        </motion.span>
                      </BreadcrumbLink>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>Chatbots</span>
                    </TooltipContent>
                  </Tooltip>
                </BreadcrumbItem>
              
              {/* Organización - con skeleton loader */}
              {breadcrumbData.loading ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <Skeleton className={`h-4 w-24 ${applyThemeClass('bg-minddash-elevated', 'bg-gray-200')}`} />
                    </div>
                  </BreadcrumbItem>
                </>
              ) : breadcrumbData.organizationName ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      onClick={() => router.push(`${basePath}/organizations/${params.orgId}/projects`)}
                      className={`flex items-center gap-1 cursor-pointer ${applyThemeClass('hover:text-white', 'hover:text-gray-900')}`}
                    >
                      <Building2 className="h-4 w-4" />
                      {breadcrumbData.organizationName}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              ) : null}
              
              {/* Proyecto - con skeleton loader */}
              {breadcrumbData.loading ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <div className="flex items-center gap-1">
                      <FolderKanban className="h-4 w-4" />
                      <Skeleton className={`h-4 w-20 ${applyThemeClass('bg-minddash-elevated', 'bg-gray-200')}`} />
                    </div>
                  </BreadcrumbItem>
                </>
              ) : breadcrumbData.projectName ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      onClick={() => router.push(`${basePath}/organizations/${params.orgId}/projects/${params.projectId}/chatbots`)}
                      className={`flex items-center gap-1 cursor-pointer ${applyThemeClass('hover:text-white', 'hover:text-gray-900')}`}
                    >
                      <FolderKanban className="h-4 w-4" />
                      {breadcrumbData.projectName}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              ) : null}
              
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {breadcrumbData.loading ? (
                  <div className="flex items-center gap-1">
                    <Bot className="h-4 w-4" />
                    <Skeleton className={`h-4 w-32 ${applyThemeClass('bg-minddash-elevated', 'bg-gray-200')}`} />
                  </div>
                ) : (
                  <BreadcrumbPage className={applyThemeClass('inline-flex items-center gap-1 text-white font-medium', 'inline-flex items-center gap-1 text-gray-900 font-medium')}>
                    <Bot className="h-4 w-4" />
                    {breadcrumbData.chatbotName || 'Chatbot'}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </TooltipProvider>

          {/* Header content */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>
                {breadcrumbData.chatbotName || breadcrumbData.projectName || 'Detalle del Chatbot'}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {breadcrumbData.projectName && (
                  <span
                    className={applyThemeClass(
                            'px-3 py-1 rounded-full border border-minddash-border bg-minddash-elevated text-gray-300',
                            'px-3 py-1 rounded-full border border-gray-300 bg-white text-gray-700'
                          )
                    }
                  >
                    Proyecto: {breadcrumbData.projectName}
                  </span>
                )}
                {chatbotMeta?.label && (
                  <span
                    className={applyThemeClass(
                            'px-3 py-1 rounded-full border border-minddash-border bg-minddash-elevated text-gray-300',
                            'px-3 py-1 rounded-full border border-gray-300 bg-white text-gray-700'
                          )
                    }
                  >
                    {chatbotMeta.label}
                  </span>
                )}
                {chatbotMeta?.tipo && (
                  <span
                    className={applyThemeClass(
                            'px-3 py-1 text-xs font-medium bg-minddash-verde-500/20 text-minddash-verde-300 rounded-full',
                            'px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full'
                          )
                    }
                  >
                    {chatbotMeta.tipo}
                  </span>
                )}
              </div>
              <p className={`mt-3 text-sm ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
                {chatbotMeta?.description || 'Chatbot sin descripción aún.'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                {chatbotMeta && (
                  <>
                    <span className={applyThemeClass('text-gray-400', 'text-gray-600')}>
                      Creado:{' '}
                      {new Date(chatbotMeta.created_at).toLocaleDateString('es-AR', {
                        dateStyle: 'medium',
                      })}
                    </span>
                    <span className={applyThemeClass('text-gray-400', 'text-gray-600')}>
                      Última actualización:{' '}
                      {new Date(chatbotMeta.updated_at).toLocaleDateString('es-AR', {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </>
                )}
                <span className={applyThemeClass('text-gray-500', 'text-gray-500')}>
                  Sección actual:{' '}
                  {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Contenido */}
      <div className={`flex-1 px-8 py-6 overflow-y-auto ${applyThemeClass('', 'bg-white')}`}>
        <ChatbotDetail 
          chatbotId={params.chatbotId as string}
          projectId={params.projectId as string}
          projectName={breadcrumbData.projectName || ''}
          activeSection={activeSection}
          showNotification={handleNotification}
          onChatbotNameLoaded={(name) => {
            // El nombre ya se guarda en sessionStorage por el hook useBreadcrumbData
            // Solo necesitamos recargar si es necesario
            if (name && name !== breadcrumbData.chatbotName) {
              sessionStorage.setItem(`chatbot-${params.chatbotId}-name`, name);
              breadcrumbData.reload();
            }
          }}
          onChatbotMetaLoaded={(meta) => setChatbotMeta(meta)}
        />
      </div>
    </>
  );
}
