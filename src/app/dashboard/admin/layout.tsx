'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  Bot,
  BotMessageSquare,
  Building2,
  Clock,
  Command,
  BookOpen,
  Database,
  FolderKanban,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PenTool,
  PieChart,
  Search,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { UserNav } from '@/components/UserNav';
import { 
  isBayerAdmin, 
  getBayerDynamicStyles, 
  getLogoPath, 
  getBayerClasses 
} from '@/lib/utils/bayer-theme';
import { applyAppTheme, startThemeTransition } from '@/lib/theme/theme-transition';
const OnboardingTour = dynamic(() => import('@/components/admin-client/onboarding/OnboardingTour'), { ssr: false });
const RestartTourDialog = dynamic(() => import('@/components/admin-client/onboarding/RestartTourDialog'), { ssr: false });
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useChatbotHistory } from '@/hooks/useChatbotHistory';
const GlobalSearch = dynamic(() => import('@/components/admin/GlobalSearch'), { ssr: false });

interface ClientUser {
  id: number;
  username: string;
  email: string;
  role: string;
  clientId: number;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = '/dashboard/admin';
  // Hydrate core session from localStorage synchronously so the shell renders instantly
  const [initialAuth] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('evolve-auth');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [clientUser, setClientUser] = useState<ClientUser | null>(() => {
    if (!initialAuth) return null;
    return {
      id: initialAuth.userId,
      username: initialAuth.username,
      email: initialAuth.email || '',
      role: initialAuth.role,
      clientId: initialAuth.clientId,
    };
  });
  const [loading, setLoading] = useState(!initialAuth);
  const [isBayer, setIsBayer] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('minddash-theme');
    return stored === 'light' ? 'light' : 'dark';
  });
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [chatbotsForOmnibar, setChatbotsForOmnibar] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>(initialAuth?.role || '');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const { getHistory } = useChatbotHistory();
  
  // Onboarding tour state
  const { hasCompleted, markCompleted, resetOnboarding } = useOnboardingStatus();
  const [runTour, setRunTour] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);

  const isDarkTheme = themeMode === 'dark';
  const applyThemeClass = (darkVariant: string, lightVariant: string) => (
    isDarkTheme ? darkVariant : lightVariant
  );

  // Determinar qué sección está activa basada en la ruta
  const getActiveSection = () => {
    if (pathname === basePath) return 'dashboard';
    if (pathname.startsWith(`${basePath}/chatbots`)) return 'chatbots';
    if (pathname.startsWith(`${basePath}/organizations`)) return 'organizations';
    if (pathname.startsWith(`${basePath}/users`)) return 'users';
    if (pathname.startsWith(`${basePath}/settings`)) return 'settings';
    return 'dashboard';
  };

  const activeSection = getActiveSection();

  // Menú items
  type SidebarItem = {
    id: string;
    label: string;
    icon: LucideIcon;
    path?: string;
    onClick?: () => void;
    description?: string;
  };

  const baseMenuItems: SidebarItem[] = useMemo(() => ([
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: basePath,
      description: 'Resumen de tu cuenta'
    },
    {
      id: 'chatbots',
      label: 'Chatbots',
      icon: BotMessageSquare,
      path: `${basePath}/chatbots`,
      description: 'Gestioná tus chatbots'
    },
    {
      id: 'organizations',
      label: 'Organizaciones',
      icon: Building2,
      path: `${basePath}/organizations`,
      description: 'Estructura de tu empresa'
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: Users,
      path: `${basePath}/users`,
      description: 'Usuarios y permisos'
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: Settings,
      path: `${basePath}/settings`,
      description: 'Preferencias del panel'
    }
  ]), []);

  const segments = useMemo(() => pathname.split('/').filter(Boolean), [pathname]);
  const isOrganizationsScope = segments[2] === 'organizations';
  const orgId = isOrganizationsScope && segments.length >= 4 ? segments[3] : null;
  const isProjectScope = isOrganizationsScope && segments[4] === 'projects' && segments.length >= 6;
  const projectId = isProjectScope ? segments[5] : null;
  const isChatbotsScope = isProjectScope && segments[6] === 'chatbots';
  const isChatbotDetail = isChatbotsScope && segments.length >= 8;
  const chatbotId = isChatbotDetail ? segments[7] : null;

  const chatbotsListPath = isChatbotsScope && orgId && projectId
    ? `${basePath}/organizations/${orgId}/projects/${projectId}/chatbots`
    : null;

  const chatbotBasePath = isChatbotDetail && chatbotsListPath && chatbotId
    ? `${chatbotsListPath}/${chatbotId}`
    : null;

  const activeChatbotSection = searchParams?.get('section') ?? 'general';

  const isEditorRole = (userRole || '').toLowerCase() === 'editor';
  const menuItems: SidebarItem[] = isEditorRole ? baseMenuItems.filter((item) => item.id !== 'users') : baseMenuItems;
  const menuTitle = 'Mi Empresa';
  const activeMenuId = activeSection;

  let backChatbotsItem: SidebarItem | null = null;
  let chatbotSectionItems: SidebarItem[] = [];

  if (isChatbotDetail && chatbotBasePath && chatbotsListPath) {
    const chatbotMenuItems: SidebarItem[] = [
      {
        id: 'general',
        label: 'General',
        icon: LayoutDashboard,
        path: `${chatbotBasePath}?section=general`,
        description: 'Resumen y estado general'
      },
      {
        id: 'fuentes',
        label: 'Base de conocimiento',
        icon: BookOpen,
        path: `${chatbotBasePath}?section=fuentes`,
        description: 'Documentos y fuentes RAG'
      },
      {
        id: 'conexiones',
        label: 'Conexiones',
        icon: Database,
        path: `${chatbotBasePath}?section=conexiones`,
        description: 'Conexiones a bases de datos'
      },
      {
        id: 'semantic',
        label: 'Capa Semántica',
        icon: Layers,
        path: `${chatbotBasePath}?section=semantic`,
        description: 'Contexto, colecciones y embeddings'
      },
      {
        id: 'metricas',
        label: 'Métricas',
        icon: PieChart,
        path: `${chatbotBasePath}?section=metricas`,
        description: 'KPIs y rendimiento en tiempo real'
      },
      {
        id: 'prompt',
        label: 'Prompt',
        icon: PenTool,
        path: `${chatbotBasePath}?section=prompt`,
        description: 'Configuración del prompt base'
      },
      {
        id: 'examples',
        label: 'Ejemplos',
        icon: MessageSquare,
        path: `${chatbotBasePath}?section=examples`,
        description: 'Ejemplos few-shot y consultas'
      },
      {
        id: 'permisos',
        label: 'Permisos',
        icon: Users,
        path: `${chatbotBasePath}?section=permisos`,
        description: 'Roles y accesos del chatbot'
      },
      {
        id: 'alertas',
        label: 'Alertas',
        icon: Bell,
        path: `${chatbotBasePath}?section=alertas`,
        description: 'Notificaciones automáticas programadas'
      },
      {
        id: 'profiling',
        label: 'Profiling',
        icon: Activity,
        path: `${chatbotBasePath}?section=profiling`,
        description: 'Monitoreo y trazabilidad de sesiones'
      },
      {
        id: 'insights',
        label: 'Insights',
        icon: TrendingUp,
        path: `${chatbotBasePath}?section=insights`,
        description: 'Análisis avanzado y hallazgos clave'
      }
    ];

    const hiddenChatbotSectionIds = new Set(['profiling', 'insights']);

    chatbotSectionItems = chatbotMenuItems.filter(
      (item) => !hiddenChatbotSectionIds.has(item.id)
    );

    if (chatbotsListPath) {
      backChatbotsItem = {
        id: 'back-chatbots',
        label: 'Volver a Chatbots',
        icon: ArrowLeft,
        path: chatbotsListPath,
        description: 'Regresar al listado del proyecto'
      };
    }
  }

  const commandGroups = useMemo(() => {
    const groups: { title: string; items: SidebarItem[] }[] = [];

    if (backChatbotsItem) {
      groups.push({ title: 'Navegación', items: [backChatbotsItem] });
    }

    if (chatbotSectionItems.length) {
      groups.push({ title: 'Secciones del chatbot', items: chatbotSectionItems });
    }

    groups.push({ title: 'Panel principal', items: baseMenuItems });

    return groups;
  }, [baseMenuItems, backChatbotsItem, chatbotSectionItems]);

  const handleCommandSelect = useCallback((item: SidebarItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.path) {
      router.push(item.path);
    }
    setIsCommandOpen(false);
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K o Ctrl+K para búsqueda global (solo super_admin)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (userRole === 'super_admin') {
          setShowGlobalSearch(true);
        } else {
          setIsCommandOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userRole]);

  // Función para manejar logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('evolve-auth');
      localStorage.removeItem('evolve-selected-client');
      router.push('/login?logout=true');
    } catch (error) {
      localStorage.removeItem('evolve-auth');
      localStorage.removeItem('evolve-selected-client');
      router.push('/login?logout=true');
    }
  };

  const handleProfileClick = () => {
    if (!isEditorRole) {
      router.push(`${basePath}/users`);
    }
  };

  const handleHelpClick = () => {
    // Mostrar diálogo para reiniciar tour
    setShowRestartDialog(true);
  };

  const handleConfirmRestartTour = () => {
    resetOnboarding();
    // Primero detener el tour si está corriendo
    setRunTour(false);
    
    // Redirigir al dashboard principal si no estamos ahí
    if (pathname !== basePath) {
      router.push(basePath);
      // Esperar a que la navegación se complete
      setTimeout(() => {
        setRunTour(true);
      }, 1000);
    } else {
      // Si ya estamos en el dashboard, reiniciar inmediatamente
      setRunTour(true);
    }
  };

  // Apply initial theme class to <html> synchronously
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme: 'light' | 'dark' }>;
      if (customEvent.detail?.theme) {
        setThemeMode(customEvent.detail.theme);
      }
    };

    window.addEventListener('theme-change', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('theme-change', handleThemeChange as EventListener);
    };
  }, [themeMode]);

  // Load avatar + server theme in parallel (non-blocking — shell is already visible)
  useEffect(() => {
    if (typeof window === 'undefined' || !initialAuth?.accessToken) {
      setLoading(false);
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${initialAuth.accessToken}`,
    };

    const loadAvatar = fetch('/api/admin-client/me', { method: 'GET', headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const avatar = json?.data?.profile?.avatarData as string | null | undefined;
        if (avatar) setUserAvatar(avatar);
      })
      .catch((err) => console.error('Error cargando avatar:', err));

    const loadTheme = fetch('/api/admin-client/settings', { method: 'GET', headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const serverTheme = json?.data?.appearance?.uiTheme;
        if (serverTheme === 'light' || serverTheme === 'dark') {
          setThemeMode(serverTheme);
          applyAppTheme(serverTheme);
        }
      })
      .catch((err) => console.error('Error cargando settings:', err));

    Promise.all([loadAvatar, loadTheme]).finally(() => setLoading(false));
  }, [initialAuth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSettingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        avatarData?: string | null;
        uiTheme?: 'light' | 'dark' | null;
      }>;
      const nextTheme = customEvent.detail?.uiTheme;
      if (nextTheme === 'light' || nextTheme === 'dark') {
        setThemeMode(nextTheme);
        applyAppTheme(nextTheme);
      }
    };

    const handleAuthUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ username?: string; email?: string }>;
      const nextUsername = customEvent.detail?.username;
      const nextEmail = customEvent.detail?.email;
      if (nextUsername || nextEmail) {
        setClientUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            username: typeof nextUsername === 'string' ? nextUsername : prev.username,
            email: typeof nextEmail === 'string' ? nextEmail : prev.email,
          };
        });
      }
    };

    const handleUserProfileUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ avatarData?: string | null }>;
      const nextAvatar = customEvent.detail?.avatarData;
      if (nextAvatar === null) {
        setUserAvatar(undefined);
        return;
      }
      if (typeof nextAvatar === 'string') {
        setUserAvatar(nextAvatar);
      }
    };

    window.addEventListener('client-settings-updated', handleSettingsUpdated as EventListener);
    window.addEventListener('evolve-auth-updated', handleAuthUpdated as EventListener);
    window.addEventListener('user-profile-updated', handleUserProfileUpdated as EventListener);
    return () => {
      window.removeEventListener('client-settings-updated', handleSettingsUpdated as EventListener);
      window.removeEventListener('evolve-auth-updated', handleAuthUpdated as EventListener);
      window.removeEventListener('user-profile-updated', handleUserProfileUpdated as EventListener);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-minddash-celeste-500 mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Estilos dinámicos para Bayer */}
      {isBayer && <div dangerouslySetInnerHTML={{ __html: getBayerDynamicStyles() }} />}
      
      <div
        className="min-h-screen relative overflow-hidden transition-colors duration-300 bg-background text-foreground"
      >

        <SidebarProvider
          className="relative z-20 flex"
          style={{ '--sidebar-width': '280px' } as any}
        >
          <Sidebar
            variant="sidebar"
            collapsible="icon"
            className={applyThemeClass(
              'text-white',
              'text-gray-900'
            )}
          >
            {/* Header del sidebar */}
            <SidebarHeader className="pt-4 pb-2">
              <div className="flex items-center justify-between px-4 relative">
                <div className="flex items-center">
                  <div className="flex-none">
                    <div className={getBayerClasses(
                      'h-10 w-10 rounded-full overflow-hidden bg-minddash-celeste-600 flex items-center justify-center text-white ring-2 ring-minddash-celeste-400/70 shadow-sm',
                      'h-10 w-10 rounded-full overflow-hidden bayer-gradient-primary flex items-center justify-center text-white'
                    )}>
                      {isBayer ? (
                        <img
                          src={getLogoPath()}
                          alt="Bayer Logo"
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <svg
                          className="h-6 w-6 text-white"
                          viewBox="0 0 24 24"
                          role="img"
                          aria-label="Panel Admin Icon"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6.5 17.5L6.5 14.5M11.5 17.5L11.5 8.5M16.5 17.5V13.5" />
                          <path d="M21.5 5.5C21.5 7.15685 20.1569 8.5 18.5 8.5C16.8431 8.5 15.5 7.15685 15.5 5.5C15.5 3.84315 16.8431 2.5 18.5 2.5C20.1569 2.5 21.5 3.84315 21.5 5.5Z" />
                          <path d="M21.4955 11C21.4955 11 21.5 11.3395 21.5 12C21.5 16.4784 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4784 2.5 12C2.5 7.52169 2.5 5.28252 3.89124 3.89127C5.28249 2.50003 7.52166 2.50003 12 2.50003L13 2.5" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="mx-3">
                    <p
                      className={getBayerClasses(
                        `mb-0 font-semibold ${applyThemeClass('text-white', 'text-gray-900')}`,
                        `mb-0 font-semibold ${applyThemeClass('text-white', 'text-gray-900')} bayer-primary-text`
                      )}
                    >
                      {isEditorRole ? 'Panel Editor' : 'Panel Admin'} {isBayer && 'Bayer'}
                    </p>
                    <p className={`text-xs ${applyThemeClass('text-gray-400', 'text-gray-700')}`}> 
                      {clientUser?.username || 'Cliente'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Búsqueda global */}
              <div className="px-4 mt-2">
                <button
                  type="button"
                  onClick={() => userRole === 'super_admin' ? setShowGlobalSearch(true) : setIsCommandOpen(true)}
                  className={getBayerClasses(
                    applyThemeClass(
                      'w-full flex items-center justify-between rounded-xl border border-minddash-border bg-minddash-elevated px-3 py-2 text-left text-sm text-gray-300 shadow-inner hover:border-minddash-celeste-600/70 hover:text-white transition-colors',
                      'w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:border-minddash-celeste-600/50 hover:text-gray-900 transition-colors shadow-sm'
                    ),
                    applyThemeClass(
                      'w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-white bayer-primary-border/70 bg-minddash-surface hover:bg-minddash-elevated',
                      'w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-gray-900 border border-gray-200 hover:border-bayer-primary-500/60'
                    )
                  )}
                >
                  <span className="flex items-center gap-2 text-xs min-w-0">
                    <Search className="h-4 w-4" />
                    <span className="truncate">Buscar...</span>
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium shrink-0 whitespace-nowrap',
                      applyThemeClass('border-gray-700 text-gray-400', 'border-gray-300 text-gray-600')
                    )}
                  >
                    <Command className="h-3 w-3" />
                    <span>+ K</span>
                  </span>
                </button>
              </div>
            </SidebarHeader>

            {/* Contenido del sidebar */}
            <SidebarContent>
              <ScrollArea className="flex-1">
                <div className="px-4 pb-8 space-y-6">
                  {/* Menú principal fijo */}
                  <div>
                    <div className="flex items-center px-1">
                      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {menuTitle}
                      </h3>
                    </div>
                    <SidebarSeparator className={applyThemeClass('bg-gray-800/80', 'bg-gray-200')} />
                  </div>

                  <div className="space-y-1">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeMenuId === item.id;

                      const handleItemClick = () => {
                        if (item.onClick) {
                          item.onClick();
                          return;
                        }
                        if (item.path) {
                          router.push(item.path);
                        }
                      };

                      const baseClasses = applyThemeClass(
                        'hover:bg-minddash-elevated text-white',
                        'hover:bg-gray-100 text-gray-900'
                      );
                      const activeClasses = getBayerClasses(
                        applyThemeClass(
                          'bg-minddash-elevated text-minddash-celeste-300 font-medium',
                          'bg-blue-50 text-blue-900 font-medium'
                        ),
                        applyThemeClass(
                          'bg-minddash-elevated bayer-primary-text font-medium',
                          'bg-blue-50 bayer-primary-text font-medium'
                        )
                      );

                      // Agregar data-tour attributes para el onboarding
                      const dataTourAttr =
                        item.id === 'dashboard'
                          ? 'dashboard-menu'
                          : item.id === 'organizations'
                            ? 'organizations-menu'
                            : undefined;

                      return (
                        <div key={item.id} className="space-y-1">
                          <button
                            type="button"
                            onClick={handleItemClick}
                            data-tour={dataTourAttr}
                            className={`group flex w-full items-center rounded-xl p-2.5 text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-minddash-celeste-500/60 ${
                              isActive ? activeClasses : baseClasses
                            }`}
                          >
                            <div className="flex items-center w-full overflow-hidden">
                              <div className="flex-shrink-0 mr-3">
                                <div
                                  className={`h-9 w-9 rounded-full flex items-center justify-center ${applyThemeClass('text-white', 'text-gray-900')} ${
                                    isActive
                                      ? getBayerClasses('bg-minddash-celeste-600', 'bayer-primary-bg')
                                      : applyThemeClass('bg-minddash-elevated', 'bg-gray-200')
                                  }`}
                                >
                                  <Icon
                                    className={cn(
                                      'h-5 w-5',
                                      applyThemeClass(
                                        'text-white',
                                        'text-gray-900'
                                      )
                                    )}
                                  />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`truncate font-semibold text-sm ${applyThemeClass('text-white', 'text-gray-900')}`}
                                >
                                  {item.label}
                                </p>
                                {item.description && (
                                  <p
                                    className={`truncate text-xs ${applyThemeClass('text-gray-400', 'text-gray-500')}`}
                                  >
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Rama de contexto específica para Organizaciones */}
                          {item.id === 'organizations' &&
                            (isOrganizationsScope || isProjectScope || isChatbotsScope || isChatbotDetail) && (
                              <div className="ml-4 mt-1 space-y-1 text-sm">
                                {/* Nivel: Proyectos de la organización */}
                                {orgId && (
                                  <div className="border-l border-gray-700/60 pl-3 space-y-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        router.push(`${basePath}/organizations/${orgId}/projects`)
                                      }
                                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-xs tracking-wide uppercase ${applyThemeClass(
                                        'text-gray-400 hover:text-white',
                                        'text-gray-600 hover:text-gray-900'
                                      )}`}
                                    >
                                      <span>Proyectos</span>
                                    </button>

                                    {/* Nivel: Proyecto actual */}
                                    {projectId && (
                                      <div className="ml-3 border-l border-gray-700/60 pl-3 space-y-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            router.push(
                                              `${basePath}/organizations/${orgId}/projects/${projectId}/chatbots`
                                            )
                                          }
                                          className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-xs ${applyThemeClass(
                                            'text-gray-300 hover:text-white',
                                            'text-gray-700 hover:text-gray-900'
                                          )}`}
                                        >
                                          <span>Productos</span>
                                        </button>

                                        {/* Nivel: Chatbot actual + secciones */}
                                        {isChatbotDetail && chatbotBasePath && (
                                          <div className="ml-3 border-l border-gray-700/60 pl-3 space-y-1">
                                            {backChatbotsItem && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  backChatbotsItem?.path && router.push(backChatbotsItem.path)
                                                }
                                                className={`flex w-full items-center rounded-lg px-2 py-1 text-left text-xs ${applyThemeClass(
                                                  'text-gray-400 hover:text-white',
                                                  'text-gray-600 hover:text-gray-900'
                                                )}`}
                                              >
                                                <span className="flex items-center gap-2">
                                                  <ArrowLeft className="h-3 w-3" />
                                                  <span>{backChatbotsItem.label}</span>
                                                </span>
                                              </button>
                                            )}

                                            {chatbotSectionItems.map((section) => {
                                              const isSectionActive = activeChatbotSection === section.id;
                                              const SectionIcon = section.icon;

                                              const handleSectionClick = () => {
                                                if (section.path) {
                                                  router.push(section.path);
                                                }
                                              };

                                              return (
                                                <button
                                                  key={section.id}
                                                  type="button"
                                                  onClick={handleSectionClick}
                                                  className={`group flex w-full items-center rounded-lg px-2 py-1 text-left text-xs transition-colors ${
                                                    isSectionActive
                                                      ? getBayerClasses(
                                                          applyThemeClass(
                                                            'bg-minddash-elevated text-minddash-celeste-300 font-medium',
                                                            'bg-blue-100 text-blue-900 font-medium'
                                                          ),
                                                          applyThemeClass(
                                                            'bg-minddash-elevated bayer-primary-text font-medium',
                                                            'bg-blue-100 bayer-primary-text font-medium'
                                                          )
                                                        )
                                                      : applyThemeClass(
                                                          'text-gray-300 hover:text-white',
                                                          'text-gray-700 hover:text-gray-900'
                                                        )
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <SectionIcon className="h-3 w-3" />
                                                    <span className="truncate">{section.label}</span>
                                                  </div>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </SidebarContent>

            {/* UserNav Footer */}
            <SidebarFooter
              className={applyThemeClass(
                'border-t border-minddash-border px-4 pb-4 pt-3 mt-auto',
                'border-t border-gray-200 px-4 pb-4 pt-3 mt-auto'
              )}
            >
              <UserNav
                userName={clientUser?.username || 'Admin'}
                userEmail={clientUser?.email || 'admin@minddash.ai'}
                userAvatar={userAvatar}
                userRole={userRole}
                onLogout={handleLogout}
                onProfileClick={handleProfileClick}
                onSettingsClick={() => router.push(`${basePath}/settings`)}
                onHelpClick={handleHelpClick}
                themeMode={themeMode}
                onThemeChange={(mode) => {
                  startThemeTransition(() => {
                    setThemeMode(mode);
                    applyAppTheme(mode);
                  }, { start: 'center', variant: 'circle' });
                }}
              />
            </SidebarFooter>
          </Sidebar>

          {/* Contenido principal */}
          <SidebarInset className="flex-1 flex flex-col bg-transparent" data-tour="navigation">
            {children}
          </SidebarInset>
        </SidebarProvider>
      </div>

      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Buscar chatbots, secciones, acciones..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          
          {/* Chatbots recientes */}
          {getHistory().length > 0 && (
            <>
              <CommandGroup heading="Chatbots recientes">
                {getHistory().slice(0, 5).map((chatbot) => (
                  <CommandItem
                    key={`recent-${chatbot.id}`}
                    value={`${chatbot.name} chatbot reciente`}
                    onSelect={() => {
                      const path = `${basePath}/organizations/${chatbot.organizationId}/projects/${chatbot.projectId}/chatbots/${chatbot.id}`;
                      router.push(path);
                      setIsCommandOpen(false);
                    }}
                  >
                    <Clock className="h-4 w-4" />
                    <span>{chatbot.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Todos los chatbots */}
          {chatbotsForOmnibar.length > 0 && (
            <>
              <CommandGroup heading="Todos los chatbots">
                {chatbotsForOmnibar.map((chatbot) => (
                  <CommandItem
                    key={`chatbot-${chatbot.id}`}
                    value={`${chatbot.nombre} ${chatbot.organization_name || ''} ${chatbot.project_name || ''} chatbot`}
                    onSelect={() => {
                      if (chatbot.organization_id && chatbot.project_id) {
                        const path = `${basePath}/organizations/${chatbot.organization_id}/projects/${chatbot.project_id}/chatbots/${chatbot.id}`;
                        router.push(path);
                      } else {
                        router.push(`${basePath}/chatbots`);
                      }
                      setIsCommandOpen(false);
                    }}
                  >
                    <Bot className="h-4 w-4" />
                    <span>{chatbot.nombre}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {chatbot.organization_name || chatbot.project_name || ''}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Secciones del panel */}
          {commandGroups.map((group) => (
            <CommandGroup key={group.title} heading={group.title}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={`${group.title}-${item.id}`}
                    value={`${item.label} ${item.description ?? ''}`}
                    onSelect={() => handleCommandSelect(item)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="ml-auto text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Acciones rápidas">
            <CommandItem
              onSelect={() => handleCommandSelect({
                id: 'create-organization-shortcut',
                label: 'Nueva organización',
                icon: Building2,
                path: `${basePath}/organizations`
              })}
            >
              <Building2 className="h-4 w-4" />
              <span>Crear organización</span>
            </CommandItem>
            {!isEditorRole && (
              <CommandItem
                onSelect={() => handleCommandSelect({
                  id: 'create-user-shortcut',
                  label: 'Nuevo usuario',
                  icon: Users,
                  path: `${basePath}/users`
                })}
              >
                <Users className="h-4 w-4" />
                <span>Invitar usuario</span>
              </CommandItem>
            )}
            <CommandItem
              onSelect={() => handleCommandSelect({
                id: 'view-reports-shortcut',
                label: 'Ver reportes',
                icon: BarChart3,
                path: basePath
              })}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Ver reportes principales</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Sesión">
            <CommandItem onSelect={() => handleCommandSelect({
              id: 'logout',
              label: 'Cerrar sesión',
              icon: LogOut,
              onClick: handleLogout,
              description: 'Finaliza la sesión actual'
            })}>
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect({
              id: 'settings-shortcut',
              label: 'Configuración',
              icon: Settings,
              path: `${basePath}/settings`,
              description: 'Ajustes generales'
            })}>
              <Settings className="h-4 w-4" />
              <span>Configuración</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Búsqueda global para Super Admin */}
      {userRole === 'super_admin' && (
        <GlobalSearch 
          open={showGlobalSearch} 
          onOpenChange={setShowGlobalSearch} 
        />
      )}

      {/* Onboarding Tour */}
      <OnboardingTour
        run={runTour}
        onComplete={() => {
          markCompleted();
          setRunTour(false);
        }}
        onSkip={() => {
          markCompleted();
          setRunTour(false);
        }}
      />

      {/* Restart Tour Dialog */}
      <RestartTourDialog
        isOpen={showRestartDialog}
        onClose={() => setShowRestartDialog(false)}
        onConfirm={handleConfirmRestartTour}
      />
    </>
  );
}
