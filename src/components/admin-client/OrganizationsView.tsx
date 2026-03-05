'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiX,
  FiSave,
  FiAlertCircle,
} from '@/lib/icons';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import ModalPortal from '@/components/ui/ModalPortal';
import AdminLoadingSkeleton from './AdminLoadingSkeleton';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface OrganizationsViewProps {
  productId?: string;
}

export default function OrganizationsView({ productId }: OrganizationsViewProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Cargar organizaciones
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/backend/organizations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const orgsData = Array.isArray(result.data) ? result.data : [];
        setOrganizations(orgsData);
      } else {
        console.error('Error al cargar organizaciones');
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setOrganizations([]);
      toast.error('Error al cargar organizaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingOrg(null);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      description: org.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Eliminar organización',
      description: '¿Estás seguro de eliminar esta organización? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/backend/organizations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Organización eliminada');
        loadOrganizations();
      } else {
        toast.error('Error al eliminar organización');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar organización');
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
      const url = editingOrg 
        ? `/api/backend/organizations/${editingOrg.id}`
        : '/api/backend/organizations/create';
      
      const method = editingOrg ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null
        })
      });

      if (response.ok) {
        toast.success(editingOrg ? 'Organización actualizada' : 'Organización creada');
        setIsModalOpen(false);
        loadOrganizations();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al guardar organización');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar organización');
    }
  };

  // Filtrar organizaciones
  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.description && org.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Organizaciones
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestiona las organizaciones del sistema
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <FiPlus /> Crear Organización
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar organizaciones..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-minddash-elevated border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Loading */}
      {loading && <AdminLoadingSkeleton variant="cards" count={6} columns={3} />}

      {/* Lista de Organizaciones */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredOrganizations.map((org, index) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors shadow-sm dark:shadow-none"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{org.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(org.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(org)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-blue-500 dark:text-blue-400"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(org.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-red-500 dark:text-red-400"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
                {org.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {org.description}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredOrganizations.length === 0 && (
        <div className="text-center py-12">
          <FiAlertCircle className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No se encontraron organizaciones' : 'No hay organizaciones creadas'}
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
              className="bg-white dark:bg-minddash-card rounded-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-none"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingOrg ? 'Editar Organización' : 'Nueva Organización'}
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
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre de la organización"
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
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descripción de la organización"
                    rows={3}
                  />
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
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
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
