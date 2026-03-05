'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  FolderKanban,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useThemeMode } from '@/hooks/useThemeMode';
import { toast } from 'sonner';
import ModalPortal from '@/components/ui/ModalPortal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PricingUpgradeModal, { usePricingUpgradeModal } from '@/components/billing/PricingUpgradeModal';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  description: string | null;
  tag: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  chatbots_count: number;
  users_count: number;
  organization_id?: string | null;
}

interface ProjectListProps {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  onSelectProject: (projectId: string, projectName: string) => void;
  organizationId?: string;
}

interface BackendProject {
  project_id?: string;
  id?: string;
  project_name?: string;
  name?: string;
  project_description?: string | null;
  description?: string | null;
  project_label?: string | null;
  tag?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  chatbots_count?: number;
  users_count?: number;
  organization_id?: string;
}

// Sin datos mock - siempre cargar desde el backend

export default function ProjectList({ showNotification, onSelectProject, organizationId }: ProjectListProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateChatbotModal, setShowCreateChatbotModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isCreatingChatbot, setIsCreatingChatbot] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tag: ''
  });
  const [chatbotFormData, setChatbotFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'chatbot',
    projectId: ''
  });
  const { applyThemeClass } = useThemeMode();
  
  // Plan limits check
  const { currentPlan, canCreate, getUsage } = usePlanLimits();
  const { modalState, showUpgradeModal, setModalOpen } = usePricingUpgradeModal();

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const authData = localStorage.getItem('evolve-auth');

      if (!authData) {
        console.warn('No hay sesión activa');
        setProjects([]);
        setLoading(false);
        return;
      }

      const auth = JSON.parse(authData);
      const token = auth.accessToken;

      // Cargar proyectos con estadísticas reales filtradas por el contexto del admin
      const url = organizationId
        ? `/api/admin-client/projects?organizationId=${organizationId}`
        : '/api/admin-client/projects';

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        const projectsFromBackend: BackendProject[] = Array.isArray(data.projects) ? data.projects : [];

        // Mapear los datos del endpoint al formato de Project
        const mappedProjects = projectsFromBackend.map((project) => ({
          id: project.project_id || project.id || '',
          name: project.project_name || project.name || 'Proyecto sin nombre',
          description: project.project_description ?? project.description ?? null,
          tag: project.project_label ?? project.tag ?? null,
          is_active: project.is_active !== undefined ? project.is_active : true,
          created_at: project.created_at || new Date().toISOString(),
          updated_at: project.updated_at || new Date().toISOString(),
          chatbots_count: project.chatbots_count ?? 0,
          users_count: project.users_count ?? 0,
          organization_id: project.organization_id ?? organizationId ?? null,
        }));

        // Filtrar duplicados por project_id
        const uniqueProjects = Array.from(
          new Map(mappedProjects.map((p: Project) => [p.id, p])).values()
        ) as Project[];

        setProjects(uniqueProjects);
      } else {
        console.warn('⚠️ No se pudieron cargar proyectos:', data.message);
        setProjects([]);
      }
    } catch (error) {
      console.error('Error cargando proyectos:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Cargar proyectos
  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async () => {
    if (!formData.name.trim()) {
      showNotification('error', 'El nombre del proyecto es requerido');
      return;
    }

    if (!organizationId) {
      showNotification('error', 'Se requiere una organización para crear un proyecto');
      return;
    }

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        showNotification('error', 'Sesión expirada');
        return;
      }

      setIsCreatingProject(true);

      const auth = JSON.parse(authData);
      const token = auth.accessToken;

      // NOTA: Este endpoint del backend Python anteriormente fallaba porque
      // el stored procedure `spu_minddash_app_insert_project` no existía.
      // Verificar con backend si el problema persiste.
      const response = await fetch('/api/backend/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: organizationId,
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          label: formData.tag?.trim() || null,
          label_color: null
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Proyecto creado exitosamente');
        setShowCreateModal(false);
        setFormData({ name: '', description: '', tag: '' });

        // Delay para que el backend propague los cambios
        await new Promise(resolve => setTimeout(resolve, 2000));
        await loadProjects();
      } else {
        // Mostrar mensaje de error legible
        let errorMsg = data.message || 'Error al crear proyecto';

        // Si hay detalles, mostrarlos en consola pero resumir para el usuario
        if (data.details) {
          console.error('Detalles del error:', data.details);
        }

        // Detectar error específico del stored procedure faltante
        if (errorMsg.includes('spu_minddash_app_insert_project') || errorMsg.includes('does not exist')) {
          errorMsg = 'Error del servidor: Funcionalidad no disponible temporalmente. Por favor contacta al equipo de backend.';
        }

        showNotification('error', errorMsg);
      }
    } catch (error) {
      console.error('Error creando proyecto:', error);
      showNotification('error', 'Error de conexión al crear proyecto');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !formData.name.trim()) {
      showNotification('error', 'El nombre del proyecto es requerido');
      return;
    }

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;
      const auth = JSON.parse(authData);
      const token = auth.accessToken;

      setIsUpdatingProject(true);

      const response = await fetch(`/api/admin-client/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          label: formData.tag?.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.project) {
          const updated = data.project;

          setProjects((prev) =>
            prev.map((p) =>
              p.id === updated.id
                ? {
                    ...p,
                    name: updated.name,
                    description: updated.description,
                    tag: updated.label,
                    updated_at: updated.updated_at || new Date().toISOString(),
                  }
                : p
            )
          );
        } else {
          await loadProjects();
        }

        showNotification('success', 'Proyecto actualizado exitosamente');
        setShowEditModal(false);
        setSelectedProject(null);
        setFormData({ name: '', description: '', tag: '' });
      } else {
        showNotification('error', data.message || 'Error al actualizar proyecto');
      }
    } catch (error) {
      console.error('Error actualizando proyecto:', error);
      showNotification('error', 'Error al actualizar proyecto');
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setSelectedProject(projects.find(p => p.id === projectId) || null);
    setShowDeleteModal(true);
  };

  const confirmDeleteProject = async () => {
    if (!selectedProject || isDeletingProject) return;

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        showNotification('error', 'Sesión expirada');
        return;
      }
      const auth = JSON.parse(authData);
      const token = auth.accessToken;

      setIsDeletingProject(true);

      const response = await fetch(`/api/admin-client/projects/${selectedProject.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Error del servidor:', data);
        showNotification('error', data.message || 'Error al eliminar proyecto');
        return;
      }

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Proyecto eliminado exitosamente');
        setShowDeleteModal(false);
        setSelectedProject(null);
        await loadProjects();
      } else {
        showNotification('error', data.message || 'Error al eliminar proyecto');
      }
    } catch (error: any) {
      console.error('Error eliminando proyecto:', error);
      showNotification('error', error.message || 'Error al eliminar proyecto');
    } finally {
      setIsDeletingProject(false);
    }
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      tag: project.tag || ''
    });
    setShowEditModal(true);
  };

  const handleCreateChatbot = async () => {
    if (!chatbotFormData.nombre.trim() || isCreatingChatbot) {
      if (!chatbotFormData.nombre.trim()) {
        toast.error('El nombre del chatbot es requerido');
      }
      return;
    }

    if (!chatbotFormData.projectId) {
      toast.error('Debes seleccionar un proyecto');
      return;
    }

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }

      const auth = JSON.parse(authData);
      const token = auth.accessToken;

      setIsCreatingChatbot(true);

      await toast.promise(
        fetch('/api/admin-client/chatbots', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: chatbotFormData.nombre,
            descripcion: chatbotFormData.descripcion,
            tipo: chatbotFormData.tipo,
            project_id: chatbotFormData.projectId
          }),
        }).then(async (response) => {
          const data = await response.json();

          if (!data.success) {
            throw new Error(data.message || 'Error al crear chatbot');
          }

          setShowCreateChatbotModal(false);
          setChatbotFormData({ nombre: '', descripcion: '', tipo: 'chatbot', projectId: '' });
          await loadProjects();
          return data;
        }),
        {
          loading: 'Creando chatbot...',
          success: 'Chatbot creado exitosamente',
          error: (err) => err.message || 'Error al crear chatbot'
        }
      );
    } catch (error) {
      console.error('Error creando chatbot:', error);
      toast.error('Error al crear chatbot');
    } finally {
      setIsCreatingChatbot(false);
    }
  };
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (project.tag && project.tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getTagColor = (tag: string | null) => {
    if (!tag) {
      return applyThemeClass('bg-gray-900/50 text-gray-300', 'bg-gray-100 text-gray-700');
    }

    const darkTokens: Record<string, string> = {
      'Recursos Humanos': 'bg-blue-900/50 text-blue-300',
      'Atención al Cliente': 'bg-green-900/50 text-green-300',
      'Soporte Técnico': 'bg-yellow-900/50 text-yellow-300',
      'Ventas': 'bg-red-900/50 text-red-300',
      'Educación': 'bg-indigo-900/50 text-indigo-300',
    };

    const lightTokens: Record<string, string> = {
      'Recursos Humanos': 'bg-blue-100 text-blue-700',
      'Atención al Cliente': 'bg-green-100 text-green-700',
      'Soporte Técnico': 'bg-yellow-100 text-yellow-700',
      'Ventas': 'bg-red-100 text-red-700',
      'Educación': 'bg-indigo-100 text-indigo-700',
    };

    const darkClass = darkTokens[tag] || 'bg-purple-900/50 text-purple-300';
    const lightClass = lightTokens[tag] || 'bg-purple-100 text-purple-700';

    return applyThemeClass(darkClass, lightClass);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className="ml-3 text-gray-400">Cargando proyectos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-2xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>Proyectos</h2>
          <p className={`${applyThemeClass('text-gray-400', 'text-gray-600')} mt-1`}>
            Gestiona tus proyectos y chatbots organizados
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              // Check plan limits before creating project
              if (!canCreate('projects')) {
                showUpgradeModal(
                  'projects',
                  currentPlan?.id || 'free',
                  getUsage('projects')
                );
                return;
              }
              setFormData({ name: '', description: '', tag: '' });
              setShowCreateModal(true);
            }}
            data-tour="create-project"
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proyecto</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              // Check plan limits before creating chatbot
              if (!canCreate('chatbots')) {
                showUpgradeModal(
                  'chatbots',
                  currentPlan?.id || 'free',
                  getUsage('chatbots')
                );
                return;
              }
              setChatbotFormData({ nombre: '', descripcion: '', tipo: 'chatbot', projectId: '' });
              setShowCreateChatbotModal(true);
            }}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Bot className="w-4 h-4" />
            <span>Nuevo Chatbot</span>
          </motion.button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-xs">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${applyThemeClass('text-gray-400', 'text-gray-500')}`} />
          <input
            type="text"
            placeholder="Buscar proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={applyThemeClass(
                    'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors',
                    'w-full bg-white border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors'
                  )
            }
          />
        </div>
      </div>

      {/* Tabla de proyectos */}
      <div className={applyThemeClass('overflow-x-auto rounded-lg border border-minddash-border bg-minddash-card', 'overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm')
      }>
        <table className={`w-full text-left text-sm ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>
          <thead className={applyThemeClass('bg-minddash-elevated text-xs text-gray-300 uppercase tracking-wider', 'bg-gray-50 text-xs text-gray-600 uppercase tracking-wider')}>
            <tr>
              <th className={`px-6 py-3 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>Nombre del Proyecto</th>
              <th className={`px-6 py-3 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>Descripción</th>
              <th className={`px-6 py-3 text-center ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>Chatbots</th>
              <th className={`px-6 py-3 text-center ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>Usuarios</th>
              <th className={`px-6 py-3 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>Etiqueta</th>
              <th className={`px-6 py-3 text-right ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <FolderKanban className={`w-16 h-16 mx-auto mb-4 ${applyThemeClass('text-gray-600', 'text-gray-400')}`} />
                  <h3 className={`text-lg font-medium mb-2 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
                    {searchTerm ? 'No se encontraron proyectos' : 'No hay proyectos'}
                  </h3>
                  <p className={`${applyThemeClass('text-gray-500', 'text-gray-500')} mb-4`}>
                    {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea tu primer proyecto para comenzar'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Crear Primer Proyecto
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredProjects.map((project, index) => (
                <motion.tr
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  data-tour={index === 0 ? "project-card" : undefined}
                  className={applyThemeClass(
                          'border-b border-minddash-border hover:bg-minddash-elevated transition-colors',
                          'border-b border-gray-200 hover:bg-gray-50 transition-colors'
                        )
                  }
                  onClick={() => onSelectProject(project.id, project.name)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className={applyThemeClass(
                        'h-10 w-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center',
                        'h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center'
                      )}>
                        <FolderKanban className={applyThemeClass('w-5 h-5 text-green-400', 'w-5 h-5 text-green-600')} />
                      </div>
                      <div>
                        <p className={`font-semibold ${applyThemeClass('text-white', 'text-gray-900')}`}>{project.name}</p>
                        {project.description && (
                          <p className={`text-sm mt-1 line-clamp-2 ${applyThemeClass('text-gray-500', 'text-gray-600')}`}>
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {project.description ? (
                      <p className={`text-sm line-clamp-2 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
                        {project.description}
                      </p>
                    ) : (
                      <span className={applyThemeClass('text-gray-500 text-sm', 'text-gray-400 text-sm')}>
                        Sin descripción
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`flex items-center justify-center space-x-1 ${applyThemeClass('text-gray-200', 'text-gray-700')}`}>
                      <MessageCircle className="w-4 h-4" />
                      <span className={applyThemeClass('text-white', 'text-gray-900')}>{project.chatbots_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`flex items-center justify-center space-x-1 ${applyThemeClass('text-gray-200', 'text-gray-700')}`}>
                      <Users className="w-4 h-4" />
                      <span className={applyThemeClass('text-white', 'text-gray-900')}>{project.users_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTagColor(project.tag)}`}>
                      {project.tag || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(project);
                        }}
                        className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        title="Editar proyecto"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                        title="Eliminar proyecto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear Proyecto */}
      <ModalPortal>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={applyThemeClass(
                    'bg-minddash-card border border-minddash-border rounded-xl p-6 max-w-md w-full mx-4',
                    'bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full mx-4'
                  )
            }
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={applyThemeClass('text-lg font-semibold text-white', 'text-lg font-semibold text-gray-900')}>Crear Nuevo Proyecto</h3>
              <button
                onClick={() => {
                  if (isCreatingProject) return;
                  setShowCreateModal(false);
                }}
                disabled={isCreatingProject}
                className={cn(
                  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  applyThemeClass('text-gray-400 hover:text-white', 'text-gray-600 hover:text-gray-900')
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={applyThemeClass(
                          'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors',
                          'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors'
                        )
                  }
                  placeholder="Ej: Proyecto Alpha"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className={applyThemeClass(
                          'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors resize-none',
                          'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors resize-none'
                        )
                  }
                  placeholder="Descripción del proyecto..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Etiqueta
                </label>
                <Select value={formData.tag || undefined} onValueChange={(next) => setFormData({ ...formData, tag: next })}>
                  <SelectTrigger
                    className={applyThemeClass(
                            'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors',
                            'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors'
                          )
                    }
                  >
                    <SelectValue placeholder="Selecciona una etiqueta" />
                  </SelectTrigger>
                  <SelectContent className={applyThemeClass('bg-minddash-card border border-minddash-border', 'bg-white border border-gray-200')}>
                    <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                    <SelectItem value="Atención al Cliente">Atención al Cliente</SelectItem>
                    <SelectItem value="Soporte Técnico">Soporte Técnico</SelectItem>
                    <SelectItem value="Ventas">Ventas</SelectItem>
                    <SelectItem value="Educación">Educación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  if (isCreatingProject) return;
                  setShowCreateModal(false);
                }}
                disabled={isCreatingProject}
                className={cn(
                  'px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  applyThemeClass('text-gray-400 hover:text-white', 'text-gray-600 hover:text-gray-900')
                )}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProject}
                disabled={isCreatingProject || !formData.name.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreatingProject ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creando...</span>
                  </>
                ) : (
                  'Crear Proyecto'
                )}
              </button>
            </div>
          </motion.div>
        </div>
        )}
      </ModalPortal>

      {/* Modal Editar Proyecto */}
      <ModalPortal>
        {showEditModal && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={applyThemeClass(
                    'bg-minddash-card border border-minddash-border rounded-xl p-6 max-w-md w-full mx-4',
                    'bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full mx-4'
                  )
            }
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={applyThemeClass('text-lg font-semibold text-white', 'text-lg font-semibold text-gray-900')}>Editar Proyecto</h3>
              <button
                onClick={() => {
                  if (isUpdatingProject) return;
                  setShowEditModal(false);
                  setSelectedProject(null);
                }}
                disabled={isUpdatingProject}
                className={cn(
                  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  applyThemeClass('text-gray-400 hover:text-white', 'text-gray-600 hover:text-gray-900')
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={applyThemeClass(
                          'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors',
                          'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors'
                        )
                  }
                  placeholder="Ej: Proyecto Alpha"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className={applyThemeClass(
                          'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors resize-none',
                          'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors resize-none'
                        )
                  }
                  placeholder="Descripción del proyecto..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Etiqueta
                </label>
                <Select value={formData.tag || undefined} onValueChange={(next) => setFormData({ ...formData, tag: next })}>
                  <SelectTrigger
                    className={applyThemeClass(
                            'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors',
                            'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors'
                          )
                    }
                  >
                    <SelectValue placeholder="Selecciona una etiqueta" />
                  </SelectTrigger>
                  <SelectContent className={applyThemeClass('bg-minddash-card border border-minddash-border', 'bg-white border border-gray-200')}>
                    <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                    <SelectItem value="Atención al Cliente">Atención al Cliente</SelectItem>
                    <SelectItem value="Soporte Técnico">Soporte Técnico</SelectItem>
                    <SelectItem value="Ventas">Ventas</SelectItem>
                    <SelectItem value="Educación">Educación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  if (isUpdatingProject) return;
                  setShowEditModal(false);
                  setSelectedProject(null);
                }}
                disabled={isUpdatingProject}
                className={cn(
                  'px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  applyThemeClass('text-gray-400 hover:text-white', 'text-gray-600 hover:text-gray-900')
                )}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateProject}
                disabled={
                  isUpdatingProject ||
                  !formData.name.trim() ||
                  (formData.name === selectedProject.name &&
                   formData.description === (selectedProject.description || '') &&
                   formData.tag === (selectedProject.tag || ''))
                }
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUpdatingProject ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </motion.div>
        </div>
        )}
      </ModalPortal>

      {/* Modal Crear Chatbot */}
      <ModalPortal>
        <AnimatePresence>
          {showCreateChatbotModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={applyThemeClass(
                      'bg-minddash-card border border-minddash-border rounded-xl p-6 max-w-lg w-full mx-4',
                      'bg-white border border-gray-200 rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl'
                    )
              }
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${applyThemeClass('text-white', 'text-gray-900')}`}>
                  Crear Nuevo Chatbot
                </h3>
                <button
                  onClick={() => {
                    setShowCreateChatbotModal(false);
                    setChatbotFormData({ nombre: '', descripcion: '', tipo: 'chatbot', projectId: '' });
                  }}
                  className={applyThemeClass('text-gray-400 hover:text-white transition-colors', 'text-gray-500 hover:text-gray-900 transition-colors')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>
                    Nombre del Chatbot *
                  </label>
                  <input
                    type="text"
                    value={chatbotFormData.nombre}
                    onChange={(e) => setChatbotFormData({ ...chatbotFormData, nombre: e.target.value })}
                    className={applyThemeClass(
                            'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors',
                            'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors'
                          )
                    }
                    placeholder="Ej: Asistente Virtual"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>
                    Proyecto *
                  </label>
                  <Select value={chatbotFormData.projectId || undefined} onValueChange={(next) => setChatbotFormData({ ...chatbotFormData, projectId: next })}>
                    <SelectTrigger
                      className={applyThemeClass(
                              'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors',
                              'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors'
                            )
                      }
                    >
                      <SelectValue placeholder="Selecciona un proyecto" />
                    </SelectTrigger>
                    <SelectContent className={applyThemeClass('bg-minddash-card border border-minddash-border', 'bg-white border border-gray-200')}>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>
                    Descripción
                  </label>
                  <textarea
                    value={chatbotFormData.descripcion}
                    onChange={(e) => setChatbotFormData({ ...chatbotFormData, descripcion: e.target.value })}
                    rows={3}
                    className={applyThemeClass(
                            'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors resize-none',
                            'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors resize-none'
                          )
                    }
                    placeholder="Descripción del chatbot..."
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>
                    Tipo de Chatbot
                  </label>
                  <Select value={chatbotFormData.tipo} onValueChange={(next) => setChatbotFormData({ ...chatbotFormData, tipo: next })}>
                    <SelectTrigger
                      className={applyThemeClass(
                              'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors',
                              'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors'
                            )
                      }
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={applyThemeClass('bg-minddash-card border border-minddash-border', 'bg-white border border-gray-200')}>
                      <SelectItem value="chatbot">Chatbot - Asistente conversacional</SelectItem>
                      <SelectItem value="api">API - Integración de sistemas</SelectItem>
                      <SelectItem value="web">Web App - Aplicación web</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateChatbotModal(false);
                    setChatbotFormData({ nombre: '', descripcion: '', tipo: 'chatbot', projectId: '' });
                  }}
                  disabled={isCreatingChatbot}
                  className={cn(
                    'px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    applyThemeClass('text-gray-400 hover:text-white', 'text-gray-600 hover:text-gray-900')
                  )}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateChatbot}
                  disabled={isCreatingChatbot || !chatbotFormData.nombre.trim() || !chatbotFormData.projectId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreatingChatbot ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    'Crear Chatbot'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal de Confirmación de Eliminación */}
      <ModalPortal>
        <AnimatePresence>
          {showDeleteModal && selectedProject && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={applyThemeClass(
                      'bg-minddash-card rounded-xl p-6 max-w-md w-full border border-minddash-border',
                      'bg-white rounded-xl p-6 max-w-md w-full border border-gray-200'
                    )
              }
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={applyThemeClass('text-xl font-semibold text-white', 'text-xl font-semibold text-gray-900')}>
                  Confirmar Eliminación
                </h3>
                <button
                  onClick={() => {
                    if (isDeletingProject) return;
                    setShowDeleteModal(false);
                    setSelectedProject(null);
                  }}
                  disabled={isDeletingProject}
                  className={applyThemeClass('text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed', 'text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed')}
                >
                  <X size={24} />
                </button>
              </div>

              <div className={applyThemeClass('text-gray-300 mb-6', 'text-gray-600 mb-6')}>
                <p className="mb-2">
                  ¿Estás seguro de que deseas eliminar el proyecto <strong className={applyThemeClass('text-white', 'text-gray-900')}>{selectedProject.name}</strong>?
                </p>
                <p className={applyThemeClass('text-sm text-gray-400', 'text-sm text-gray-500')}>
                  Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    if (isDeletingProject) return;
                    setShowDeleteModal(false);
                    setSelectedProject(null);
                  }}
                  disabled={isDeletingProject}
                  className={applyThemeClass(
                    'px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    'px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteProject}
                  disabled={isDeletingProject}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeletingProject ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    'Eliminar'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Pricing Upgrade Modal */}
      <PricingUpgradeModal
        open={modalState.open}
        onOpenChange={setModalOpen}
        limitType={modalState.limitType}
        currentPlanId={modalState.currentPlanId}
        currentUsage={modalState.currentUsage}
        onSelectPlan={(plan) => {
          showNotification('info', `Para actualizar al plan ${plan.name}, ve a Configuración > Facturación`);
          router.push('/dashboard/admin/settings');
        }}
      />
    </div>
  );
}
