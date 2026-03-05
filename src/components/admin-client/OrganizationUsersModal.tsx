'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUserPlus, FiEdit, FiTrash2, FiUsers, FiSearch } from '@/lib/icons';
import { useThemeMode } from '@/hooks/useThemeMode';
import { toast } from 'sonner';
import ModalPortal from '@/components/ui/ModalPortal';

interface OrganizationUsersModalProps {
  organizationId: string;
  organizationName: string;
  onClose: () => void;
}

interface OrganizationUser {
  user_id: string;
  user_name: string;
  user_email: string;
  role_id: string;
  role_name: string;
}

interface Role {
  id: string;
  name: string;
}

export default function OrganizationUsersModal({
  organizationId,
  organizationName,
  onClose
}: OrganizationUsersModalProps) {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const { applyThemeClass } = useThemeMode();

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [organizationId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;
      const auth = JSON.parse(authData);

      console.log('👥 Cargando usuarios de organización:', organizationId);

      // TODO: Crear endpoint específico /api/backend/organizations/[id]/users
      // Por ahora mostramos mensaje informativo
      toast.info('Funcionalidad de gestión de permisos en desarrollo');
      setUsers([]);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    // Roles predefinidos (pueden venir del backend)
    setRoles([
      { id: 'ee7376a8-d934-4936-91fa-2bda2949b5b8', name: 'Admin' },
      { id: '7f29f5c3-4d4e-4c9f-9e2a-8b1234567890', name: 'Admin-Client' },
      { id: '8f29f5c3-4d4e-4c9f-9e2a-8b1234567891', name: 'User' }
    ]);
  };

  const filteredUsers = users.filter(user =>
    user.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass-panel border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl bg-minddash-surface/90 overflow-hidden"
        >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/10">
                <FiUsers className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Gestión de Permisos
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  {organizationName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
              title="Cerrar"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          {/* Barra de búsqueda y botón agregar */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md group">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
              />
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 text-sm font-medium hover:scale-[1.02]"
            >
              <FiUserPlus className="w-4 h-4" />
              <span>Agregar Usuario</span>
            </button>
          </div>

          {/* Tabla de usuarios */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-xs font-medium">Cargando usuarios...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <FiUsers className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium mb-1 text-gray-300">
                {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios asignados'}
              </h3>
              <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Agrega usuarios para comenzar a gestionar sus permisos y roles.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl transition-colors inline-flex items-center space-x-2 text-sm font-medium"
                >
                  <FiUserPlus className="w-4 h-4" />
                  <span>Agregar Primer Usuario</span>
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.user_id}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white text-sm">{user.user_name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {user.user_email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {user.role_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditRoleModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Cambiar rol"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              toast.info('Función de remover acceso próximamente');
                            }}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Remover acceso"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-5 border-t border-white/10 bg-black/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/10"
          >
            Cerrar
          </button>
        </div>
        </motion.div>
      </div>
    </ModalPortal>
  );
}
