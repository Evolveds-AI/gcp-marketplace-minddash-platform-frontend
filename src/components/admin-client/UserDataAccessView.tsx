'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiEdit, FiPlus, FiShield, FiTrash2, FiUser, FiDatabase } from '@/lib/icons';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import UserDataAccessModal from './UserDataAccessModal';
import { SortableColumn, useSortableTable } from './SortableTableHeader';
import { StatusBadge } from './StatusBadge';

interface UserDataAccess {
  id: string;
  user_id: string;
  role_data_id: string;
  table_names: string[];
  data_access: {
    filters?: Record<string, any>; // Old format for backward compatibility
    permissions?: string[];
    [key: string]: any; // New format: filters are stored directly as properties
  };
  metrics_access?: string[];
  is_active: boolean;
  userName?: string;
  userEmail?: string;
  roleDataName?: string;
  created_at: string;
  updated_at?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
}

interface RoleData {
  id: string;
  name: string;
  description?: string;
  product_id?: string;
  table_names?: string[];
  metrics_access?: string[];
}

interface UserDataAccessViewProps {
  productId: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function UserDataAccessView({ 
  productId, 
  showNotification 
}: UserDataAccessViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dataAccess, setDataAccess] = useState<UserDataAccess[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roleDataList, setRoleDataList] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccess, setEditingAccess] = useState<UserDataAccess | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const { sortedData: sortedDataAccess, sortKey: daSortKey, sortDirection: daSortDir, handleSort: handleDaSort } = useSortableTable<UserDataAccess>(dataAccess);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }
      
      const { accessToken: token } = JSON.parse(authData);
      
      // Cargar role data access del producto (se usa para filtrar y para el dropdown)
      const roleResponse = await fetch('/api/backend/role-data-access', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const roleDataResult = roleResponse.ok ? await roleResponse.json() : null;
      const allRoles = Array.isArray(roleDataResult?.data)
        ? roleDataResult.data
        : Array.isArray(roleDataResult)
          ? roleDataResult
          : [];
      const roleList = allRoles.filter((role: any) => {
        const pid = role.product_id ?? role.productId ?? null;
        return pid === productId;
      });
      const productRoleIds = new Set(roleList.map((role: any) => role.role_id ?? role.id));
      
      // Guardar en estado para el dropdown con table_names y metrics_access
      setRoleDataList(roleList.map((role: any) => ({
        id: role.role_id ?? role.id ?? '',
        name: role.role_name ?? role.name ?? 'Sin nombre',
        description: role.description ?? role.role_description ?? undefined,
        product_id: role.product_id ?? role.productId ?? productId,
        table_names: role.role_table_names ?? role.table_names ?? [],
        metrics_access: role.role_metrics_access ?? role.metrics_access ?? []
      })));
      
      // Cargar accesos de datos de usuario desde el backend Python
      const accessResponse = await fetch('/api/backend/user-data-access', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const accessResult = accessResponse.ok ? await accessResponse.json() : null;
      const accessList = Array.isArray(accessResult) ? accessResult : Array.isArray(accessResult?.data) ? accessResult.data : [];
      
      // Filtrar solo los que pertenecen a roles de este producto
      const filteredAccessList = accessList.filter((item: any) => {
        const roleId = item.role_data_id ?? item.roleDataId ?? item.role_id;
        return productRoleIds.has(roleId);
      });
      
      setDataAccess(filteredAccessList.map((item: any) => ({
        ...item,
        id: item.id ?? item.user_data_access_id ?? '',
        userName: item.userName ?? item.user_name ?? item.username ?? item.user_name_full ?? item.userName,
        userEmail: item.userEmail ?? item.user_email ?? item.email ?? item.userEmail,
        roleDataName: item.roleDataName ?? item.role_data_name ?? item.roleName ?? item.role_name,
        role_data_id: item.role_data_id ?? item.roleDataId ?? item.role_id ?? item.roleDataID ?? '',
        table_names: Array.isArray(item.table_names) ? item.table_names : Array.isArray(item.user_table_names) ? item.user_table_names : [],
        data_access: item.data_access ?? item.user_data_access ?? {},
        metrics_access: Array.isArray(item.metrics_access) ? item.metrics_access : 
                        Array.isArray(item.user_metrics_access) ? item.user_metrics_access : 
                        Array.isArray(item.role_metrics_access) ? item.role_metrics_access : []
      })));

      // Cargar usuarios disponibles
      const usersRes = await fetch('/api/admin-client/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar los datos');
      setDataAccess([]);
      setUsers([]);
      setRoleDataList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (access?: UserDataAccess) => {
    setEditingAccess(access || null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAccess(null);
  };

  const handleDelete = async (accessId: string) => {
    const confirmed = await confirm({
      title: 'Eliminar acceso a datos',
      description: '¿Estás seguro de eliminar este acceso a datos? Esta acción no se puede deshacer.',
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

      const response = await fetch(`/api/backend/user-data-access/${accessId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_data_access_id: accessId
        })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Error al eliminar acceso');
      }
      
      toast.success('Acceso eliminado exitosamente');
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al eliminar el acceso');
    }
  };

  const filteredDataAccess = Array.isArray(sortedDataAccess) ? sortedDataAccess.filter((access) =>
    access.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    access.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    access.table_names?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
    access.roleDataName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const getPermissionsBadge = (permissions: string[]) => {
    if (!permissions || permissions.length === 0) return 'bg-gray-700 text-gray-300';
    if (permissions.includes('write') || permissions.includes('delete')) return 'bg-red-900/50 text-red-300';
    if (permissions.includes('update')) return 'bg-yellow-900/50 text-yellow-300';
    return 'bg-blue-900/50 text-blue-300';
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
            placeholder="Buscar por usuario, tabla o rol de acceso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-minddash-elevated/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-green-600 dark:focus:border-green-500 transition-colors"
          />
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="ml-4 flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          <span>Asignar Acceso</span>
        </button>
      </div>

      {/* Información sobre User Data Access */}
      <div className="bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FiShield className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-1">Row-Level Security (RLS)</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Define permisos granulares de acceso a datos a nivel de usuario. Especifica qué filas de una tabla puede ver o modificar cada usuario mediante filtros personalizados. Aquí solo asignas acceso a usuarios existentes.
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de accesos */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-minddash-surface">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
          <thead className="bg-gray-50 dark:bg-minddash-elevated text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            <tr>
              <SortableColumn label="Usuario" sortKey="userName" currentSortKey={daSortKey} currentDirection={daSortDir} onSort={handleDaSort} />
              <SortableColumn label="Rol de Acceso" sortKey="roleDataName" currentSortKey={daSortKey} currentDirection={daSortDir} onSort={handleDaSort} />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tablas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filtros</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Permisos</th>
              <SortableColumn label="Estado" sortKey="is_active" currentSortKey={daSortKey} currentDirection={daSortDir} onSort={handleDaSort} />
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredDataAccess.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <FiDatabase className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">
                    {searchTerm ? 'No se encontraron accesos' : 'No hay accesos configurados'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Configura el primer acceso a datos para este chatbot'}
                  </p>
                  {!searchTerm && (
                    <button 
                      onClick={() => handleOpenModal()}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Asignar Primer Acceso
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredDataAccess.map((access, index) => {
                // Extract filters from data_access
                // New format: filters are directly in data_access (not in data_access.filters)
                // Also handle backward compatibility with old format (data_access.filters)
                const dataAccess = access.data_access || {};
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
                
                return (
                  <motion.tr
                    key={access.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-minddash-elevated transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <FiUser className="w-4 h-4 text-gray-400" />
                        <div>
                          <div>{access.userName || 'Sin nombre'}</div>
                          <div className="text-xs text-gray-500">{access.userEmail || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {access.roleDataName || 'Sin rol'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      <div className="flex flex-wrap gap-1">
                        {access.table_names.map((table, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-minddash-elevated rounded">
                            {table}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {filterEntries.length > 0 ? (
                        <div className="space-y-1">
                          {filterEntries.map(([key, value], i) => {
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
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">Sin filtros</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPermissionsBadge(access.data_access?.permissions || [])}`}>
                        {(access.data_access?.permissions || []).join(', ').toUpperCase() || 'NONE'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge variant={access.is_active ? 'active' : 'inactive'} dot>
                        {access.is_active ? 'Activo' : 'Inactivo'}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleOpenModal(access)}
                          className="inline-flex items-center space-x-1 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        >
                          <FiEdit className="w-4 h-4" />
                          <span className="text-sm">Editar</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(access.id)}
                          className="inline-flex items-center space-x-1 p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          <span className="text-sm">Eliminar</span>
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

      {/* Resumen de accesos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total de Accesos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{dataAccess.length}</p>
        </div>
        <div className="bg-white dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Accesos Activos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {dataAccess.filter(a => a.is_active).length}
          </p>
        </div>
        <div className="bg-white dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Tablas Protegidas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {new Set(dataAccess.flatMap(a => a.table_names)).size}
          </p>
        </div>
      </div>

      {/* Modal para agregar/editar acceso */}
      <AnimatePresence>
        {showModal && (
          <UserDataAccessModal
            isOpen={showModal}
            onClose={handleCloseModal}
            access={editingAccess}
            productId={productId}
            users={users.map(u => ({ ...u, phone_number: (u as any).phone_number }))}
            roleDataList={roleDataList}
            onSuccess={() => {
              handleCloseModal();
              setTimeout(() => loadData(), 500);
            }}
          />
        )}
      </AnimatePresence>

      {ConfirmDialog}
    </motion.div>
  );
}
