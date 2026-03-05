'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiEdit, FiPlus, FiShield, FiX, FiTrash2, FiUser } from '@/lib/icons';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import ModalPortal from '@/components/ui/ModalPortal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchRuntimeConfig } from '@/hooks/useRuntimeConfig';

interface Permission {
  id: string;
  user_id: string;
  product_id: string;
  role_id: string;
  userName: string;
  userEmail: string;
  roleName: string;
  roleDescription?: string;
  created_at: string;
  updated_at?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
}

interface Role {
  id: string;
  name: string;
  type_role: string;
  description?: string;
}

interface ProjectPermissionsProps {
  projectId: string;
  projectName: string;
  productId: string;
}

export default function ProjectPermissions({ projectId, projectName, productId }: ProjectPermissionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const [formData, setFormData] = useState({
    user_id: '',
    role_id: ''
  });

  // Cargar permisos, usuarios y roles
  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Obtener token del localStorage
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }
      
      const { accessToken: token } = JSON.parse(authData);
      
      // Cargar permisos del producto
      const permissionsRes = await fetch(`/api/admin-client/products/${productId}/permissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (permissionsRes.ok) {
        const data = await permissionsRes.json();
        setPermissions(data.permissions || []);
      }

      // Cargar usuarios disponibles
      const usersRes = await fetch('/api/admin-client/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        console.log('Usuarios cargados:', data);
        setUsers(data.users || []);
      } else {
        console.error('Error cargando usuarios:', usersRes.status, await usersRes.text());
      }

      // Cargar roles disponibles
      const rolesRes = await fetch('/api/admin-client/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (permission?: Permission) => {
    if (permission) {
      setEditingPermission(permission);
      setFormData({
        user_id: permission.user_id,
        role_id: permission.role_id
      });
    } else {
      setEditingPermission(null);
      setFormData({ user_id: '', role_id: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPermission(null);
    setFormData({ user_id: '', role_id: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.user_id || !formData.role_id) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }
      
      const { accessToken: token } = JSON.parse(authData);
      const cfg = await fetchRuntimeConfig();
      const backendUrl = cfg.backendApiUrl || process.env.NEXT_PUBLIC_BACKEND_API_URL;

      if (editingPermission) {
        // Actualizar permiso existente
        const response = await fetch(`${backendUrl}/products/updateAccessProduct`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id: editingPermission.id,
            user_id: editingPermission.user_id,
            product_id: productId,
            role_id: formData.role_id
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error del backend:', errorData);
          throw new Error(errorData.detail || 'Error al actualizar permiso');
        }
        toast.success('Permiso actualizado exitosamente');
      } else {
        // Crear nuevo permiso
        const response = await fetch(`${backendUrl}/products/sendAccessProduct`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            user_id: formData.user_id,
            product_id: productId,
            role_id: formData.role_id
          })
        });

        if (!response.ok) throw new Error('Error al crear permiso');
        toast.success('Permiso creado exitosamente');
      }

      handleCloseModal();
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al guardar el permiso');
    }
  };

  const handleDelete = async (permissionId: string) => {
    const confirmed = await confirm({
      title: 'Eliminar permiso',
      description: '¿Estás seguro de eliminar este permiso? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }
      
      const { accessToken: token } = JSON.parse(authData);
      const cfg = await fetchRuntimeConfig();
      const backendUrl = cfg.backendApiUrl || process.env.NEXT_PUBLIC_BACKEND_API_URL;

      const response = await fetch(`${backendUrl}/products/deleteAccessProduct`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_access_id: permissionId
        })
      });

      if (!response.ok) throw new Error('Error al eliminar permiso');
      
      toast.success('Permiso eliminado exitosamente');
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al eliminar el permiso');
    }
  };

  const filteredPermissions = permissions.filter((permission) =>
    permission.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.roleName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular estadísticas
  const totalUsers = permissions.length;
  const adminCount = permissions.filter(p => p.roleName?.toLowerCase().includes('admin')).length;
  const editorCount = permissions.filter(p => p.roleName?.toLowerCase().includes('editor') || p.roleName?.toLowerCase().includes('edit')).length;

  const getRoleBadgeColor = (roleName: string) => {
    const role = roleName?.toLowerCase() || '';
    if (role.includes('admin')) return 'bg-red-900/50 text-red-300';
    if (role.includes('editor') || role.includes('edit')) return 'bg-blue-900/50 text-blue-300';
    if (role.includes('viewer') || role.includes('view')) return 'bg-gray-700 text-gray-300';
    return 'bg-purple-900/50 text-purple-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header con búsqueda y botón agregar */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="ml-4 flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          <span>Agregar Permiso</span>
        </button>
      </div>

      {/* Información sobre permisos */}
      <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FiShield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-300 mb-1">Niveles de Acceso</h4>
            <p className="text-xs text-gray-400">
              <strong className="text-gray-300">Chatbot:</strong> Acceso completo al chatbot específico. 
              <strong className="text-gray-300 ml-3">Project:</strong> Acceso a todos los chatbots del proyecto. 
              <strong className="text-gray-300 ml-3">Client:</strong> Acceso a todos los proyectos del cliente.
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de permisos */}
      <div className="overflow-x-auto rounded-lg border border-minddash-border bg-minddash-surface">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-minddash-elevated text-xs text-gray-300 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Usuario</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Rol</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredPermissions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <FiShield className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">
                    {searchTerm ? 'No se encontraron permisos' : 'No hay permisos configurados'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Agrega el primer permiso para este proyecto'}
                  </p>
                  {!searchTerm && (
                    <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors">
                      Agregar Primer Permiso
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredPermissions.map((permission, index) => (
                <motion.tr
                  key={permission.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-t border-minddash-border hover:bg-minddash-elevated transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <FiUser className="w-4 h-4 text-gray-400" />
                      <span>{permission.userName || 'Sin nombre'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {permission.userEmail || 'Sin email'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(permission.roleName)}`}>
                      {permission.roleName || 'Sin rol'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleOpenModal(permission)}
                        className="inline-flex items-center space-x-1 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      >
                        <FiEdit className="w-4 h-4" />
                        <span className="text-sm">Editar</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(permission.id)}
                        className="inline-flex items-center space-x-1 p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        <span className="text-sm">Eliminar</span>
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Resumen de permisos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-minddash-border p-4">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total de Usuarios</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
        </div>
        <div className="bg-gray-50 dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-minddash-border p-4">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Administradores</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{adminCount}</p>
        </div>
        <div className="bg-gray-50 dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-minddash-border p-4">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Editores</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{editorCount}</p>
        </div>
      </div>

      {/* Modal para agregar/editar permiso */}
      <ModalPortal>
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
              onClick={handleCloseModal}
            >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-minddash-elevated rounded-lg border border-minddash-border p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingPermission ? 'Editar Permiso' : 'Agregar Permiso'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingPermission && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Usuario <span className="text-red-400">*</span>
                    </label>
                    <Select value={formData.user_id || undefined} onValueChange={(next) => setFormData({ ...formData, user_id: next })}>
                      <SelectTrigger className="w-full bg-gray-800/50 border-gray-700 text-white">
                        <SelectValue placeholder="Selecciona un usuario" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700 text-white">
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.username} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rol <span className="text-red-400">*</span>
                  </label>
                  <Select value={formData.role_id || undefined} onValueChange={(next) => setFormData({ ...formData, role_id: next })}>
                    <SelectTrigger className="w-full bg-gray-800/50 border-gray-700 text-white">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white">
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name} {role.description && `- ${role.description}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    {editingPermission ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {ConfirmDialog}
    </motion.div>
  );
}
