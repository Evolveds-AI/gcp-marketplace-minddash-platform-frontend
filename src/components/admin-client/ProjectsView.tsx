'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch,
  FiFolderPlus,
  FiX,
  FiSave,
  FiAlertCircle,
  FiTag
} from '@/lib/icons';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ModalPortal from '@/components/ui/ModalPortal';
import AdminLoadingSkeleton from './AdminLoadingSkeleton';

interface Project {
  id: string;
  name: string;
  description: string | null;
  label: string | null;
  label_color: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  organizations?: {
    name: string;
  };
}

interface Organization {
  id: string;
  name: string;
}

interface ProjectsViewProps {
  productId?: string;
}

const LABEL_COLORS = [
  { name: 'Azul', value: 'blue' },
  { name: 'Verde', value: 'green' },
  { name: 'Rojo', value: 'red' },
  { name: 'Amarillo', value: 'yellow' },
  { name: 'Morado', value: 'purple' },
  { name: 'Rosa', value: 'pink' },
  { name: 'Gris', value: 'gray' }
];

export default function ProjectsView({ productId }: ProjectsViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    label: '',
    label_color: 'blue',
    organization_id: ''
  });

  useEffect(() => {
    loadProjects();
    loadOrganizations();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/backend/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const projectsData = Array.isArray(result.data) ? result.data : [];
        setProjects(projectsData);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setProjects([]);
      toast.error('Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/backend/organizations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setOrganizations(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      console.error('Error al cargar organizaciones:', error);
    }
  };

  const handleCreate = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      label: '',
      label_color: 'blue',
      organization_id: organizations[0]?.id || ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      label: project.label || '',
      label_color: project.label_color || 'blue',
      organization_id: project.organization_id || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Eliminar proyecto',
      description: '¿Estás seguro de eliminar este proyecto? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/backend/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Proyecto eliminado');
        loadProjects();
      } else {
        toast.error('Error al eliminar proyecto');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar proyecto');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingProject 
        ? `/api/backend/projects/${editingProject.id}`
        : '/api/backend/projects/create';
      
      const method = editingProject ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          label: formData.label.trim() || null,
          label_color: formData.label_color,
          organization_id: formData.organization_id || null
        })
      });

      if (response.ok) {
        toast.success(editingProject ? 'Proyecto actualizado' : 'Proyecto creado');
        setIsModalOpen(false);
        loadProjects();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al guardar proyecto');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar proyecto');
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      green: 'bg-green-500/20 text-green-400 border-green-500/30',
      red: 'bg-red-500/20 text-red-400 border-red-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiFolderPlus className="text-green-400" />
            Proyectos
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestiona los proyectos de las organizaciones
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <FiPlus /> Crear Proyecto
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar proyectos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-minddash-elevated border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Loading */}
      {loading && <AdminLoadingSkeleton variant="cards" count={6} columns={3} />}

      {/* Lista de Proyectos */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-green-500 transition-colors shadow-sm dark:shadow-none"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <FiFolderPlus className="text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{project.name}</h3>
                      {project.organizations && (
                        <p className="text-xs text-gray-500 truncate">
                          {project.organizations.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(project)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-green-500 dark:text-green-400"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-red-500 dark:text-red-400"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>

                {project.label && (
                  <div className="mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${getColorClass(project.label_color || 'blue')}`}>
                      <FiTag size={12} />
                      {project.label}
                    </span>
                  </div>
                )}

                {project.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  {new Date(project.created_at).toLocaleDateString()}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FiAlertCircle className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No se encontraron proyectos' : 'No hay proyectos creados'}
          </p>
        </div>
      )}

      {/* Modal */}
      <ModalPortal>
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
              onClick={() => setIsModalOpen(false)}
            >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-minddash-card rounded-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto shadow-xl dark:shadow-none"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Organización *
                  </label>
                  <Select value={formData.organization_id || undefined} onValueChange={(next) => setFormData({ ...formData, organization_id: next })}>
                    <SelectTrigger className="w-full bg-gray-50 dark:bg-minddash-elevated border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-green-500">
                      <SelectValue placeholder="Seleccionar organización" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-minddash-elevated border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Nombre del proyecto"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Descripción del proyecto"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Etiqueta
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Ej: Alpha, Beta"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Color
                    </label>
                    <Select value={formData.label_color} onValueChange={(next) => setFormData({ ...formData, label_color: next })}>
                      <SelectTrigger className="w-full bg-gray-50 dark:bg-minddash-elevated border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-green-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-minddash-elevated border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                        {LABEL_COLORS.map(color => (
                          <SelectItem key={color.value} value={color.value}>
                            {color.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <FiSave /> Guardar
                  </button>
                </div>
              </form>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {ConfirmDialog}
    </div>
  );
}
