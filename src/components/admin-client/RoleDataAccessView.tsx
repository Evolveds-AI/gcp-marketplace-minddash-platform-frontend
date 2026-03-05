'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiEdit, FiPlus, FiShield, FiTrash2 } from '@/lib/icons';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import RoleDataAccessModal from './RoleDataAccessModal';

interface RoleDataAccess {
  id: string;
  product_id: string;
  name: string;
  table_names: string[];
  data_access: {
    filters?: Record<string, any>; // Old format for backward compatibility
    permissions?: string[];
    [key: string]: any; // New format: filters are stored directly as properties
  };
  metrics_access?: string[];
  user_count?: number;
  priority_level?: string;
}

interface RoleDataAccessViewProps {
  productId: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function RoleDataAccessView({ productId, showNotification }: RoleDataAccessViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roles, setRoles] = useState<RoleDataAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDataAccess | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    loadRoles();
  }, [productId]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }
      
      const { accessToken: token } = JSON.parse(authData);
      const response = await fetch('/api/backend/role-data-access', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const data = await response.json();
        const allRoles = Array.isArray(data.data) ? data.data : [];
        const rolesList = allRoles.filter((role: any) => {
          const pid = role.product_id ?? role.productId ?? null;
          return pid === productId;
        });
        const normalized = rolesList.map((role: any): RoleDataAccess => ({
          id: role.role_id ?? role.id ?? '',
          product_id: role.product_id ?? productId,
          name: role.role_name ?? role.name ?? 'Sin nombre',
          table_names: role.role_table_names ?? role.table_names ?? [],
          data_access: role.role_data_access ?? role.data_access ?? {},
          metrics_access: role.role_metrics_access ?? role.metrics_access ?? [],
          user_count: role.user_count ?? role.assigned_users ?? 0,
          priority_level: role.priority_level ?? role.level ?? undefined
        }));
        setRoles(normalized);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        console.error('⚠️ Error cargando roles:', errorData);
        
        // Si es el error de la vista faltante, mostrar mensaje específico
        if (errorData.message?.includes('view_list_roles_data_access')) {
          console.warn('⚠️ La vista view_list_roles_data_access no existe en el backend Python.');
          console.warn('⚠️ Este es un problema del backend que debe resolverse creando la vista en PostgreSQL.');
          console.warn('⚠️ El componente continuará funcionando con funcionalidad limitada.');
          // No mostrar toast de error para no molestar al usuario
        } else {
          toast.error('Error al cargar los roles');
        }
        setRoles([]);
      }
    } catch (error: any) {
      console.error('⚠️ Error cargando roles:', error);
      
      // Si es el error de la vista faltante, no mostrar toast
      if (!error.message?.includes('view_list_roles_data_access')) {
        toast.error('Error al cargar los roles');
      }
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    const confirmed = await confirm({
      title: 'Eliminar rol de acceso',
      description: '¿Estás seguro de eliminar este rol de acceso? Esta acción no se puede deshacer.',
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
      const response = await fetch(`/api/backend/role-data-access/${roleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role_data_id: roleId })
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Error al eliminar rol');
      
      toast.success('Rol eliminado exitosamente');
      loadRoles();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al eliminar el rol');
    }
  };

  const filteredRoles = Array.isArray(roles) ? roles.filter((role) =>
    role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.table_names?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  const getPriorityBadge = (level: string) => {
    const levelMap: Record<string, string> = {
      'nivel 1': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      'nivel 2': 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
      'nivel 3': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      'nivel 4': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
    };
    return levelMap[level?.toLowerCase()] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar rol por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-minddash-elevated/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors"
          />
        </div>
        <button
          onClick={() => {
            setEditingRole(null);
            setShowModal(true);
          }}
          className="ml-4 flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          <span>Nuevo Rol</span>
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-minddash-surface">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
          <thead className="bg-gray-50 dark:bg-minddash-elevated text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Nombre del Rol</th>
              <th className="px-6 py-3">Usuarios</th>
              <th className="px-6 py-3">Nivel del Rol</th>
              <th className="px-6 py-3">Métricas de Acceso</th>
              <th className="px-6 py-3">Tablas de Acceso</th>
              <th className="px-6 py-3">Filtros Personalizados</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoles.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <FiShield className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">
                    {searchTerm ? 'No se encontraron roles' : 'No hay roles configurados'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea el primer rol de acceso a datos'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => {
                        setEditingRole(null);
                        setShowModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Crear Primer Rol
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredRoles.map((role, index) => {
                // Extract filters from data_access
                // New format: filters are directly in data_access (not in data_access.filters)
                // Also handle backward compatibility with old format (data_access.filters)
                const dataAccess = role.data_access || {};
                let filters: Record<string, any> = {};
                
                if (dataAccess.filters) {
                  // Old format: data_access.filters exists
                  filters = dataAccess.filters;
                } else {
                  // New format: filters are directly in data_access
                  // Extract all properties except 'permissions'
                  filters = { ...dataAccess };
                  delete filters.permissions;
                }
                
                const filterEntries = Object.entries(filters);
                const metricsCount = role.metrics_access?.length || 0;

                return (
                  <motion.tr
                    key={`${role.id}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-minddash-elevated transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{role.name}</td>
                    <td className="px-6 py-4">
                      <span className="text-blue-400 font-semibold">{role.user_count || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityBadge(role.priority_level || '')}`}>
                        {role.priority_level || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {metricsCount > 0 ? (
                        <span className="text-green-400 font-medium">Todas</span>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {role.table_names.length > 0 ? (
                        <span className="text-green-400 font-medium">Todas</span>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {filterEntries.length > 0 ? (
                        <div className="space-y-1">
                          {filterEntries.slice(0, 2).map(([key, value], i) => {
                            // Format value for display
                            let displayValue: string;
                            if (Array.isArray(value)) {
                              displayValue = JSON.stringify(value);
                            } else if (typeof value === 'object' && value !== null) {
                              displayValue = JSON.stringify(value);
                            } else {
                              displayValue = String(value);
                            }
                            return (
                              <code key={i} className="text-xs bg-gray-100 dark:bg-minddash-elevated px-2 py-1 rounded block font-mono">
                                {key}: {displayValue}
                              </code>
                            );
                          })}
                          {filterEntries.length > 2 && (
                            <span className="text-xs text-gray-500">+{filterEntries.length - 2} más</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setEditingRole(role);
                            setShowModal(true);
                          }}
                          className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          title="Editar"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(role.id)}
                          className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                          title="Eliminar"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <RoleDataAccessModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          role={editingRole}
          productId={productId}
          onSuccess={loadRoles}
        />
      )}

      {ConfirmDialog}
    </motion.div>
  );
}
