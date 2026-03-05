'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Command,
  Users,
  Building2,
  Package,
  MessageSquare,
  Settings,
  Calendar,
  Clock,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import {
  Command as CommandUI,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'user' | 'organization' | 'project' | 'chatbot' | 'setting';
  title: string;
  description?: string;
  subtitle?: string;
  metadata?: {
    status?: string;
    role?: string;
    createdAt?: string;
    lastActivity?: string;
    organization?: string;
    projects?: number;
    users?: number;
    chatbots?: number;
    project?: string;
    messages?: number;
    category?: string;
    value?: number;
    updatedAt?: string;
  };
  url: string;
  icon: React.ReactNode;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = '/dashboard/admin';
  const { applyThemeClass } = useThemeMode();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Cargar búsquedas recientes
  useEffect(() => {
    const stored = localStorage.getItem('superadmin-recent-searches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Simular búsqueda global
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        // Mock API call - reemplazar con API real
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const mockResults: SearchResult[] = [
          // Usuarios
          {
            id: 'user-1',
            type: 'user',
            title: 'Carlos Ruiz',
            subtitle: '@carlos.ruiz',
            description: 'carlos@bayer.com',
            metadata: {
              role: 'Admin',
              organization: 'Bayer Pharma',
              lastActivity: 'Hace 2 horas',
            },
            url: '/dashboard/admin/users/user-1',
            icon: <Users className="w-4 h-4" />,
          },
          // Organizaciones
          {
            id: 'org-1',
            type: 'organization',
            title: 'Bayer Pharma',
            description: 'División farmacéutica de Bayer AG',
            metadata: {
              status: 'Activa',
              createdAt: '2023-01-15',
              projects: 12,
              users: 156,
            },
            url: '/dashboard/admin/organizations/org-1',
            icon: <Building2 className="w-4 h-4" />,
          },
          // Proyectos
          {
            id: 'proj-1',
            type: 'project',
            title: 'Asistente Ventas 2024',
            subtitle: 'Proyecto de chatbot de ventas',
            description: 'Chatbot especializado en ventas farmacéuticas',
            metadata: {
              organization: 'Bayer Pharma',
              chatbots: 3,
              status: 'Activo',
            },
            url: '/dashboard/admin/organizations/org-1/projects/proj-1',
            icon: <Package className="w-4 h-4" />,
          },
          // Chatbots
          {
            id: 'chat-1',
            type: 'chatbot',
            title: 'Bayer Assistant',
            subtitle: 'lisit',
            description: 'Asistente virtual para empleados',
            metadata: {
              organization: 'Bayer Pharma',
              project: 'Asistente Ventas 2024',
              messages: 45230,
              status: 'Activo',
            },
            url: '/dashboard/admin/organizations/org-1/projects/proj-1/chatbots/chat-1',
            icon: <MessageSquare className="w-4 h-4" />,
          },
          // Configuraciones
          {
            id: 'cfg-1',
            type: 'setting',
            title: 'MAX_ORGANIZATIONS_PER_ADMIN',
            description: 'Número máximo de organizaciones que un admin puede gestionar',
            metadata: {
              category: 'Límites',
              value: 10,
              updatedAt: '2025-01-20',
            },
            url: '/dashboard/admin/settings?config=MAX_ORGANIZATIONS_PER_ADMIN',
            icon: <Settings className="w-4 h-4" />,
          },
        ];

        const mappedResults = mockResults
          .map((result): SearchResult => {
            if (result.url?.startsWith('/dashboard/admin')) {
              return {
                ...result,
                url: result.url.replace('/dashboard/admin', basePath),
              };
            }
            return result;
          })
          .filter((result) =>
          result.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        setSearchResults(mappedResults);
      } catch (error) {
        console.error('Error searching:', error);
        toast.error('Error en la búsqueda');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, basePath]);

  // Manejar selección de resultado
  const handleSelect = (result: SearchResult) => {
    // Guardar en búsquedas recientes
    const newRecentSearches = [
      searchTerm,
      ...recentSearches.filter(s => s !== searchTerm).slice(0, 4)
    ];
    setRecentSearches(newRecentSearches);
    localStorage.setItem('superadmin-recent-searches', JSON.stringify(newRecentSearches));

    // Navegar al resultado
    onOpenChange(false);
    setSearchTerm('');
    router.push(result.url);
  };

  // Manejar búsqueda reciente
  const handleRecentSearch = (term: string) => {
    setSearchTerm(term);
  };

  // Limpiar búsquedas recientes
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('superadmin-recent-searches');
  };

  // Renderizar resultado de búsqueda
  const renderSearchResult = (result: SearchResult) => {
    const typeColors = {
      user: 'text-blue-400',
      organization: 'text-green-400',
      project: 'text-purple-400',
      chatbot: 'text-cyan-400',
      setting: 'text-orange-400',
    };

    const typeLabels = {
      user: 'Usuario',
      organization: 'Organización',
      project: 'Proyecto',
      chatbot: 'Chatbot',
      setting: 'Configuración',
    };

    return (
      <CommandItem
        key={result.id}
        onSelect={() => handleSelect(result)}
        className="flex items-center gap-3 p-2"
      >
        <div className={cn('flex items-center justify-center w-8 h-8 rounded-md', typeColors[result.type])}>
          {result.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium">{result.title}</p>
            <Badge variant="secondary" className="text-xs">
              {typeLabels[result.type]}
            </Badge>
          </div>
          {result.subtitle && (
            <p className="text-sm text-muted-foreground">{result.subtitle}</p>
          )}
          {result.description && (
            <p className="text-xs text-muted-foreground truncate">{result.description}</p>
          )}
          {result.metadata && (
            <div className="flex items-center gap-4 mt-1">
              {result.metadata.organization && (
                <span className="text-xs text-muted-foreground">
                  {result.metadata.organization}
                </span>
              )}
              {result.metadata.status && (
                <span className="text-xs text-muted-foreground">
                  {result.metadata.status}
                </span>
              )}
              {result.metadata.lastActivity && (
                <span className="text-xs text-muted-foreground">
                  {result.metadata.lastActivity}
                </span>
              )}
            </div>
          )}
        </div>
      </CommandItem>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl overflow-hidden bg-[#121212]/95 backdrop-blur-xl border border-white/10 text-white shadow-2xl">
        <CommandUI className="bg-transparent border-none">
          <div className="flex items-center border-b border-white/10 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-gray-400" />
            <CommandInput
              placeholder="Buscar usuarios, organizaciones, proyectos, chatbots, configuración..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 text-white"
            />
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium opacity-100 text-gray-400">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
          
          <CommandList className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-400">No se encontraron resultados.</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Intenta con diferentes términos
                  </p>
                </div>
              )}
            </CommandEmpty>

            {/* Búsquedas recientes */}
            {searchTerm.length === 0 && recentSearches.length > 0 && (
              <CommandGroup heading="Búsquedas recientes" className="text-gray-400">
                {recentSearches.map((term, index) => (
                  <CommandItem
                    key={index}
                    onSelect={() => handleRecentSearch(term)}
                    className="flex items-center gap-2 aria-selected:bg-white/10 aria-selected:text-white text-gray-300"
                  >
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{term}</span>
                  </CommandItem>
                ))}
                <CommandItem onSelect={clearRecentSearches} className="flex items-center gap-2 aria-selected:bg-white/10 aria-selected:text-white text-gray-300">
                  <X className="w-4 h-4 text-gray-500" />
                  <span>Limpiar búsquedas recientes</span>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Resultados de búsqueda */}
            {searchResults.length > 0 && (
              <>
                <CommandSeparator className="bg-white/10" />
                {Object.entries(
                  searchResults.reduce((acc, result) => {
                    if (!acc[result.type]) acc[result.type] = [];
                    acc[result.type].push(result);
                    return acc;
                  }, {} as Record<string, SearchResult[]>)
                ).map(([type, results]) => (
                  <CommandGroup key={type} heading={type.charAt(0).toUpperCase() + type.slice(1)} className="text-gray-400">
                    {results.map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center gap-3 p-2 aria-selected:bg-white/10 aria-selected:text-white"
                      >
                        <div className={cn('flex items-center justify-center w-8 h-8 rounded-md bg-white/5', {
                          'text-blue-400': result.type === 'user',
                          'text-green-400': result.type === 'organization',
                          'text-purple-400': result.type === 'project',
                          'text-cyan-400': result.type === 'chatbot',
                          'text-orange-400': result.type === 'setting',
                        })}>
                          {result.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-200">{result.title}</p>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/10 text-gray-400 border-white/5 h-5">
                              {type === 'user' && 'Usuario'}
                              {type === 'organization' && 'Organización'}
                              {type === 'project' && 'Proyecto'}
                              {type === 'chatbot' && 'Chatbot'}
                              {type === 'setting' && 'Configuración'}
                            </Badge>
                          </div>
                          {result.subtitle && (
                            <p className="text-sm text-gray-500">{result.subtitle}</p>
                          )}
                          {result.description && (
                            <p className="text-xs text-gray-500 truncate">{result.description}</p>
                          )}
                          {result.metadata && (
                            <div className="flex items-center gap-4 mt-1">
                              {result.metadata.organization && (
                                <span className="text-xs text-gray-600">
                                  {result.metadata.organization}
                                </span>
                              )}
                              {result.metadata.status && (
                                <span className="text-xs text-gray-600">
                                  {result.metadata.status}
                                </span>
                              )}
                              {result.metadata.lastActivity && (
                                <span className="text-xs text-gray-600">
                                  {result.metadata.lastActivity}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            )}

            {/* Atajos */}
            {searchTerm.length === 0 && (
              <>
                <CommandSeparator className="bg-white/10" />
                <CommandGroup heading="Atajos rápidos" className="text-gray-400">
                  <CommandItem onSelect={() => router.push(`${basePath}/users`)} className="aria-selected:bg-white/10 aria-selected:text-white text-gray-300">
                    <Users className="w-4 h-4 mr-2" />
                    <span>Ver todos los usuarios</span>
                  </CommandItem>
                  <CommandItem onSelect={() => router.push(`${basePath}/organizations`)} className="aria-selected:bg-white/10 aria-selected:text-white text-gray-300">
                    <Building2 className="w-4 h-4 mr-2" />
                    <span>Ver todas las organizaciones</span>
                  </CommandItem>
                  <CommandItem onSelect={() => router.push(`${basePath}/settings`)} className="aria-selected:bg-white/10 aria-selected:text-white text-gray-300">
                    <Settings className="w-4 h-4 mr-2" />
                    <span>Configuración del sistema</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </CommandUI>
      </DialogContent>
    </Dialog>
  );
}
