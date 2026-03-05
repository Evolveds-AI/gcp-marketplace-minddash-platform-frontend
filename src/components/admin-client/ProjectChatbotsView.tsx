'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiPlus, FiEye, FiMessageSquare, FiUsers, FiTrendingUp, FiChevronLeft, FiX, FiEdit2, FiTrash2 } from '@/lib/icons';
import { AlertTriangle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import ModalPortal from '@/components/ui/ModalPortal';
import { useThemeMode } from '@/hooks/useThemeMode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProjectChatbotsViewProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
  onSelectChatbot: (chatbotId: string) => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface Chatbot {
  id: string;
  name: string;
  description: string | null;
  tipo: string | null;
  mensajes_mes: number;
  created_at: string;
  updated_at: string;
}

interface ProjectStats {
  total_chatbots: number;
  total_users: number;
  total_messages: number;
}

interface ProductPermission {
  id: string;
  user_id: string;
  product_id: string;
  role_id: string;
  userName: string;
  userEmail: string;
  roleName: string;
  roleDescription: string;
  created_at: string;
  updated_at: string | null;
}

interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  label: string | null;
  stats: ProjectStats;
  products: Chatbot[];
}

const PRODUCT_TYPES = [
  { value: 'chatbot', label: 'Chatbot conversacional' },
  { value: 'api', label: 'Servicio API' },
  { value: 'web', label: 'Aplicación web' },
];

export default function ProjectChatbotsView({
  projectId,
  projectName,
  onBack,
  onSelectChatbot,
  showNotification
}: ProjectChatbotsViewProps) {
  const pathname = usePathname();
  const { applyThemeClass } = useThemeMode();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [stats, setStats] = useState<ProjectStats>({ total_chatbots: 0, total_users: 0, total_messages: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteDependenciesModal, setShowDeleteDependenciesModal] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);
  const [isCreatingChatbot, setIsCreatingChatbot] = useState(false);
  const [isUpdatingChatbot, setIsUpdatingChatbot] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dependencyPermissions, setDependencyPermissions] = useState<ProductPermission[]>([]);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(false);
  const [dependencyAction, setDependencyAction] = useState<'unassign' | 'reassign'>('unassign');
  const [reassignTargetChatbotId, setReassignTargetChatbotId] = useState<string>('');
  const [isResolvingDependencies, setIsResolvingDependencies] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tipo: 'chatbot',
  });

  useEffect(() => {
    loadChatbots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadChatbots = async () => {
    try {
      setLoading(true);
      
      // Datos demo para proyectos
      if (projectId.startsWith('demo-')) {
        const mockChatbots: Chatbot[] = [
          {
            id: 'chatbot-1',
            name: 'Asistente de Ventas',
            description: 'Chatbot diseñado para ayudar al equipo de ventas',
            tipo: 'Ventas',
            mensajes_mes: 1500,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'chatbot-2',
            name: 'Bot de Soporte',
            description: 'Asistente para atención al cliente',
            tipo: 'Soporte',
            mensajes_mes: 800,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'chatbot-3',
            name: 'Asistente de Marketing',
            description: 'Bot especializado en campañas de marketing',
            tipo: 'Marketing',
            mensajes_mes: 450,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        const mockStats: ProjectStats = {
          total_chatbots: mockChatbots.length,
          total_users: 0,
          total_messages: mockChatbots.reduce((sum, c) => sum + c.mensajes_mes, 0),
        };

        setChatbots(mockChatbots);
        setStats(mockStats);
        setLoading(false);
        return;
      }

      const authData = localStorage.getItem('evolve-auth');
      
      if (!authData) {
        showNotification('error', 'No se encontró token de autenticación');
        setLoading(false);
        return;
      }

      const auth = JSON.parse(authData);
      const token = auth.accessToken;

      // Cargar chatbots del proyecto
      const response = await fetch(`/api/admin-client/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data?.message || 'Error al cargar chatbots';
        showNotification('error', message);
        setChatbots([]);
        setStats({ total_chatbots: 0, total_users: 0, total_messages: 0 });
        setLoading(false);
        return;
      }

      const projectData: ProjectResponse | undefined = data.project;
      if (projectData) {
        setChatbots(Array.isArray(projectData.products) ? projectData.products : []);
        setStats(projectData.stats || { total_chatbots: 0, total_users: 0, total_messages: 0 });
      } else {
        setChatbots([]);
        setStats({ total_chatbots: 0, total_users: 0, total_messages: 0 });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error cargando chatbots:', error);
      showNotification('error', 'Error al cargar los chatbots del proyecto');
      setChatbots([]);
      setStats({ total_chatbots: 0, total_users: 0, total_messages: 0 });
      setLoading(false);
    }
  };

  const handleCreateChatbot = async () => {
    if (!formData.name.trim() || isCreatingChatbot) {
      if (!formData.name.trim()) {
        showNotification('error', 'El nombre del chatbot es requerido');
      }
      return;
    }

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        showNotification('error', 'Sesión expirada');
        return;
      }

      setIsCreatingChatbot(true);

      const auth = JSON.parse(authData);
      const token = auth.accessToken;
      const selectedType = PRODUCT_TYPES.find((t) => t.value === formData.tipo);

      const response = await fetch('/api/backend/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          language: 'es',
          tipo: formData.tipo || 'chatbot',
          config: {},
          label: selectedType?.label || 'Chatbot',
          max_users: 100,
          is_active_rag: false,
          is_active_alerts: false,
          is_active_insight: false
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Chatbot creado exitosamente');
        setShowCreateModal(false);
        setFormData({ name: '', description: '', tipo: 'chatbot' });
        loadChatbots();
      } else {
        showNotification('error', data.message || 'Error al crear chatbot');
      }
    } catch (error) {
      console.error('Error creando chatbot:', error);
      showNotification('error', 'Error al crear el chatbot');
    } finally {
      setIsCreatingChatbot(false);
    }
  };

  const handleEditChatbot = (chatbot: Chatbot) => {
    setSelectedChatbot(chatbot);
    setFormData({
      name: chatbot.name,
      description: chatbot.description || '',
      tipo: chatbot.tipo || 'chatbot',
    });
    setShowEditModal(true);
  };

  const handleUpdateChatbot = async () => {
    if (!formData.name.trim() || !selectedChatbot || isUpdatingChatbot) {
      if (!formData.name.trim()) {
        showNotification('error', 'El nombre del chatbot es requerido');
      }
      return;
    }

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        showNotification('error', 'Sesión expirada');
        return;
      }

      setIsUpdatingChatbot(true);

      const auth = JSON.parse(authData);
      const token = auth.accessToken;
      const selectedType = PRODUCT_TYPES.find((t) => t.value === formData.tipo);

      const response = await fetch(`/api/backend/products/${selectedChatbot.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          language: 'es',
          tipo: formData.tipo || 'chatbot',
          label: selectedType?.label || 'Chatbot',
        }),
      });

      const data = await response.json();

      if (data.success || response.ok) {
        showNotification('success', 'Chatbot actualizado exitosamente');
        setShowEditModal(false);
        setSelectedChatbot(null);
        setFormData({ name: '', description: '', tipo: 'chatbot' });
        loadChatbots();
      } else {
        showNotification('error', data.message || 'Error al actualizar chatbot');
      }
    } catch (error) {
      console.error('Error actualizando chatbot:', error);
      showNotification('error', 'Error al actualizar el chatbot');
    } finally {
      setIsUpdatingChatbot(false);
    }
  };

  const handleDeleteChatbot = (chatbot: Chatbot) => {
    setSelectedChatbot(chatbot);
    setShowDeleteModal(true);
  };

  const getAccessToken = () => {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) return null;
    try {
      const auth = JSON.parse(authData);
      return auth.accessToken as string | undefined;
    } catch {
      return null;
    }
  };

  const isDeleteBlockedByAssignments = (message: string | undefined) => {
    if (!message) return false;
    const normalized = message.toLowerCase();
    return normalized.includes('tiene usuarios asignados');
  };

  const loadDeleteDependencies = async (productId: string, token: string) => {
    setIsLoadingDependencies(true);
    try {
      const response = await fetch(`/api/admin-client/products/${productId}/permissions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        showNotification('error', data.message || 'No se pudieron cargar las dependencias');
        setDependencyPermissions([]);
        return null;
      }

      const permissions = Array.isArray(data.permissions) ? (data.permissions as ProductPermission[]) : [];
      setDependencyPermissions(permissions);
      return permissions;
    } catch (error) {
      console.error('Error cargando dependencias de borrado:', error);
      showNotification('error', 'Error al cargar las dependencias');
      setDependencyPermissions([]);
      return null;
    } finally {
      setIsLoadingDependencies(false);
    }
  };

  const openDeleteDependenciesModal = async () => {
    if (!selectedChatbot) return;

    const token = getAccessToken();
    if (!token) {
      showNotification('error', 'Sesión expirada');
      return;
    }

    setDependencyAction('unassign');
    setReassignTargetChatbotId('');
    setDependencyPermissions([]);
    const permissions = await loadDeleteDependencies(selectedChatbot.id, token);
    if (!permissions) return;

    if (permissions.length === 0) {
      showNotification(
        'error',
        'El backend reporta dependencias, pero no se encontraron usuarios asignados para este chatbot. Recarga la página e intenta nuevamente.'
      );
      return;
    }

    setShowDeleteModal(false);
    setShowDeleteDependenciesModal(true);
  };

  const resolveDependenciesAndDelete = async () => {
    if (!selectedChatbot || isResolvingDependencies) return;

    const token = getAccessToken();
    if (!token) {
      showNotification('error', 'Sesión expirada');
      return;
    }

    if (dependencyAction === 'reassign' && !reassignTargetChatbotId) {
      showNotification('error', 'Selecciona el chatbot de destino para reasignar');
      return;
    }

    setIsResolvingDependencies(true);
    try {
      const permissions = dependencyPermissions;

      for (const permission of permissions) {
        if (dependencyAction === 'reassign') {
          const grantBody: Record<string, any> = {
            product_id: reassignTargetChatbotId,
            user_id: permission.user_id,
          };
          if (permission.role_id) {
            grantBody.role_id = permission.role_id;
          }

          const grantResponse = await fetch('/api/backend/products/access', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(grantBody),
          });

          if (!grantResponse.ok) {
            const grantData = await grantResponse.json().catch(() => null);
            const errorMsg = grantData?.message || '';
            // Si el usuario ya tiene acceso al producto destino, continuar (no es error crítico)
            const alreadyHasAccess = errorMsg.includes('ya tiene el rol') || errorMsg.includes('already has');
            if (!alreadyHasAccess) {
              showNotification('error', errorMsg || 'No se pudo reasignar uno o más usuarios');
              return;
            }
            // Si ya tiene acceso, simplemente continuar con la desasignación del producto original
          }
        }

        const revokeResponse = await fetch('/api/backend/products/access', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: permission.id, // Usar el ID del registro de acceso
          }),
        });

        if (!revokeResponse.ok) {
          const revokeData = await revokeResponse.json().catch(() => null);
          showNotification('error', revokeData?.message || 'No se pudo desasignar uno o más usuarios');
          return;
        }
      }

      const deleteResponse = await fetch(`/api/backend/products/${selectedChatbot.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const deleteData = await deleteResponse.json().catch(() => null);

      if (deleteResponse.ok && (deleteData?.success ?? true)) {
        showNotification('success', 'Chatbot eliminado exitosamente');
        setShowDeleteDependenciesModal(false);
        setSelectedChatbot(null);
        loadChatbots();
        return;
      }

      showNotification('error', deleteData?.message || 'No se pudo eliminar el chatbot');
    } catch (error) {
      console.error('Error resolviendo dependencias:', error);
      showNotification('error', 'Error al resolver dependencias');
    } finally {
      setIsResolvingDependencies(false);
    }
  };

  const confirmDeleteChatbot = async () => {
    if (!selectedChatbot || isDeleting) return;

    setIsDeleting(true);

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        showNotification('error', 'Sesión expirada');
        return;
      }

      const auth = JSON.parse(authData);
      const token = auth.accessToken;

      const response = await fetch(`/api/backend/products/${selectedChatbot.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success || response.ok) {
        showNotification('success', 'Chatbot eliminado exitosamente');
        setShowDeleteModal(false);
        setSelectedChatbot(null);
        loadChatbots();
      } else {
        if (isDeleteBlockedByAssignments(data.message)) {
          await openDeleteDependenciesModal();
        } else {
          showNotification('error', data.message || 'Error al eliminar chatbot');
        }
      }
    } catch (error) {
      console.error('Error eliminando chatbot:', error);
      showNotification('error', 'Error al eliminar el chatbot');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredChatbots = chatbots.filter((chatbot) =>
    chatbot.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (chatbot.description && chatbot.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (chatbot.tipo && chatbot.tipo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando chatbots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón volver y título */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className={`flex items-center space-x-2 transition-colors ${applyThemeClass('text-gray-400 hover:text-white', 'text-gray-600 hover:text-gray-900')}`}
          >
            <FiChevronLeft className="w-5 h-5" />
            <span>Volver a proyectos</span>
          </button>
        </div>
      </div>

      {/* Título del proyecto */}
      <div>
        <h2 className={`text-3xl font-bold mb-2 ${applyThemeClass('text-white', 'text-gray-900')}`}>{projectName}</h2>
        <p className={applyThemeClass('text-gray-400', 'text-gray-600')}>Gestiona los chatbots de este proyecto</p>
      </div>

      {/* Estadísticas */}

      {/* Barra de búsqueda y botón nuevo */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${applyThemeClass('text-gray-400', 'text-gray-500')}`} />
          <input
            type="text"
            placeholder="Buscar chatbot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={applyThemeClass(
                    'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors',
                    'w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors'
                  )
            }
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          data-tour="create-chatbot"
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          <span>Nuevo Chatbot</span>
        </button>
      </div>

      {/* Tabla de chatbots */}
      <div
        className={applyThemeClass('overflow-x-auto rounded-lg border border-minddash-border bg-minddash-card', 'overflow-x-auto rounded-lg border border-gray-200 bg-white')
        }
      >
        <table className={`w-full text-left text-sm ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
          <thead className={applyThemeClass('bg-minddash-elevated text-xs text-gray-300 uppercase tracking-wider', 'bg-gray-50 text-xs text-gray-700 uppercase tracking-wider')}>
            <tr>
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Descripción</th>
              <th className="px-6 py-3">Tipo</th>
              <th className="px-6 py-3 text-center">Usuarios</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredChatbots.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <FiMessageSquare className={`w-16 h-16 mx-auto mb-4 ${applyThemeClass('text-gray-600', 'text-gray-400')}`} />
                  <h3 className={`text-lg font-medium mb-2 ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>
                    {searchTerm ? 'No se encontraron chatbots' : 'No hay chatbots en este proyecto'}
                  </h3>
                  <p className={`mb-4 ${applyThemeClass('text-gray-500', 'text-gray-600')}`}>
                    {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea el primer chatbot para comenzar'}
                  </p>
                  {!searchTerm && (
                    <button 
                      onClick={() => setShowCreateModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors inline-flex items-center space-x-2"
                    >
                      <FiPlus className="w-4 h-4" />
                      <span>Crear Primer Chatbot</span>
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredChatbots.map((chatbot, index) => (
                <motion.tr
                  key={chatbot.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  data-tour={index === 0 ? "chatbot-card" : undefined}
                  className={applyThemeClass('border-t border-minddash-border hover:bg-minddash-elevated transition-colors', 'border-t border-gray-200 hover:bg-gray-50 transition-colors')
                  }
                >
                  <td className={`px-6 py-4 font-medium ${applyThemeClass('text-white', 'text-gray-900')}`}>
                    {chatbot.name}
                  </td>
                  <td className={`px-6 py-4 max-w-xs truncate ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
                    {chatbot.description || 'Sin descripción'}
                  </td>
                  <td className="px-6 py-4">
                    {chatbot.tipo && (
                        <span className={applyThemeClass(
                          'px-2 py-1 text-xs font-medium bg-minddash-verde-500/20 text-minddash-verde-300 rounded-full',
                          'px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full'
                        )}>
                          {chatbot.tipo}
                        </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-center ${applyThemeClass('text-white', 'text-gray-900')}`}>
                    -
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Ver Detalles */}
                      <button
                        onClick={() => onSelectChatbot(chatbot.id)}
                        className="group relative p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        title="Ver detalles"
                      >
                        <FiEye className="w-4 h-4" />
                          <span className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                            Ver detalles
                          </span>
                      </button>

                      {/* Editar */}
                      <button
                        onClick={() => handleEditChatbot(chatbot)}
                        className="group relative p-2 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        <FiEdit2 className="w-4 h-4" />
                          <span className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                            Editar
                          </span>
                      </button>

                      {/* Eliminar */}
                      <button
                        onClick={() => handleDeleteChatbot(chatbot)}
                        className="group relative p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                        title="Eliminar"
                      >
                        <FiTrash2 className="w-4 h-4" />
                          <span className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                            Eliminar
                          </span>
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear Chatbot */}
      <ModalPortal>
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-xl p-6 max-w-lg w-full mx-4', 'bg-white border border-gray-200 rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${applyThemeClass('text-white', 'text-gray-900')}`}>
                  Crear Nuevo Chatbot
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', description: '', tipo: 'chatbot' });
                  }}
                  className={applyThemeClass('text-gray-400 hover:text-white transition-colors', 'text-gray-500 hover:text-gray-900 transition-colors')}
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <p className={`text-sm mb-6 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
                Define los parámetros iniciales para tu agente de IA.
              </p>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>
                    Proyecto
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    disabled
                    className={applyThemeClass('w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-gray-500 cursor-not-allowed', 'w-full bg-gray-100 border border-gray-300 rounded-lg py-2 px-4 text-gray-500 cursor-not-allowed')}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>
                    Nombre del Chatbot *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={applyThemeClass('w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-green-500 transition-colors', 'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors')}
                    placeholder="Ej: Asistente de Soporte 2.0"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>
                    Descripción del Chatbot
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className={applyThemeClass('w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-green-500 transition-colors resize-none', 'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors resize-none')}
                    placeholder="Brevemente, ¿cuál es el propósito de este chatbot?"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>
                    Tipo de producto
                  </label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(next) =>
                      setFormData({
                        ...formData,
                        tipo: next as 'chatbot' | 'api' | 'web',
                      })
                    }
                  >
                    <SelectTrigger
                      className={applyThemeClass('w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-green-500 transition-colors', 'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors')}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={applyThemeClass('bg-minddash-elevated border border-minddash-border', 'bg-white border border-gray-200')}>
                      {PRODUCT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', description: '', tipo: 'chatbot' });
                  }}
                  className={applyThemeClass('px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed', 'px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed')}
                  disabled={isCreatingChatbot}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateChatbot}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isCreatingChatbot || !formData.name.trim()}
                >
                  {isCreatingChatbot ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    'Crear y Configurar'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal Editar Chatbot */}
      <ModalPortal>
        <AnimatePresence>
          {showEditModal && selectedChatbot && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-xl p-6 max-w-lg w-full mx-4', 'bg-white border border-gray-200 rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${applyThemeClass('text-white', 'text-gray-900')}`}>
                  Editar Chatbot
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedChatbot(null);
                    setFormData({ name: '', description: '', tipo: 'chatbot' });
                  }}
                  className={applyThemeClass('text-gray-400 hover:text-white transition-colors', 'text-gray-500 hover:text-gray-900 transition-colors')}
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <p className={`text-sm mb-6 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
                Actualiza la información de tu chatbot.
              </p>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>
                    Nombre del Chatbot *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={applyThemeClass('w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-green-500 transition-colors', 'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors')}
                    placeholder="Ej: Asistente de Soporte 2.0"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>
                    Descripción del Chatbot
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className={applyThemeClass('w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-green-500 transition-colors resize-none', 'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors resize-none')}
                    placeholder="Brevemente, ¿cuál es el propósito de este chatbot?"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-300', 'text-gray-700')}`}>
                    Tipo de producto
                  </label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(next) =>
                      setFormData({
                        ...formData,
                        tipo: next as 'chatbot' | 'api' | 'web',
                      })
                    }
                  >
                    <SelectTrigger
                      className={applyThemeClass('w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 px-4 text-white focus:outline-none focus:border-green-500 transition-colors', 'w-full bg-white border border-gray-300 rounded-lg py-2 px-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors')}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={applyThemeClass('bg-minddash-elevated border border-minddash-border', 'bg-white border border-gray-200')}>
                      {PRODUCT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedChatbot(null);
                    setFormData({ name: '', description: '', tipo: 'chatbot' });
                  }}
                  className={applyThemeClass('px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed', 'px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed')}
                  disabled={isUpdatingChatbot}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateChatbot}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={
                    isUpdatingChatbot ||
                    !formData.name.trim() ||
                    (formData.name === selectedChatbot.name &&
                     formData.description === (selectedChatbot.description || '') &&
                     formData.tipo === (selectedChatbot.tipo || 'chatbot'))
                  }
                >
                  {isUpdatingChatbot ? (
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
        </AnimatePresence>
      </ModalPortal>

      {/* Modal Confirmar Eliminación */}
      <ModalPortal>
        <AnimatePresence>
          {showDeleteModal && selectedChatbot && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={applyThemeClass('bg-minddash-card border border-red-900/50 rounded-xl p-6 max-w-md w-full mx-4', 'bg-white border border-red-200 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <FiTrash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className={`text-lg font-semibold ${applyThemeClass('text-white', 'text-gray-900')}`}>
                    Eliminar Chatbot
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedChatbot(null);
                  }}
                  className={applyThemeClass('text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed', 'text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed')}
                  disabled={isDeleting}
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <p className={`text-sm mb-4 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>
                ¿Estás seguro de que deseas eliminar el chatbot{' '}
                <span className={`font-semibold ${applyThemeClass('text-white', 'text-gray-900')}`}>&quot;{selectedChatbot.name}&quot;</span>?
              </p>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
                <p className="text-red-400 text-xs">
                  <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" aria-label="Advertencia" /> Esta acción no se puede deshacer. Se eliminarán todos los datos asociados a este chatbot.</span>
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedChatbot(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteChatbot}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
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

      <ModalPortal>
        <AnimatePresence>
          {showDeleteDependenciesModal && selectedChatbot && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={applyThemeClass('bg-minddash-card border border-red-900/50 rounded-xl p-6 max-w-lg w-full mx-4', 'bg-white border border-red-200 rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <FiUsers className="w-5 h-5 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Dependencias antes de eliminar
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      if (isResolvingDependencies) return;
                      setShowDeleteDependenciesModal(false);
                      setDependencyPermissions([]);
                    }}
                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isResolvingDependencies}
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                {dependencyPermissions.length === 0 ? (
                  <p className="text-gray-400 text-sm mb-4">
                    No se encontraron usuarios asignados para este chatbot.
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm mb-4">
                    Este chatbot tiene <span className="font-semibold text-white">{dependencyPermissions.length}</span>{' '}
                    usuario(s) asignado(s). Para poder eliminarlo, primero debes desasignarlos o reasignarlos.
                  </p>
                )}

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-xs">
                    Al continuar, se modificarán las asignaciones de usuarios.
                  </p>
                </div>

                <div className="space-y-3 mb-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="dependency-action"
                      className="mt-1"
                      checked={dependencyAction === 'unassign'}
                      onChange={() => setDependencyAction('unassign')}
                      disabled={isResolvingDependencies}
                    />
                    <div>
                      <p className="text-sm text-white font-medium">Desasignar usuarios</p>
                      <p className="text-xs text-gray-400">Quitar acceso a este chatbot a todos los usuarios listados.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="dependency-action"
                      className="mt-1"
                      checked={dependencyAction === 'reassign'}
                      onChange={() => setDependencyAction('reassign')}
                      disabled={isResolvingDependencies}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">Reasignar a otro chatbot</p>
                      <p className="text-xs text-gray-400 mb-2">Mover los usuarios a otro chatbot del mismo proyecto.</p>
                      <Select
                        value={reassignTargetChatbotId || undefined}
                        onValueChange={(next) => setReassignTargetChatbotId(next)}
                        disabled={isResolvingDependencies || dependencyAction !== 'reassign'}
                      >
                        <SelectTrigger className="w-full bg-gray-800/50 border-gray-700 text-white focus:ring-red-500 disabled:opacity-60">
                          <SelectValue placeholder="Seleccionar chatbot destino..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white">
                          {chatbots
                            .filter((c) => c.id !== selectedChatbot.id)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </label>
                </div>

                <div className="border border-gray-800 rounded-lg overflow-hidden mb-6">
                  <div className="bg-gray-900/40 px-3 py-2">
                    <p className="text-xs text-gray-300">Usuarios afectados</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {isLoadingDependencies ? (
                      <div className="p-4">
                        <p className="text-sm text-gray-400">Cargando dependencias...</p>
                      </div>
                    ) : dependencyPermissions.length === 0 ? (
                      <div className="p-4">
                        <p className="text-sm text-gray-400">No se encontraron usuarios asignados.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-800">
                        {dependencyPermissions.map((p) => (
                          <div key={p.id} className="px-3 py-2 flex items-center justify-between">
                            <div>
                              <p className="text-sm text-white">{p.userName}</p>
                              <p className="text-xs text-gray-400">{p.userEmail}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-300">{p.roleName}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteDependenciesModal(false);
                      setDependencyPermissions([]);
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isResolvingDependencies}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={resolveDependenciesAndDelete}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={isResolvingDependencies}
                  >
                    {isResolvingDependencies ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Procesando...</span>
                      </>
                    ) : (
                      'Resolver y eliminar'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </div>
  );
}
