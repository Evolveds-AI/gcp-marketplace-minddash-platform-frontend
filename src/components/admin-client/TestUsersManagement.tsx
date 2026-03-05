'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheckCircle, FiXCircle, FiActivity } from '@/lib/icons';
import ModalPortal from '@/components/ui/ModalPortal';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableColumn, useSortableTable } from './SortableTableHeader';
import { StatusBadge } from './StatusBadge';
import { useThemeMode } from '@/hooks/useThemeMode';

interface AccessCode {
  id?: string;
  codevalue: string;
  is_active: boolean;
}

interface TestUser {
  id?: string;
  username: string;
  email: string;
  phoneNumber?: string; // Número de WhatsApp
  iam_role: string;
  is_active: boolean;
  created_at?: string;
  access_codes: AccessCode[];
}

interface TestUsersManagementProps {
  clientId: string;
  showNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

const TestUsersManagement: React.FC<TestUsersManagementProps> = ({ 
  clientId, 
  showNotification 
}) => {
  const { applyThemeClass } = useThemeMode();
  const [users, setUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<TestUser | null>(null);
  const { sortedData: sortedUsers, sortKey, sortDirection, handleSort } = useSortableTable<TestUser>(users, 'username', 'asc');

  // Validación de número de teléfono
  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone.trim()) return true; // Campo opcional
    // Acepta formatos: +54 9 11 1234-5678, +54 11 1234-5678, 11 1234-5678, etc.
    const phoneRegex = /^(\+?54\s?)?([0-9]\s?)?[0-9]{2,4}\s?[0-9]{4}[-\s]?[0-9]{4}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ' ').trim());
  };
  const [formData, setFormData] = useState<TestUser>({
    username: '',
    email: '',
    phoneNumber: '',
    iam_role: 'user',
    is_active: true,
    access_codes: []
  });

  // Sistema de notificación local como fallback
  const [localNotification, setLocalNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  const notify = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    if (showNotification) {
      showNotification(type, message);
    } else {
      setLocalNotification({ type, message });
      setTimeout(() => setLocalNotification(null), 5000);
    }
  }, [showNotification]);

  // Función auxiliar para obtener el token de autenticación
  const getAuthToken = useCallback(() => {
    // Detectar el sistema de autenticación disponible
    let token = localStorage.getItem('authToken'); // Para /admin-client
    if (!token) {
      const evolveAuth = localStorage.getItem('evolve-auth'); // Para /dashboard/admin
      if (evolveAuth) {
        try {
          const authData = JSON.parse(evolveAuth);
          token = authData.accessToken;
        } catch (error) {
          console.error('Error parsing evolve-auth:', error);
        }
      }
    }
    return token;
  }, []);

  // Función para convertir CUITs concatenados a array de AccessCode
  const parseConcatenatedCuits = (codevalue: string): AccessCode[] => {
    if (!codevalue || codevalue.trim() === '') return [];
    
    return codevalue.split(',').map((cuit, index) => {
      const trimmedCuit = cuit.trim();
      return {
        id: `temp-${index}`, // ID temporal para el frontend
        codevalue: trimmedCuit,
        is_active: true // Por defecto activo
      };
    }).filter(code => code.codevalue.length > 0);
  };

  // Cargar usuarios de prueba
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación disponible');
      }
      
      const response = await fetch('/api/admin-client/users-test', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        // Limpiar ambos sistemas de autenticación
        localStorage.removeItem('authToken');
        localStorage.removeItem('evolve-auth');
        localStorage.removeItem('evolve-selected-client');
        window.location.href = '/login?expired=true';
        return;
      }

      if (!response.ok) {
        throw new Error('Error al cargar usuarios de prueba');
      }

      const data = await response.json();
      
      // Procesar usuarios para manejar CUITs concatenados
      const processedUsers = (data.data.users || []).map((user: any) => {
        // Si access_codes está vacío pero hay un codevalue concatenado, procesarlo
        if ((!user.access_codes || user.access_codes.length === 0) && user.codevalue) {
          user.access_codes = parseConcatenatedCuits(user.codevalue);
        }
        // Si access_codes tiene un solo elemento con múltiples CUITs concatenados
        else if (user.access_codes && user.access_codes.length === 1 && user.access_codes[0].codevalue.includes(',')) {
          user.access_codes = parseConcatenatedCuits(user.access_codes[0].codevalue);
        }
        // Asegurar que phoneNumber esté presente
        return {
          ...user,
          phoneNumber: user.phoneNumber || null
        };
      });
      
      setUsers(processedUsers);
    } catch (error) {
      console.error('Error cargando usuarios de prueba:', error);
      notify('error', 'Error al cargar usuarios de prueba');
    } finally {
      setLoading(false);
    }
  }, [notify, getAuthToken]);

  // Agregar nuevo código CUIT (máximo 3 permitidos)
  const addAccessCode = () => {
    if (formData.access_codes.length >= 3) {
      notify('error', 'Máximo 3 CUITs por usuario');
      return;
    }
    setFormData({
      ...formData,
      access_codes: [...formData.access_codes, { codevalue: '', is_active: true }]
    });
  };

  // Remover código CUIT
  const removeAccessCode = (index: number) => {
    const newCodes = formData.access_codes.filter((_, i) => i !== index);
    setFormData({ ...formData, access_codes: newCodes });
  };

  // Actualizar código CUIT
  const updateAccessCode = (index: number, field: keyof AccessCode, value: any) => {
    const newCodes = [...formData.access_codes];
    newCodes[index] = { ...newCodes[index], [field]: value };
    setFormData({ ...formData, access_codes: newCodes });
  };

  // Función para concatenar CUITs para envío a la API
  const concatenateCuits = (accessCodes: AccessCode[]): string => {
    return accessCodes
      .filter(code => code.codevalue && code.codevalue.trim() !== '')
      .map(code => code.codevalue.trim())
      .join(', ');
  };

  // Crear usuario
  const handleCreateUser = async () => {
    try {
      const token = getAuthToken();

      // Preparar datos con CUITs concatenados
      const concatenatedCuits = concatenateCuits(formData.access_codes);
      const userData = {
        ...formData,
        password: 'TempPassword123!', // Password temporal para pruebas
        codevalue: concatenatedCuits // Agregar campo concatenado para la DB
      };

      const response = await fetch('/api/admin-client/users-test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...userData,
          phoneNumber: userData.phoneNumber
        })
      });

      const result = await response.json();

      if (response.ok) {
        notify('success', 'Usuario de prueba creado exitosamente');
        await loadUsers();
        setShowModal(false);
        resetForm();
      } else {
        notify('error', result.message || 'Error creando usuario de prueba');
      }
    } catch (error) {
      console.error('Error creando usuario de prueba:', error);
      notify('error', 'Error creando usuario de prueba');
    }
  };

  // Actualizar usuario
  const handleUpdateUser = async () => {
    try {
      const token = getAuthToken();

      // Preparar datos con CUITs concatenados
      const concatenatedCuits = concatenateCuits(formData.access_codes);
      const userData = {
        userId: editingUser?.id,
        ...formData,
        password: '', // No cambiar password en edición
        codevalue: concatenatedCuits // Agregar campo concatenado para la DB
      };

      const response = await fetch('/api/admin-client/users-test', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...userData,
          phoneNumber: userData.phoneNumber
        })
      });

      const result = await response.json();

      if (response.ok) {
        notify('success', 'Usuario de prueba actualizado exitosamente');
        await loadUsers();
        setShowModal(false);
        setEditingUser(null);
        resetForm();
      } else {
        notify('error', result.message || 'Error actualizando usuario de prueba');
      }
    } catch (error) {
      console.error('Error actualizando usuario de prueba:', error);
      notify('error', 'Error actualizando usuario de prueba');
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario de prueba?')) {
      return;
    }

    try {
      const token = getAuthToken();

      const response = await fetch(`/api/admin-client/users-test?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        notify('success', 'Usuario de prueba eliminado exitosamente');
        await loadUsers();
      } else {
        notify('error', result.message || 'Error eliminando usuario de prueba');
      }
    } catch (error) {
      console.error('Error eliminando usuario de prueba:', error);
      notify('error', 'Error eliminando usuario de prueba');
    }
  };

  // Abrir modal para editar
  const handleEditUser = (user: TestUser) => {
    setEditingUser(user);
    
    // Procesar access_codes para asegurar que estén en el formato correcto
    let processedAccessCodes = user.access_codes || [];
    
    // Si hay un solo access_code con CUITs concatenados, dividirlos
    if (processedAccessCodes.length === 1 && processedAccessCodes[0].codevalue.includes(',')) {
      processedAccessCodes = parseConcatenatedCuits(processedAccessCodes[0].codevalue);
    }
    // Si no hay access_codes pero hay un campo codevalue concatenado, procesarlo
    else if (processedAccessCodes.length === 0 && (user as any).codevalue) {
      processedAccessCodes = parseConcatenatedCuits((user as any).codevalue);
    }
    
    setFormData({
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      iam_role: user.iam_role,
      is_active: user.is_active,
      access_codes: processedAccessCodes.map(code => ({ ...code }))
    });
    setShowModal(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      phoneNumber: '',
      iam_role: 'user',
      is_active: true,
      access_codes: []
    });
  };

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    resetForm();
  };

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sistema de notificación local */}
      <AnimatePresence>
        {localNotification && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className={`p-4 rounded-lg shadow-lg border-l-4 flex items-center space-x-3 ${
              localNotification.type === 'success' 
                ? 'bg-green-50 border-green-400 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : localNotification.type === 'error'
                ? 'bg-red-50 border-red-400 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-blue-50 border-blue-400 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
            }`}>
              <div className="flex-shrink-0">
                {localNotification.type === 'success' ? (
                  <FiCheckCircle className="w-5 h-5" />
                ) : localNotification.type === 'error' ? (
                  <FiXCircle className="w-5 h-5" />
                ) : (
                  <FiActivity className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{localNotification.message}</p>
              </div>
              <button 
                onClick={() => setLocalNotification(null)}
                className="flex-shrink-0 ml-auto pl-3"
              >
                <FiX className="w-4 h-4 opacity-70 hover:opacity-100" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Usuarios de Prueba (@bayer.com)
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona usuarios de prueba con múltiples códigos CUIT
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="w-4 h-4 mr-2" />
          Nuevo Usuario de Prueba
        </button>
      </div>

      {/* Lista de usuarios */}
      <div className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-lg shadow overflow-hidden', 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className={applyThemeClass('bg-minddash-elevated border-b border-minddash-border', 'bg-gray-50 border-b border-gray-200')}>
              <tr>
                <SortableColumn label="Usuario" sortKey="username" currentSortKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                <SortableColumn label="Email" sortKey="email" currentSortKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                <SortableColumn label="WhatsApp" sortKey="phoneNumber" currentSortKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                <SortableColumn label="Rol" sortKey="iam_role" currentSortKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  CUIT
                </th>
                <SortableColumn label="Estado" sortKey="is_active" currentSortKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {sortedUsers.map((user) => (
                <tr key={user.id} className={applyThemeClass('hover:bg-minddash-elevated transition-colors', 'hover:bg-gray-50 transition-colors')}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.username}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-white">
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-white">
                      {user.phoneNumber || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {user.iam_role === 'user' ? 'Usuario' : 
                       user.iam_role === 'editor' ? 'Editor' : 
                       user.iam_role === 'viewer' ? 'Visualizador' : 
                       user.iam_role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {user.access_codes.length > 0 ? (
                        user.access_codes.map((code, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className={`text-sm px-2 py-1 rounded ${
                              code.is_active 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-600 dark:bg-minddash-elevated dark:text-gray-400'
                            }`}>
                              {code.codevalue}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 text-sm">Sin códigos</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge variant={user.is_active ? 'active' : 'inactive'} dot>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id!)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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

        {users.length === 0 && (
          <div className="text-center py-16">
            <FiActivity className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              No hay usuarios de prueba registrados
            </h3>
            <p className="text-gray-500 dark:text-gray-500 mb-4">
              Crea el primer usuario de prueba para comenzar
            </p>
            <button
              onClick={() => { setEditingUser(null); setShowModal(true); }}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              Crear Usuario de Prueba
            </button>
          </div>
        )}
      </div>

      {/* Modal para crear/editar usuario */}
      <ModalPortal>
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
            >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-minddash-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-none"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingUser ? 'Editar Usuario de Prueba' : 'Nuevo Usuario de Prueba'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Datos básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-minddash-elevated dark:text-white"
                      placeholder="Ingresa el username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-minddash-elevated dark:text-white"
                      placeholder="usuario@bayer.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número de WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)
                          ? 'border-red-500 focus:ring-red-500 dark:border-red-500'
                          : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                      } dark:bg-minddash-elevated dark:text-white`}
                      placeholder="+54 9 11 1234-5678"
                    />
                    {formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber) && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        Formato inválido. Ej: +54 9 11 1234-5678
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rol
                    </label>
                    <Select value={formData.iam_role} onValueChange={(next) => setFormData({ ...formData, iam_role: next })}>
                      <SelectTrigger className="w-full px-3 py-2 border-gray-300 dark:border-gray-600 dark:bg-minddash-elevated dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-minddash-elevated border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Códigos CUIT */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      CUIT
                    </label>
                    {formData.access_codes.length < 3 && (
                      <button
                        type="button"
                        onClick={addAccessCode}
                        className="inline-flex items-center px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <FiPlus className="w-3 h-3 mr-1" />
                        Agregar CUIT
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {formData.access_codes.map((code, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-md">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={code.codevalue}
                            onChange={(e) => updateAccessCode(index, 'codevalue', e.target.value)}
                            placeholder="12345678901"
                            maxLength={11}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-minddash-elevated dark:text-white"
                          />
                        </div>
                        <div>
                          <span className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm">
                            CUIT
                          </span>
                        </div>
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={code.is_active}
                              onChange={(e) => updateAccessCode(index, 'is_active', e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Activo</span>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAccessCode(index)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {formData.access_codes.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                        No hay CUITs agregados. Haz clic en &quot;Agregar CUIT&quot; para añadir uno.
                      </p>
                    )}
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={editingUser ? handleUpdateUser : handleCreateUser}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingUser ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </div>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </div>
  );
};

export default TestUsersManagement;
