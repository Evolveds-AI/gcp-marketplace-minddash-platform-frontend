'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiPlus, FiTrash2, FiLock, FiUser, FiMail } from '@/lib/icons';
import { toast } from 'sonner';
import ModalPortal from '@/components/ui/ModalPortal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserDataAccess {
  id: string;
  user_id: string;
  role_data_id: string;
  table_names: string[];
  data_access: {
    filters?: Record<string, any>;
    permissions?: string[];
  };
  metrics_access?: string[];
  is_active: boolean;
  userName?: string;
  userEmail?: string;
  roleDataName?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  phone_number?: string;
  is_active?: boolean;
}

interface RoleData {
  id: string;
  name: string;
  table_names?: string[];
  metrics_access?: string[];
}

interface UserDataAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  access: UserDataAccess | null;
  productId: string;
  users: User[];
  roleDataList: RoleData[];
  onSuccess: () => void;
}

function getShortTableName(table: string): string {
  const parts = table.split('.');
  return parts[parts.length - 1] || table;
}

export default function UserDataAccessModal({
  isOpen,
  onClose,
  access,
  productId,
  users,
  roleDataList,
  onSuccess
}: UserDataAccessModalProps) {
  // Form state
  const [formData, setFormData] = useState({
    user_id: '',
    role_data_id: '',
    // User details
    userName: '',
    userPhone: '',
    userEmail: '',
    userPassword: '',
    userIsActive: true,
    // Permissions
    metrics_access_list: [] as string[],
    table_names_list: [] as string[],
    filters: [{ key: '', value: '' }],
    permissions: ['read'] as string[]
  });

  // Available options from selected role
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [savingData, setSavingData] = useState(false);

  // Reset form when modal opens/closes or access changes
  useEffect(() => {
    if (access) {
      // Editing existing access
      // Filters are stored directly in data_access, not in data_access.filters
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
      
      // Convert filters object to array format
      // Each filter should be displayed as "key": value in the input field
      const filterEntries = Object.entries(filters).map(([key, value]) => {
        // Skip condition_X keys (old format)
        if (key.startsWith('condition_')) {
          // For old format, show the value in the key field
          return { key: String(value), value: '' };
        }
        // For new format, display as "key": value JSON string
        try {
          const valueJson = JSON.stringify(value);
          const keyValueString = `"${key}": ${valueJson}`;
          return { key: keyValueString, value: '' };
        } catch {
          // Fallback if value can't be stringified
          return { key: `"${key}": ${String(value)}`, value: '' };
        }
      });

      // Find the user to get their details
      const selectedUser = users.find(u => u.id === access.user_id);

      setFormData({
        user_id: access.user_id || '',
        role_data_id: access.role_data_id || '',
        userName: selectedUser?.username || access.userName || '',
        userPhone: selectedUser?.phone_number || '',
        userEmail: selectedUser?.email || access.userEmail || '',
        userPassword: '',
        userIsActive: access.is_active,
        metrics_access_list: access.metrics_access || [],
        table_names_list: access.table_names || [],
        filters: filterEntries.length > 0 ? filterEntries : [{ key: '', value: '' }],
        permissions: access.data_access?.permissions || ['read']
      });

      // Load role options
      if (access.role_data_id) {
        loadRoleOptions(access.role_data_id);
      }
    } else {
      // Creating new access
      setFormData({
        user_id: '',
        role_data_id: '',
        userName: '',
        userPhone: '',
        userEmail: '',
        userPassword: '',
        userIsActive: true,
        metrics_access_list: [],
        table_names_list: [],
        filters: [{ key: '', value: '' }],
        permissions: ['read']
      });
      setAvailableMetrics([]);
      setAvailableTables([]);
    }
  }, [access, users]);

  // Load role options when role_data_id changes
  const loadRoleOptions = (roleId: string) => {
    const selectedRole = roleDataList.find(r => r.id === roleId);
    if (selectedRole) {
      setAvailableTables(selectedRole.table_names || []);
      setAvailableMetrics(selectedRole.metrics_access || []);
    } else {
      setAvailableTables([]);
      setAvailableMetrics([]);
    }
  };

  // Handle role change
  const handleRoleChange = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      role_data_id: roleId,
      // Reset selections when role changes
      metrics_access_list: [],
      table_names_list: []
    }));
    loadRoleOptions(roleId);
  };

  // Handle user selection
  const handleUserChange = async (userId: string) => {
    setFormData(prev => ({ ...prev, user_id: userId }));

    if (userId) {
      const selectedUser = users.find(u => u.id === userId);
      if (selectedUser) {
        setFormData(prev => ({
          ...prev,
          userName: selectedUser.username || '',
          userEmail: selectedUser.email || '',
          userPhone: selectedUser.phone_number || '',
          userIsActive: selectedUser.is_active ?? true
        }));
      }
    } else {
      // Clear user details if "All users" selected
      setFormData(prev => ({
        ...prev,
        userName: '',
        userEmail: '',
        userPhone: '',
        userPassword: '',
        userIsActive: true
      }));
    }
  };

  // Select all metrics/tables from role
  const selectAllFromRole = () => {
    setFormData(prev => ({
      ...prev,
      metrics_access_list: [...availableMetrics],
      table_names_list: [...availableTables]
    }));
  };

  // Toggle metric
  const toggleMetric = (metric: string) => {
    setFormData(prev => {
      if (prev.metrics_access_list.includes(metric)) {
        return { ...prev, metrics_access_list: prev.metrics_access_list.filter(m => m !== metric) };
      } else {
        return { ...prev, metrics_access_list: [...prev.metrics_access_list, metric] };
      }
    });
  };

  // Toggle table
  const toggleTable = (table: string) => {
    setFormData(prev => {
      if (prev.table_names_list.includes(table)) {
        return { ...prev, table_names_list: prev.table_names_list.filter(t => t !== table) };
      } else {
        return { ...prev, table_names_list: [...prev.table_names_list, table] };
      }
    });
  };

  // Add filter
  const handleAddFilter = () => {
    setFormData(prev => ({ ...prev, filters: [...prev.filters, { key: '', value: '' }] }));
  };

  // Remove filter
  const handleRemoveFilter = (index: number) => {
    setFormData(prev => ({ ...prev, filters: prev.filters.filter((_, i) => i !== index) }));
  };

  // Update filter
  const handleFilterChange = (index: number, field: 'key' | 'value', value: string) => {
    setFormData(prev => {
      const newFilters = [...prev.filters];
      newFilters[index][field] = value;
      return { ...prev, filters: newFilters };
    });
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.role_data_id) {
      toast.error('Debes seleccionar un Rol');
      return;
    }

    if (!formData.user_id) {
      toast.error('Debes seleccionar un Usuario');
      return;
    }

    try {
      setSavingData(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }

      const { accessToken: token } = JSON.parse(authData);

      // 1. Update user data if a specific user is selected and fields changed
      if (formData.user_id) {
        const userUpdatePayload: any = {};
        const selectedUser = users.find(u => u.id === formData.user_id);

        if (selectedUser) {
          if (formData.userName && formData.userName !== selectedUser.username) {
            userUpdatePayload.username = formData.userName;
          }
          if (formData.userEmail && formData.userEmail !== selectedUser.email) {
            userUpdatePayload.email = formData.userEmail;
          }
          if (formData.userPhone !== (selectedUser.phone_number || '')) {
            userUpdatePayload.phoneNumber = formData.userPhone;
          }
          if (formData.userPassword) {
            userUpdatePayload.password = formData.userPassword;
          }

          // Update user details if there are changes
          if (Object.keys(userUpdatePayload).length > 0) {
            userUpdatePayload.userId = formData.user_id;
            const userResponse = await fetch('/api/admin-client/users', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(userUpdatePayload)
            });

            if (!userResponse.ok) {
              const userResult = await userResponse.json();
              console.warn('Error actualizando usuario:', userResult.message);
              // Continue with RLS save even if user update fails
            }
          }

          // Update user status if changed
          if (formData.userIsActive !== selectedUser.is_active) {
            const statusResponse = await fetch(`/api/admin-client/users/${formData.user_id}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ is_active: formData.userIsActive })
            });

            if (!statusResponse.ok) {
              console.warn('Error actualizando estado del usuario');
            }
          }
        }
      }

      // 2. Build filters object
      // The filter.key contains a key-value pair in JSON format (e.g., "facturacion_argentina.BU.in": ["BU CENTRO"])
      // Parse it and store as a dictionary
      const filtersObj: Record<string, any> = {};
      formData.filters.forEach((filter) => {
        const expression = filter.key?.trim();
        if (expression) {
          try {
            // Try to parse as JSON object first (e.g., {"key": "value"})
            let parsed: any = null;
            try {
              parsed = JSON.parse(expression);
              if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                // It's a valid JSON object, merge it into filtersObj
                Object.assign(filtersObj, parsed);
              }
            } catch {
              // If not a complete JSON object, try to parse as a key-value pair string
              // Format: "key": value or "key": ["value"] or "key": {"nested": "object"}
              // Match: "key": followed by the rest (which could be array, object, string, number, etc.)
              const keyValueMatch = expression.match(/^"([^"]+)"\s*:\s*([\s\S]+)$/);
              if (keyValueMatch) {
                const key = keyValueMatch[1];
                const valueStr = keyValueMatch[2].trim();
                
                // Try to parse the value as JSON
                try {
                  const value = JSON.parse(valueStr);
                  filtersObj[key] = value;
                } catch (parseError) {
                  // If value is not valid JSON, try to wrap it in quotes and parse again
                  // This handles cases where the value is a plain string without quotes
                  try {
                    const value = JSON.parse(`"${valueStr}"`);
                    filtersObj[key] = value;
                  } catch {
                    // If still fails, store as string
                    filtersObj[key] = valueStr;
                  }
                }
              } else {
                // If it doesn't match key-value format, check if filter.value exists
                if (filter.value && filter.value.trim()) {
                  filtersObj[filter.key] = filter.value;
                }
              }
            }
          } catch (error) {
            console.warn('Error parsing filter expression:', expression, error);
            // Fallback: if filter.value exists, use it
            if (filter.value && filter.value.trim()) {
              filtersObj[filter.key] = filter.value;
            }
          }
        }
      });

      // 3. Build data_access object - filters should be stored directly, not wrapped in a "filters" key
      const hasFilters = Object.keys(filtersObj).length > 0;
      
      let dataAccess: any = {};
      if (hasFilters) {
        // Store filters directly in data_access (not wrapped in "filters" key)
        // data_access should be: {"facturacion_argentina.BU.in": ["BU CENTRO"], ...}
        dataAccess = { ...filtersObj };
        
        // Include permissions only if they differ from default ['read']
        const hasCustomPermissions = formData.permissions.length > 0 && 
          !(formData.permissions.length === 1 && formData.permissions[0] === 'read');
        if (hasCustomPermissions) {
          dataAccess.permissions = formData.permissions;
        }
      }
      // If no filters, data_access remains {} (empty object)

      // 4. Save User Data Access
      const payload = {
        role_data_id: formData.role_data_id,
        user_id: formData.user_id,
        table_names: formData.table_names_list,
        data_access: dataAccess,
        metrics_access: formData.metrics_access_list.length > 0 ? formData.metrics_access_list : null
      };

      if (access) {
        // Update existing
        const response = await fetch(`/api/backend/user-data-access/${access.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            user_data_access_id: access.id,
            ...payload,
            is_active: formData.userIsActive
          })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Error al actualizar acceso');
        }

        toast.success('Acceso actualizado exitosamente');
      } else {
        // Create new
        const response = await fetch('/api/backend/user-data-access/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Error al crear acceso');
        }

        toast.success('Acceso creado exitosamente');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al guardar el acceso');
    } finally {
      setSavingData(false);
    }
  };

  if (!isOpen) return null;

  const selectedRole = roleDataList.find(r => r.id === formData.role_data_id);

  return (
    <ModalPortal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-panel border border-white/10 rounded-2xl p-0 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl bg-minddash-surface/90 flex flex-col"
        >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {access ? 'Editar Acceso a Datos (RLS)' : 'Asignar Acceso a Datos (RLS)'}
            </h3>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              Gestiona permisos y restricciones de datos para usuarios.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Usuario */}
            <div className="bg-white/5 rounded-xl border border-white/5 p-5">
              <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Usuario Existente</h4>

              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">
                  Seleccionar Usuario
                </label>
                <Select
                  value={formData.user_id || undefined}
                  onValueChange={(next) => handleUserChange(next)}
                  disabled={!!access}
                >
                  <SelectTrigger className="w-full bg-black/40 border-white/10 text-white h-[42px] disabled:opacity-60">
                    <SelectValue placeholder="Selecciona un usuario..." />
                  </SelectTrigger>
                  <SelectContent className="bg-minddash-card border-white/10 text-white">
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-gray-500 mt-1.5 ml-1">
                  Gestiona usuarios en <span className="text-gray-400">Dashboard → Usuarios</span>.
                </p>
              </div>

              {formData.user_id && (
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/20 rounded-lg border border-white/10 p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <FiUser className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold">Nombre</div>
                      <div className="text-sm text-gray-200 font-medium truncate">{formData.userName || 'Sin nombre'}</div>
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg border border-white/10 p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <FiMail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold">Email</div>
                      <div className="text-sm text-gray-200 font-medium truncate">{formData.userEmail || 'Sin email'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rol y Estado de Cuenta */}
            <div className="bg-white/5 rounded-xl border border-white/5 p-5">
              <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Rol y Estado</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Asignar Rol */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">
                    Asignar Rol <span className="text-red-400">*</span>
                  </label>
                  <Select value={formData.role_data_id || undefined} onValueChange={(next) => handleRoleChange(next)}>
                    <SelectTrigger className="w-full bg-black/40 border-white/10 text-white h-[42px]">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent className="bg-minddash-card border-white/10 text-white">
                      {roleDataList.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-gray-500 mt-1.5 ml-1">Define los permisos base.</p>
                </div>

                {/* Estado del Usuario */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">
                    Estado del Usuario
                  </label>
                  <Select
                    value={formData.userIsActive ? 'active' : 'inactive'}
                    onValueChange={(next) => setFormData({ ...formData, userIsActive: next === 'active' })}
                  >
                    <SelectTrigger className="w-full bg-black/40 border-white/10 text-white h-[42px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-minddash-card border-white/10 text-white">
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-gray-500 mt-1.5 ml-1">Acceso al sistema.</p>
                </div>
              </div>
            </div>

            {/* Permisos Personalizados */}
            <div className="bg-white/5 rounded-xl border border-white/5 p-5">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <div className="flex items-center space-x-2">
                  <FiLock className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Permisos Personalizados</h4>
                </div>
                {formData.role_data_id && (availableMetrics.length > 0 || availableTables.length > 0) && (
                  <button
                    type="button"
                    onClick={selectAllFromRole}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium bg-blue-500/10 px-2 py-1 rounded hover:bg-blue-500/20"
                  >
                    Heredar Todo del Rol
                  </button>
                )}
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-5 flex items-start gap-3">
                <div className="w-1 h-1 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></div>
                <p className="text-xs text-yellow-200/80 leading-relaxed">
                  Las selecciones aquí <strong className="text-yellow-400 font-semibold">anulan</strong> los permisos heredados del rol.
                </p>
              </div>

              {!formData.role_data_id ? (
                <div className="text-center py-8 text-gray-500 text-xs italic">
                  Selecciona un Rol primero para ver las opciones disponibles.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Métricas de Acceso */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-3 uppercase">Métricas de Acceso</label>
                    <div className="bg-black/40 rounded-lg border border-white/10 p-1 max-h-56 overflow-y-auto custom-scrollbar">
                      {availableMetrics.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500">
                          El rol no tiene métricas.
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <label className="flex items-center space-x-3 p-2 cursor-pointer hover:bg-white/5 rounded-md transition-colors border-b border-white/5 mb-1 group">
                            <input
                              type="checkbox"
                              checked={formData.metrics_access_list.length === availableMetrics.length && availableMetrics.length > 0}
                              onChange={() => {
                                if (formData.metrics_access_list.length === availableMetrics.length) {
                                  setFormData({ ...formData, metrics_access_list: [] });
                                } else {
                                  setFormData({ ...formData, metrics_access_list: [...availableMetrics] });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 bg-white/5 border-white/20 rounded focus:ring-blue-500/40 checked:bg-blue-600 transition-all"
                            />
                            <span className="text-sm text-blue-400 font-medium group-hover:text-blue-300">Todas (Heredar)</span>
                          </label>
                          {availableMetrics.map((metric) => (
                            <label key={metric} className="flex items-center space-x-3 p-2 cursor-pointer hover:bg-white/5 rounded-md transition-colors group">
                              <input
                                type="checkbox"
                                checked={formData.metrics_access_list.includes(metric)}
                                onChange={() => toggleMetric(metric)}
                                className="w-4 h-4 text-blue-600 bg-white/5 border-white/20 rounded focus:ring-blue-500/40 checked:bg-blue-600 transition-all"
                              />
                              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{metric}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tablas de Acceso a BD */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-3 uppercase">
                      Tablas de Acceso
                    </label>
                    <div className="bg-black/40 rounded-lg border border-white/10 p-1 max-h-56 overflow-y-auto custom-scrollbar">
                      {availableTables.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500">
                          El rol no tiene tablas.
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <label className="flex items-center space-x-3 p-2 cursor-pointer hover:bg-white/5 rounded-md transition-colors border-b border-white/5 mb-1 group">
                            <input
                              type="checkbox"
                              checked={formData.table_names_list.length === availableTables.length && availableTables.length > 0}
                              onChange={() => {
                                if (formData.table_names_list.length === availableTables.length) {
                                  setFormData({ ...formData, table_names_list: [] });
                                } else {
                                  setFormData({ ...formData, table_names_list: [...availableTables] });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 bg-white/5 border-white/20 rounded focus:ring-blue-500/40 checked:bg-blue-600 transition-all"
                            />
                            <span className="text-sm text-blue-400 font-medium group-hover:text-blue-300">Todas (Heredar)</span>
                          </label>
                          {availableTables.map((table) => (
                            <label key={table} className="flex items-center space-x-3 p-2 cursor-pointer hover:bg-white/5 rounded-md transition-colors group">
                              <input
                                type="checkbox"
                                checked={formData.table_names_list.includes(table)}
                                onChange={() => toggleTable(table)}
                                className="w-4 h-4 text-blue-600 bg-white/5 border-white/20 rounded focus:ring-blue-500/40 checked:bg-blue-600 transition-all"
                              />
                              <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate" title={table}>{getShortTableName(table)}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Filtros Personalizados (Row-Level Security) */}
            <div className="bg-white/5 rounded-xl border border-white/5 p-5">
              <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Filtros Personalizados (Row-Level Security)</h4>

              <div className="space-y-3">
                {formData.filters.map((filter, index) => (
                  <div key={index} className="bg-black/20 rounded-lg border border-white/10 p-4 hover:border-white/20 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wide">Filtro RLS {index + 1}</h5>
                      {formData.filters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter(index)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={filter.key}
                          onChange={(e) => handleFilterChange(index, 'key', e.target.value)}
                          placeholder="users.segment = 'premium'"
                          className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-4 text-white font-mono text-xs focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-colors placeholder:text-gray-700"
                        />
                      </div>
                      <p className="text-[10px] text-gray-500">Expresión SQL para restringir filas.</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddFilter}
                className="mt-4 flex items-center space-x-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-2 rounded-lg hover:bg-blue-500/20 border border-blue-500/20"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>Añadir Nuevo Filtro</span>
              </button>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingData || !formData.role_data_id || !formData.user_id}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-blue-900/20 hover:scale-[1.02] flex items-center space-x-2"
              >
                {savingData && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                <span>{access ? 'Guardar Cambios' : 'Guardar Acceso'}</span>
              </button>
            </div>
          </form>
        </div>
        </motion.div>
      </motion.div>
    </ModalPortal>
  );
}
