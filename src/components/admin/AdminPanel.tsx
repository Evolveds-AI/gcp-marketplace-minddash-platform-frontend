'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Spotlight } from '@/components/ui/spotlight-new';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, 
  FiSettings, 
  FiBarChart, 
  FiActivity,
  FiLogOut,
  FiPlus,
  FiSearch,
  FiEdit,
  FiTrash2,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiFilter,
  FiDownload,
  FiMoreVertical,
  FiShield,
  FiDatabase,
  FiClock,
  FiTrendingUp,
  FiPaperclip,
  FiUser,
  FiArrowLeft,
  FiMessageSquare,
  FiLink,
  FiGitBranch,
  FiInfo,

  IconMappings
} from '@/lib/icons';
import { WordRotate } from '@/components/magicui/word-rotate';
import { AnimatedGridPattern } from '@/components/magicui/animated-grid-pattern';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, BarChart, Bar } from 'recharts';
import ChatbotAssignments from '@/components/admin/ChatbotAssignments';
import ChatbotManagement from '@/components/admin/ChatbotManagement';
import RealTimeCharts from '@/components/RealTimeCharts';
import ConnectorManager from '@/components/connectors/ConnectorManager';
import FlowEditor from '@/components/flows/FlowEditor';
import DataSourceManager from '@/components/admin/DataSourceManager';
import YamlConfigManager from '@/components/admin/YamlConfigManager';
import SuperAdminUserManagement from '@/components/admin/SuperAdminUserManagement';
import SuperAdminSettings from '@/components/admin/SuperAdminSettings';
import { UserNav } from '@/components/UserNav';
import { Separator } from '@/components/ui/separator';
import { 
  isBayerAdmin, 
  getThemeColors, 
  getBayerDynamicStyles, 
  getLogoPath, 
  getBayerClasses 
} from '@/lib/utils/bayer-theme';
import ModalPortal from '@/components/ui/ModalPortal';

interface User {
  id: string;
  username: string;
  email: string;
  iam_role: string;
  is_active: boolean;
  created_at: string;
  client: {
    id: string;
    nombre: string;
  };
}

interface Client {
  id: string;
  nombre: string;
  descripcion: string;
  created_at: string;
}

interface CreateUserForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  iam_role: string;
  client_id: string | null;
  is_active: boolean;
  access_role: string;
  cuit_code: string;
}

interface FormErrors {
  [key: string]: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalClients: number;
  recentUsers: User[];
  recentClients: Client[];
  userGrowthRate?: number;
  roleDistribution?: Array<{
    role: string;
    count: number;
  }>;
}

// Componente para gestión de usuarios mejorado
function UsersManagement({ showNotification, openCreateModal = false, userRole = 'super_admin' }: { showNotification: (type: 'success' | 'error' | 'info', message: string) => void, openCreateModal?: boolean, userRole?: string }) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(openCreateModal);
  const [clients, setClients] = useState<Client[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    iam_role: 'VIEWER',
    client_id: null,
    is_active: true,
    access_role: 'AllAccess',
    cuit_code: ''
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados para modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editUserForm, setEditUserForm] = useState<Omit<CreateUserForm, 'confirmPassword'>>({
    username: '',
    email: '',
    password: '',
    iam_role: 'VIEWER',
    client_id: null,
    is_active: true,
    access_role: 'AllAccess',
    cuit_code: ''
  });
  
  // Estados para confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [showDeleteChatbotModal, setShowDeleteChatbotModal] = useState(false);
  const [chatbotToDelete, setChatbotToDelete] = useState<any>(null);
  const [isDeletingChatbot, setIsDeletingChatbot] = useState(false);

  // Cargar clientes y usuarios al montar el componente
  useEffect(() => {
    loadClients();
    loadUsers();
  }, []);

  // Efecto para abrir el modal cuando se pasa openCreateModal como true
  useEffect(() => {
    if (openCreateModal) {
      setShowCreateModal(true);
    }
  }, [openCreateModal]);

  const loadClients = async () => {
    try {
      const authData = localStorage.getItem('evolve-auth');
      const token = authData ? JSON.parse(authData).accessToken : null;
      
      const response = await fetch('/api/admin/companies?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Verificar si el token ha expirado
      if (response.ok) {
        const data = await response.json();
        setClients(data.data || []);
      } else {
        console.error('Error loading clients:', response.status);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      const token = authData ? JSON.parse(authData).accessToken : null;
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) return;
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data?.users || data.users || []);
      } else {
        console.error('Error loading users:', response.status);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleFormChange = (field: string, value: string | boolean) => {
    setCreateUserForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors: any = {};
    
    if (!createUserForm.username.trim()) {
      errors.username = 'El nombre de usuario es requerido';
    }
    
    if (!createUserForm.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createUserForm.email)) {
      errors.email = 'El formato del email no es válido';
    }
    
    if (!createUserForm.password) {
      errors.password = 'La contraseña es requerida';
    } else if (createUserForm.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (!createUserForm.confirmPassword) {
      errors.confirmPassword = 'Confirmar contraseña es requerido';
    } else if (createUserForm.password !== createUserForm.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    // Validación del código CUIT para distribuidores y cliente Bayer
    const selectedClient = clients.find(client => client.id === createUserForm.client_id);
    const isBayerClient = selectedClient?.nombre?.toLowerCase().includes('bayer');
    
    if (isBayerClient && createUserForm.access_role === 'DISTRIBUIDOR_ACCESS') {
      if (!createUserForm.cuit_code.trim()) {
        errors.cuit_code = 'El código CUIT es requerido para distribuidores';
      } else {
        // Validar formato CUIT: 11 dígitos numéricos
        const cuitRegex = /^\d{11}$/;
        if (!cuitRegex.test(createUserForm.cuit_code)) {
          errors.cuit_code = 'El CUIT debe contener exactamente 11 dígitos numéricos';
        }
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsCreatingUser(true);
    
    try {
      const authData = localStorage.getItem('evolve-auth');
      const token = authData ? JSON.parse(authData).accessToken : null;
      const requestBody = {
        username: createUserForm.username,
        email: createUserForm.email,
        password: createUserForm.password,
        iam_role: createUserForm.iam_role,
        is_active: createUserForm.is_active,
        access_role: createUserForm.access_role,
        cuit_code: createUserForm.cuit_code
      };
      
      if (!token) {
        showNotification('error', 'No hay token de autenticación. Por favor, inicia sesión nuevamente.');
        return;
      }
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Éxito - cerrar modal y limpiar formulario
        setShowCreateModal(false);
        setCreateUserForm({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          iam_role: 'VIEWER',
          client_id: '',
          is_active: true,
          access_role: 'AllAccess',
          cuit_code: ''
        });
        setFormErrors({});
        
        // Mostrar mensaje de éxito
        showNotification('success', 'Usuario creado exitosamente');
        
        // Recargar lista de usuarios
        loadUsers();
      } else {
        // Error del servidor
        showNotification('error', 'Error al crear el usuario');
      }
    } catch (error) {
      showNotification('error', 'Error de conexión al crear el usuario');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserForm({
      username: user.username,
      email: user.email,
      password: '', // Dejar vacío para no cambiar contraseña
      iam_role: user.iam_role,
      client_id: user.client?.id || '', // Usar string vacío para input controlado
      is_active: user.is_active,
      access_role: 'AllAccess', // Valor por defecto ya que User no tiene esta propiedad
      cuit_code: '' // Valor por defecto ya que User no tiene esta propiedad
    });
    setShowEditModal(true);
    setFormErrors({});
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeletingUser(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      const token = authData ? JSON.parse(authData).accessToken : null;
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('success', `Usuario "${userToDelete.username}" eliminado exitosamente`);
        loadUsers(); // Recargar la lista
        setShowDeleteModal(false);
        setUserToDelete(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('error', 'Error al eliminar el usuario: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsDeletingUser(false);
    }
  };

  const confirmDeleteChatbot = async () => {
    if (!chatbotToDelete) return;

    setIsDeletingChatbot(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      const token = authData ? JSON.parse(authData).accessToken : null;
      
      const response = await fetch(`/api/admin/chatbots?chatbot_id=${chatbotToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showNotification('success', 'Chatbot eliminado exitosamente');
        loadUsers(); // Recargar la lista
        setShowDeleteChatbotModal(false);
        setChatbotToDelete(null);
      } else {
        const errorData = await response.json();
        showNotification('error', errorData.error || 'Error al eliminar el chatbot');
      }
    } catch (error) {
      console.error('Error deleting chatbot:', error);
      showNotification('error', 'Error de conexión al eliminar');
    } finally {
      setIsDeletingChatbot(false);
    }
  };

  const handleEditFormChange = (field: string, value: string | boolean | null) => {
    setEditUserForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateEditForm = () => {
    const errors: any = {};
    
    if (!editUserForm.username.trim()) {
      errors.username = 'El nombre de usuario es requerido';
    }
    
    if (!editUserForm.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editUserForm.email)) {
      errors.email = 'El formato del email no es válido';
    }
    
    // Solo validar contraseña si se está intentando cambiar
    if (editUserForm.password && editUserForm.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    // Validación del código CUIT para distribuidores y cliente Bayer
    const selectedClient = clients.find(client => client.id === editUserForm.client_id);
    const isBayerClient = selectedClient?.nombre?.toLowerCase().includes('bayer');
    
    if (isBayerClient && editUserForm.access_role === 'DISTRIBUIDOR_ACCESS') {
      if (!editUserForm.cuit_code.trim()) {
        errors.cuit_code = 'El código CUIT es requerido para distribuidores';
      } else {
        // Validar formato CUIT: 11 dígitos numéricos
        const cuitRegex = /^\d{11}$/;
        if (!cuitRegex.test(editUserForm.cuit_code)) {
          errors.cuit_code = 'El CUIT debe contener exactamente 11 dígitos numéricos';
        }
      }
    }
    
    return errors;
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;
    
    const errors = validateEditForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setIsUpdatingUser(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      const token = authData ? JSON.parse(authData).accessToken : null;
      
      // Preparar datos para enviar (excluir contraseña si está vacía)
      const updateData: any = {
        username: editUserForm.username,
        email: editUserForm.email,
        iam_role: editUserForm.iam_role,
        client_id: editUserForm.client_id || null,
        is_active: editUserForm.is_active,
        access_role: editUserForm.access_role,
        cuit_code: editUserForm.cuit_code
      };
      
      // Solo incluir contraseña si se proporcionó una nueva
      if (editUserForm.password.trim()) {
        updateData.password = editUserForm.password;
      }
      
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        showNotification('success', `Usuario "${editUserForm.username}" actualizado exitosamente`);
        
        // Actualización optimista del estado local
        setUsers(prevUsers => prevUsers.map(u => 
          u.id === editingUser.id 
            ? { 
                ...u, 
                ...updateData,
                // Reconstruir objeto client si cambió client_id
                client: updateData.client_id 
                  ? clients.find(c => c.id === updateData.client_id) || u.client
                  : u.client
              } 
            : u
        ));
        
        setShowEditModal(false);
        setEditingUser(null);
        setEditUserForm({
          username: '',
          email: '',
          password: '',
          iam_role: 'VIEWER',
          client_id: '',
          is_active: true,
          access_role: 'AllAccess',
          cuit_code: ''
        });
        setFormErrors({});
      } else {
        const errorData = await response.json();
        if (errorData.errors) {
          setFormErrors(errorData.errors);
        } else {
          throw new Error(errorData.message || 'Error al actualizar usuario');
        }
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification('error', 'Error al actualizar el usuario: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.iam_role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header con acciones */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl ring-1 ring-white/5">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <FiUsers className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Gestión de Usuarios</h3>
                <p className="text-sm text-gray-400">Administra usuarios del sistema</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-400 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
              >
                <FiFilter className="w-4 h-4 mr-2" />
                Filtros
              </button>
              
              <button 
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-400 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Exportar
              </button>
              
              {/* Solo mostrar botón de crear usuario para super_admin */}
              {userRole === 'super_admin' && (
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiPlus className="w-4 h-4 mr-2" />
                  Nuevo Usuario
                </button>
              )}
            </div>
          </div>

          {/* Barra de búsqueda y filtros */}
          <div className="mt-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FiSearch className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar usuarios por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full p-3 pl-10 text-sm text-white border border-gray-700 rounded-lg bg-gray-800/50 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="bg-gray-800/50 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3"
                >
                  <option value="all">Todos los roles</option>
                  <option value="SUPERADMIN">Super Administrador</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Visualizador</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden ring-1 ring-white/5">
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-white">
                Usuarios ({filteredUsers.length})
              </h4>
              {/* Mensaje informativo para rol admin */}
              {userRole === 'admin' && (
                <p className="text-sm text-yellow-400 mt-1 flex items-center">
                  <FiInfo className="w-4 h-4 mr-1" />
                  Modo solo lectura - Contacte al super administrador para modificaciones
                </p>
              )}
            </div>
            <button 
              onClick={loadUsers}
              className="inline-flex items-center p-2 text-sm font-medium text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6">

          {/* Tabla de usuarios */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-400">Cargando usuarios...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiUsers className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No se encontraron usuarios</h3>
              <p className="text-gray-400">No hay usuarios que coincidan con los filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full text-sm text-left text-gray-400 table-fixed">
                <thead className="text-xs text-gray-400 uppercase bg-white/5">
                  <tr>
                    <th scope="col" className="px-4 py-3" style={{width: '20%'}}>Usuario</th>
                    <th scope="col" className="px-4 py-3" style={{width: '18%'}}>Email</th>
                    <th scope="col" className="px-4 py-3" style={{width: '12%'}}>Rol</th>
                    <th scope="col" className="px-4 py-3" style={{width: '15%'}}>Cliente</th>
                    <th scope="col" className="px-4 py-3" style={{width: '12%'}}>Estado</th>
                    <th scope="col" className="px-4 py-3" style={{width: '13%'}}>Fecha Registro</th>
                    <th scope="col" className="px-4 py-3" style={{width: '10%'}}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const clientData = user.client;
                    return (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3" style={{width: '20%'}}>
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-blue-600/20 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                              <span className="text-blue-400 font-medium text-xs">
                                {user.username?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-white truncate" title={user.username}>{user.username}</div>
                              <div className="text-xs text-gray-400 truncate">ID: {user.id.slice(0, 6)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{width: '18%'}}>
                          <div className="text-sm text-white truncate" title={user.email}>{user.email}</div>
                        </td>
                        <td className="px-4 py-3" style={{width: '12%'}}>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.iam_role === 'SUPERADMIN' 
                              ? 'bg-red-600/20 text-red-400'
                              : user.iam_role === 'ADMIN'
                              ? 'bg-purple-600/20 text-purple-400'
                              : user.iam_role === 'EDITOR'
                              ? 'bg-yellow-600/20 text-yellow-400'
                              : 'bg-blue-600/20 text-blue-400'
                          }`}>
                            {user.iam_role === 'SUPERADMIN' ? 'Super Administrador' : 
                             user.iam_role === 'ADMIN' ? 'Administrador' :
                             user.iam_role === 'EDITOR' ? 'Editor' : 'Visualizador'}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{width: '15%'}}>
                          <div className="text-sm text-white truncate" title={clientData ? clientData.nombre : 'Sin asignar'}>
                            {clientData ? clientData.nombre : 'Sin asignar'}
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{width: '12%'}}>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_active
                              ? 'bg-green-600/20 text-green-400'
                              : 'bg-red-600/20 text-red-400'
                          }`}>
                            <div className={`w-1 h-1 rounded-full mr-1 ${
                              user.is_active ? 'bg-green-400' : 'bg-red-400'
                            }`}></div>
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{width: '13%'}}>
                          <div className="text-sm text-white">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {user.created_at ? new Date(user.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{width: '10%'}}>
                          <div className="flex items-center justify-center space-x-1">
                            {userRole === 'super_admin' ? (
                              // Acciones completas para super_admin
                              <>
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="inline-flex items-center justify-center w-7 h-7 text-blue-400 bg-blue-600/20 rounded-md hover:bg-blue-600/40 transition-colors"
                                  title="Editar usuario"
                                >
                                  <FiEdit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  className="inline-flex items-center justify-center w-7 h-7 text-red-400 bg-red-600/20 rounded-md hover:bg-red-600/40 transition-colors"
                                  title="Eliminar usuario"
                                >
                                  <FiTrash2 className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              // Solo vista para admin
                              <span className="text-xs text-gray-500 italic">Solo lectura</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {filteredUsers.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700 dark:text-gray-400">
                Mostrando <span className="font-medium">{filteredUsers.length}</span> de <span className="font-medium">{users.length}</span> usuarios
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                  Anterior
                </button>
                <button className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de crear usuario - Formulario funcional */}
      <ModalPortal>
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center w-full h-full bg-black/70 backdrop-blur-sm p-4"
            >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
                <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Crear Nuevo Usuario
                  </h3>
                  <button 
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateUserForm({
                          username: '',
                          email: '',
                          password: '',
                          confirmPassword: '',
                          iam_role: 'VIEWER',
                          client_id: '',
                          is_active: true,
                          access_role: 'AllAccess',
                          cuit_code: ''
                        });
                      setFormErrors({});
                    }}
                    className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                  >
                    <FiXCircle className="w-3 h-3" />
                    <span className="sr-only">Cerrar modal</span>
                  </button>
                </div>
                
                <form onSubmit={handleCreateUser} className="p-4 md:p-5">
                  <div className="space-y-4">
                    {/* Nombre de usuario */}
                    <div>
                      <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Nombre de Usuario *
                      </label>
                      <input
                        type="text"
                        id="username"
                        value={createUserForm.username}
                        onChange={(e) => handleFormChange('username', e.target.value)}
                        className={`bg-gray-50 border text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white ${
                          formErrors.username ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="usuario123"
                        required
                      />
                      {formErrors.username && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{formErrors.username}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={createUserForm.email}
                        onChange={(e) => handleFormChange('email', e.target.value)}
                        className={`bg-gray-50 border text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white ${
                          formErrors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="usuario@empresa.com"
                        required
                      />
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{formErrors.email}</p>
                      )}
                    </div>

                    {/* Contraseña */}
                    <div>
                      <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Contraseña *
                      </label>
                      <input
                        type="password"
                        id="password"
                        value={createUserForm.password}
                        onChange={(e) => handleFormChange('password', e.target.value)}
                        className={`bg-gray-50 border text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white ${
                          formErrors.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="••••••••"
                        required
                      />
                      {formErrors.password && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{formErrors.password}</p>
                      )}
                    </div>

                    {/* Confirmar contraseña */}
                    <div>
                      <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Confirmar Contraseña *
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={createUserForm.confirmPassword}
                        onChange={(e) => handleFormChange('confirmPassword', e.target.value)}
                        className={`bg-gray-50 border text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white ${
                          formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="••••••••"
                        required
                      />
                      {formErrors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{formErrors.confirmPassword}</p>
                      )}
                    </div>

                    {/* Rol */}
                    <div>
                      <label htmlFor="iam_role" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Rol
                      </label>
                      <select
                        id="iam_role"
                        value={createUserForm.iam_role}
                        onChange={(e) => handleFormChange('iam_role', e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                      >
                        <option value="VIEWER">Visualizador</option>
                        <option value="EDITOR">Editor</option>
                        <option value="ADMIN">Administrador</option>
                        <option value="SUPERADMIN">Super Administrador</option>
                      </select>
                    </div>
                  </div>

                  {/* Cliente */}
                  <div>
                    <label htmlFor="client_id" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Cliente
                    </label>
                    <select
                      id="client_id"
                      value={createUserForm.client_id || ''}
                      onChange={(e) => handleFormChange('client_id', e.target.value || '')}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                    >
                      <option value="">Sin asignar</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rol de Acceso - Solo visible cuando se selecciona cliente Bayer */}
                  {(() => {
                    const selectedClient = clients.find(client => client.id === createUserForm.client_id);
                    const isBayerClient = selectedClient?.nombre?.toLowerCase().includes('bayer');
                    
                    return isBayerClient ? (
                      <div>
                        <label htmlFor="access_role" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                          Rol de Acceso
                        </label>
                        <select
                          id="access_role"
                          value={createUserForm.access_role}
                          onChange={(e) => handleFormChange('access_role', e.target.value)}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                        >
                          <option value="AllAccess">Total Acceso</option>
                          <option value="DISTRIBUIDOR_ACCESS">Distribuidor</option>
                        </select>
                      </div>
                    ) : null;
                  })()}

                  {/* Código CUIT - Solo visible cuando se selecciona Distribuidor y cliente Bayer */}
                  {(() => {
                    const selectedClient = clients.find(client => client.id === createUserForm.client_id);
                    const isBayerClient = selectedClient?.nombre?.toLowerCase().includes('bayer');
                    
                    return isBayerClient && createUserForm.access_role === 'DISTRIBUIDOR_ACCESS' ? (
                      <div>
                        <label htmlFor="cuit_code" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                          Código CUIT *
                        </label>
                        <input
                          type="text"
                          id="cuit_code"
                          value={createUserForm.cuit_code}
                          onChange={(e) => handleFormChange('cuit_code', e.target.value)}
                          className={`bg-gray-50 border text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white ${
                            formErrors.cuit_code ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="12345678901"
                          maxLength={11}
                          required
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Formato: 11 dígitos numéricos (ej: 20123456789)
                        </p>
                        {formErrors.cuit_code && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-500">{formErrors.cuit_code}</p>
                        )}
                      </div>
                    ) : null;
                  })()}

                  {/* Botones de acción */}
                  <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreateUserForm({
                          username: '',
                          email: '',
                          password: '',
                          confirmPassword: '',
                          iam_role: 'VIEWER',
                          client_id: '',
                          is_active: true,
                          access_role: 'AllAccess',
                          cuit_code: ''
                        });
                        setFormErrors({});
                      }}
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingUser}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                    >
                      {isCreatingUser ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creando...
                        </>
                      ) : (
                        <>
                          <FiPlus className="w-4 h-4 mr-2" />
                          Crear Usuario
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal de editar usuario */}
      <ModalPortal>
        <AnimatePresence>
          {showEditModal && editingUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center w-full h-full bg-black/70 backdrop-blur-sm p-4"
            >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
                <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Editar Usuario: {editingUser.username}
                  </h3>
                  <button 
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                      setEditUserForm({
                        username: '',
                        email: '',
                        password: '',
                        iam_role: 'VIEWER',
                        client_id: '',
                        is_active: true,
                        access_role: 'AllAccess',
                        cuit_code: ''
                      });
                      setFormErrors({});
                    }}
                    className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                  >
                    <FiXCircle className="w-3 h-3" />
                    <span className="sr-only">Cerrar modal</span>
                  </button>
                </div>
                
                <form onSubmit={handleUpdateUser} className="p-4 md:p-5">
                  <div className="space-y-4">
                    {/* Nombre de usuario */}
                    <div>
                      <label htmlFor="edit_username" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Nombre de Usuario *
                      </label>
                      <input
                        type="text"
                        id="edit_username"
                        value={editUserForm.username}
                        onChange={(e) => handleEditFormChange('username', e.target.value)}
                        className={`bg-gray-50 border text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white ${
                          formErrors.username ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="usuario123"
                        required
                      />
                      {formErrors.username && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{formErrors.username}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="edit_email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="edit_email"
                        value={editUserForm.email}
                        onChange={(e) => handleEditFormChange('email', e.target.value)}
                        className={`bg-gray-50 border text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white ${
                          formErrors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="usuario@empresa.com"
                        required
                      />
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{formErrors.email}</p>
                      )}
                    </div>

                    {/* Nueva contraseña (opcional) */}
                    <div>
                      <label htmlFor="edit_password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Nueva Contraseña (opcional)
                      </label>
                      <input
                        type="password"
                        id="edit_password"
                        value={editUserForm.password}
                        onChange={(e) => handleEditFormChange('password', e.target.value)}
                        className={`bg-gray-50 border text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white ${
                          formErrors.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="••••••••"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Deja en blanco para mantener la contraseña actual
                      </p>
                      {formErrors.password && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{formErrors.password}</p>
                      )}
                    </div>

                    {/* Rol */}
                    <div>
                      <label htmlFor="edit_iam_role" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Rol
                      </label>
                      <select
                        id="edit_iam_role"
                        value={editUserForm.iam_role}
                        onChange={(e) => handleEditFormChange('iam_role', e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                      >
                        <option value="VIEWER">Visualizador</option>
                        <option value="EDITOR">Editor</option>
                        <option value="ADMIN">Administrador</option>
                        <option value="SUPERADMIN">Super Administrador</option>
                      </select>
                    </div>

                    {/* Cliente */}
                    <div>
                      <label htmlFor="edit_client_id" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Cliente
                      </label>
                      <select
                        id="edit_client_id"
                        value={editUserForm.client_id || ''}
                        onChange={(e) => handleEditFormChange('client_id', e.target.value || null)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                      >
                        <option value="">Sin asignar</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rol de Acceso - Solo visible cuando se selecciona cliente Bayer */}
                    {(() => {
                      const selectedClient = clients.find(client => client.id === editUserForm.client_id);
                      const isBayerClient = selectedClient?.nombre?.toLowerCase().includes('bayer');
                      
                      return isBayerClient ? (
                        <div>
                          <label htmlFor="edit_access_role" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                            Rol de Acceso
                          </label>
                          <select
                            id="edit_access_role"
                            value={editUserForm.access_role}
                            onChange={(e) => handleEditFormChange('access_role', e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                          >
                            <option value="AllAccess">Total Acceso</option>
                            <option value="DISTRIBUIDOR_ACCESS">Distribuidor</option>
                          </select>
                        </div>
                      ) : null;
                    })()}

                    {/* Código CUIT - Solo visible cuando se selecciona Distribuidor y cliente Bayer */}
                    {(() => {
                      const selectedClient = clients.find(client => client.id === editUserForm.client_id);
                      const isBayerClient = selectedClient?.nombre?.toLowerCase().includes('bayer');
                      
                      return isBayerClient && editUserForm.access_role === 'DISTRIBUIDOR_ACCESS' ? (
                        <div>
                          <label htmlFor="edit_cuit_code" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                            Código CUIT *
                          </label>
                          <input
                            type="text"
                            id="edit_cuit_code"
                            value={editUserForm.cuit_code}
                            onChange={(e) => handleEditFormChange('cuit_code', e.target.value)}
                            className={`bg-gray-50 border text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white ${
                              formErrors.cuit_code ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="12345678901"
                            maxLength={11}
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Formato: 11 dígitos numéricos (ej: 20123456789)
                          </p>
                          {formErrors.cuit_code && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-500">{formErrors.cuit_code}</p>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Separador visual */}
                  <div className="border-t border-gray-200 dark:border-gray-600 my-6"></div>

                  {/* Estado activo */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Estado del Usuario</h4>
                    <div className="flex items-center">
                      <input
                        id="edit_is_active"
                        type="checkbox"
                        checked={editUserForm.is_active}
                        onChange={(e) => handleEditFormChange('is_active', e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <label htmlFor="edit_is_active" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                        Usuario activo
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Los usuarios inactivos no podrán iniciar sesión en el sistema
                    </p>
                  </div>

                  {/* Botones */}
                  <div className="flex items-center space-x-4">
                    <button
                      type="submit"
                      disabled={isUpdatingUser}
                      className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdatingUser ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                          Actualizando...
                        </>
                      ) : (
                        'Actualizar Usuario'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingUser(null);
                        setEditUserForm({
                          username: '',
                          email: '',
                          password: '',
                          iam_role: 'VIEWER',
                          client_id: '',
                          is_active: true,
                          access_role: 'AllAccess',
                          cuit_code: ''
                        });
                        setFormErrors({});
                      }}
                      className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal de confirmación de eliminación */}
      <ModalPortal>
        <AnimatePresence>
          {showDeleteModal && userToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center w-full h-full bg-black/70 backdrop-blur-sm p-4"
            >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md"
            >
              <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
                <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Confirmar Eliminación
                  </h3>
                  <button 
                    onClick={() => {
                      setShowDeleteModal(false);
                      setUserToDelete(null);
                    }}
                    className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                  >
                    <FiXCircle className="w-3 h-3" />
                    <span className="sr-only">Cerrar modal</span>
                  </button>
                </div>
                
                <div className="p-4 md:p-5">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-4">
                      <FiTrash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        ¿Eliminar usuario?
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Esta acción no se puede deshacer
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                          {userToDelete.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{userToDelete.username}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{userToDelete.email}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {userToDelete.client?.nombre || 'Sin cliente asignado'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    ¿Estás seguro de que quieres eliminar el usuario <strong>{userToDelete.username}</strong>? 
                    Esta acción eliminará permanentemente toda la información asociada al usuario.
                  </p>

                  {/* Botones */}
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={confirmDeleteUser}
                      disabled={isDeletingUser}
                      className="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeletingUser ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                          Eliminando...
                        </>
                      ) : (
                        'Sí, eliminar usuario'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteModal(false);
                        setUserToDelete(null);
                      }}
                      className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal de confirmación para eliminar chatbot */}
      <ModalPortal>
        <AnimatePresence>
          {showDeleteChatbotModal && chatbotToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4"
            >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gradient-to-br from-[#1f1f1f] to-[#2a2a2a] border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-4">
                    <FiTrash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Eliminar Cliente
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Esta acción no se puede deshacer
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                        {chatbotToDelete.nombre?.charAt(0).toUpperCase() || 'C'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{chatbotToDelete.nombre}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{chatbotToDelete.descripcion}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        ID: {chatbotToDelete.id}
                      </p>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  ¿Estás seguro de que quieres eliminar el cliente <strong>{chatbotToDelete.nombre}</strong>? 
                  Esta acción eliminará permanentemente toda la información asociada al cliente.
                </p>

                {/* Botones */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={confirmDeleteChatbot}
                    disabled={isDeletingChatbot}
                    className="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeletingChatbot ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                        Eliminando...
                      </>
                    ) : (
                      'Sí, eliminar cliente'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteChatbotModal(false);
                      setChatbotToDelete(null);
                    }}
                    className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </motion.div>
  );
}

// Componente para configuración del sistema
function SystemSettings() {
  const [config, setConfig] = useState({
    systemName: 'Evolve Chatbot Platform',
    maxUsersPerClient: 50,
    sessionTimeoutMinutes: 1440, // 24 horas
    enableRegistration: true,
    requireEmailVerification: true,
    enableMaintenanceMode: false,
    allowFileUploads: true,
    maxFileSize: 10, // MB
    enableAnalytics: true,
    logLevel: 'info'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Cargar configuración actual
  useEffect(() => {
    const loadConfig = () => {
      const savedConfig = localStorage.getItem('evolve-system-config');
      if (savedConfig) {
        try {
          setConfig({ ...config, ...JSON.parse(savedConfig) });
        } catch (e) {
          console.error('Error cargando configuración:', e);
        }
      }
    };
    loadConfig();
  }, []);

  // Guardar configuración
  const saveConfiguration = async () => {
    setIsLoading(true);
    try {
      // Simular guardado en base de datos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Guardar localmente también
      localStorage.setItem('evolve-system-config', JSON.stringify(config));
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error guardando configuración:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Resetear a valores por defecto
  const resetToDefaults = () => {
    const defaultConfig = {
      systemName: 'Evolve Chatbot Platform',
      maxUsersPerClient: 50,
      sessionTimeoutMinutes: 1440,
      enableRegistration: true,
      requireEmailVerification: true,
      enableMaintenanceMode: false,
      allowFileUploads: true,
      maxFileSize: 10,
      enableAnalytics: true,
      logLevel: 'info'
    };
    setConfig(defaultConfig);
  };

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header - Estilo Flowbite */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl ring-1 ring-white/5">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <FiSettings className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configuración del Sistema</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ajustes generales y configuración avanzada</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={resetToDefaults}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
              >
                <FiRefreshCw className="w-4 h-4 mr-2" />
                Restablecer
              </button>
              
              <button 
                onClick={saveConfiguration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <FiCheckCircle className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>

          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 text-sm text-green-400 rounded-lg bg-green-500/10 border border-green-500/20"
            >
              <div className="flex items-center">
                <FiCheckCircle className="w-4 h-4 mr-2" />
                Configuración guardada exitosamente
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Configuraciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración General */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl ring-1 ring-white/5">
          <div className="flex items-center mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-lg mr-3">
              <FiSettings className="w-5 h-5 text-blue-400" />
            </div>
            <h4 className="text-lg font-semibold text-white">Configuración General</h4>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nombre del Sistema</label>
              <input
                type="text"
                value={config.systemName}
                onChange={(e) => setConfig({...config, systemName: e.target.value})}
                className="block w-full px-3 py-2.5 text-sm text-white bg-black/20 border border-white/10 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Máximo usuarios por cliente</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={config.maxUsersPerClient}
                onChange={(e) => setConfig({...config, maxUsersPerClient: parseInt(e.target.value)})}
                className="block w-full px-3 py-2.5 text-sm text-white bg-black/20 border border-white/10 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tiempo de sesión (minutos)</label>
              <input
                type="number"
                min="60"
                max="43200"
                value={config.sessionTimeoutMinutes}
                onChange={(e) => setConfig({...config, sessionTimeoutMinutes: parseInt(e.target.value)})}
                className="block w-full px-3 py-2.5 text-sm text-white bg-black/20 border border-white/10 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Duración de las sesiones de usuario</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nivel de logging</label>
              <select
                value={config.logLevel}
                onChange={(e) => setConfig({...config, logLevel: e.target.value})}
                className="bg-black/20 border border-white/10 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              >
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
          </div>
        </div>

        {/* Configuración de Seguridad y Registro */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl ring-1 ring-white/5">
          <div className="flex items-center mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-lg mr-3">
              <FiShield className="w-5 h-5 text-green-400" />
            </div>
            <h4 className="text-lg font-semibold text-white">Seguridad y Registro</h4>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div>
                <p className="text-white text-sm font-medium">Permitir auto-registro</p>
                <p className="text-gray-400 text-xs">Los usuarios pueden registrarse automáticamente</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={config.enableRegistration}
                  onChange={() => setConfig({...config, enableRegistration: !config.enableRegistration})}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div>
                <p className="text-white text-sm font-medium">Verificación por email</p>
                <p className="text-gray-400 text-xs">Requerir verificación de email para nuevos usuarios</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={config.requireEmailVerification}
                  onChange={() => setConfig({...config, requireEmailVerification: !config.requireEmailVerification})}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div>
                <p className="text-white text-sm font-medium">Modo mantenimiento</p>
                <p className="text-gray-400 text-xs">Deshabilitar acceso temporal al sistema</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={config.enableMaintenanceMode}
                  onChange={() => setConfig({...config, enableMaintenanceMode: !config.enableMaintenanceMode})}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div>
                <p className="text-white text-sm font-medium">Permitir subida de archivos</p>
                <p className="text-gray-400 text-xs">Los usuarios pueden subir archivos al chat</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={config.allowFileUploads}
                  onChange={() => setConfig({...config, allowFileUploads: !config.allowFileUploads})}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {config.allowFileUploads && (
              <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <label className="block text-sm font-medium text-gray-300 mb-2">Tamaño máximo de archivo (MB)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.maxFileSize}
                  onChange={(e) => setConfig({...config, maxFileSize: parseInt(e.target.value)})}
                  className="block w-full px-3 py-2.5 text-sm text-white bg-black/20 border border-white/10 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div>
                <p className="text-white text-sm font-medium">Habilitar analíticas</p>
                <p className="text-gray-400 text-xs">Recopilar estadísticas de uso del sistema</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={config.enableAnalytics}
                  onChange={() => setConfig({...config, enableAnalytics: !config.enableAnalytics})}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones del Sistema */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl ring-1 ring-white/5">
        <div className="flex items-center mb-6">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-500/20 rounded-lg mr-3">
            <FiDatabase className="w-5 h-5 text-purple-400" />
          </div>
          <h4 className="text-lg font-semibold text-white">Acciones del Sistema</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-600/10 to-blue-800/10 hover:from-blue-600/20 hover:to-blue-800/20 rounded-xl transition-all duration-200 shadow-sm border border-blue-500/20 group">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-200 shadow-lg shadow-blue-900/20">
              <FiDownload className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-semibold text-sm mb-1">Exportar BD</span>
            <span className="text-gray-400 text-xs text-center">Backup completo</span>
          </button>
          
          <button className="flex flex-col items-center p-6 bg-gradient-to-br from-green-600/10 to-green-800/10 hover:from-green-600/20 hover:to-green-800/20 rounded-xl transition-all duration-200 shadow-sm border border-green-500/20 group">
            <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-200 shadow-lg shadow-green-900/20">
              <FiRefreshCw className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-semibold text-sm mb-1">Reiniciar</span>
            <span className="text-gray-400 text-xs text-center">Servicios</span>
          </button>
          
          <button className="flex flex-col items-center p-6 bg-gradient-to-br from-yellow-600/10 to-yellow-800/10 hover:from-yellow-600/20 hover:to-yellow-800/20 rounded-xl transition-all duration-200 shadow-sm border border-yellow-500/20 group">
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-500 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-200 shadow-lg shadow-yellow-900/20">
              <FiTrash2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-semibold text-sm mb-1">Limpiar</span>
            <span className="text-gray-400 text-xs text-center">Logs antiguos</span>
          </button>
          
          <button className="flex flex-col items-center p-6 bg-gradient-to-br from-purple-600/10 to-purple-800/10 hover:from-purple-600/20 hover:to-purple-800/20 rounded-xl transition-all duration-200 shadow-sm border border-purple-500/20 group">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-600 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-200 shadow-lg shadow-purple-900/20">
              <FiActivity className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-semibold text-sm mb-1">Monitor</span>
            <span className="text-gray-400 text-xs text-center">Estado salud</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Componente para gestión de clientes mejorado
function ClientsManagement({ showNotification, openCreateModal = false }: { showNotification: (type: 'success' | 'error' | 'info', message: string) => void, openCreateModal?: boolean }) {
  const [chatbots, setChatbots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(openCreateModal);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingChatbot, setEditingChatbot] = useState<any>(null);
  const [formData, setFormData] = useState({
    chatbot_id: '',
    chatbot_name: '',
    company_name: '',
    gcp_name: '',
    welcome_message: 'Hola, soy tu asistente virtual especializado. ¿En qué puedo ayudarte hoy?',
    about: 'Soy un asistente virtual inteligente diseñado para ayudarte con tus consultas.',
    suggested_prompts: ['¿Cómo puedes ayudarme?', '¿Qué servicios ofreces?', 'Cuéntame más sobre tu empresa'],
    example_questions: ['¿Cuáles son tus horarios de atención?', '¿Cómo puedo contactar con soporte?', '¿Qué productos o servicios tienes disponibles?'],
    api_endpoint: '/api/chat',
    custom_prompt: 'Eres un asistente virtual profesional y amigable. Tu objetivo es ayudar a los usuarios de manera eficiente y precisa. Siempre mantén un tono cordial y profesional. Si no sabes algo, admítelo honestamente y ofrece alternativas para ayudar.',
    system_context: 'Contexto del sistema: Eres parte de una plataforma de chatbots empresariales. Debes proporcionar respuestas útiles y relevantes basadas en la información disponible.'
  });

  useEffect(() => {
    loadChatbots();
  }, []);

  // Efecto para abrir el modal cuando se pasa openCreateModal como true
  useEffect(() => {
    if (openCreateModal) {
      setShowCreateModal(true);
    }
  }, [openCreateModal]);

  const loadChatbots = async () => {
    setLoading(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      const token = authData ? JSON.parse(authData).accessToken : null;
      
      const response = await fetch('/api/admin/chatbots', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatbots(data.data?.chatbots || []);
      } else {
        console.error('Error loading chatbots:', response.status);
      }
    } catch (error) {
      console.error('Error loading chatbots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayInputChange = (field: string, index: number, value: string) => {
    setFormData(prev => {
      const currentValue = prev[field as keyof typeof prev] as string[];
      return {
        ...prev,
        [field]: currentValue.map((item: string, i: number) => i === index ? value : item)
      };
    });
  };

  const addArrayItem = (field: string) => {
    setFormData(prev => {
      const currentValue = prev[field as keyof typeof prev] as string[];
      return {
        ...prev,
        [field]: [...currentValue, '']
      };
    });
  };

  const removeArrayItem = (field: string, index: number) => {
    setFormData(prev => {
      const currentValue = prev[field as keyof typeof prev] as string[];
      return {
        ...prev,
        [field]: currentValue.filter((_: any, i: number) => i !== index)
      };
    });
  };

  const resetForm = () => {
    setFormData({
      chatbot_id: '',
      chatbot_name: '',
      company_name: '',
      gcp_name: '',
      welcome_message: 'Hola, soy tu asistente virtual especializado. ¿En qué puedo ayudarte hoy?',
      about: 'Soy un asistente virtual inteligente diseñado para ayudarte con tus consultas.',
      suggested_prompts: ['¿Cómo puedes ayudarme?', '¿Qué servicios ofreces?', 'Cuéntame más sobre tu empresa'],
      example_questions: ['¿Cuáles son tus horarios de atención?', '¿Cómo puedo contactar con soporte?', '¿Qué productos o servicios tienes disponibles?'],
      api_endpoint: '/api/chat',
      custom_prompt: 'Eres un asistente virtual profesional y amigable. Tu objetivo es ayudar a los usuarios de manera eficiente y precisa. Siempre mantén un tono cordial y profesional. Si no sabes algo, admítelo honestamente y ofrece alternativas para ayudar.',
      system_context: 'Contexto del sistema: Eres parte de una plataforma de chatbots empresariales. Debes proporcionar respuestas útiles y relevantes basadas en la información disponible.'
    });
    setEditingChatbot(null);
  };

  const handleSave = async () => {
    if (!formData.chatbot_id || !formData.chatbot_name || !formData.company_name) {
      showNotification('error', 'Por favor completa todos los campos requeridos');
      return;
    }

    setIsCreating(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      const token = authData ? JSON.parse(authData).accessToken : null;
      
      const url = editingChatbot ? '/api/admin/chatbots' : '/api/admin/chatbots';
      const method = editingChatbot ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showNotification('success', editingChatbot ? 'Chatbot actualizado exitosamente' : 'Chatbot creado exitosamente');
        setShowCreateModal(false);
        resetForm();
        loadChatbots();
      } else {
        const errorData = await response.json();
        showNotification('error', errorData.error || 'Error al guardar el chatbot');
      }
    } catch (error) {
      console.error('Error saving chatbot:', error);
      showNotification('error', 'Error de conexión al guardar');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (chatbot: any) => {
    setFormData({
      chatbot_id: chatbot.id,
      chatbot_name: chatbot.name,
      company_name: chatbot.company_name,
      gcp_name: chatbot.gcp_name || '',
      welcome_message: chatbot.welcome_message || 'Hola, soy tu asistente virtual especializado. ¿En qué puedo ayudarte hoy?',
      about: chatbot.about || 'Soy un asistente virtual inteligente diseñado para ayudarte con tus consultas.',
      suggested_prompts: chatbot.suggested_prompts || ['¿Cómo puedes ayudarme?', '¿Qué servicios ofreces?', 'Cuéntame más sobre tu empresa'],
      example_questions: chatbot.example_questions || ['¿Cuáles son tus horarios de atención?', '¿Cómo puedo contactar con soporte?', '¿Qué productos o servicios tienes disponibles?'],
      api_endpoint: chatbot.api_endpoint || '/api/chat',
      custom_prompt: chatbot.custom_prompt || 'Eres un asistente virtual profesional y amigable. Tu objetivo es ayudar a los usuarios de manera eficiente y precisa. Siempre mantén un tono cordial y profesional. Si no sabes algo, admítelo honestamente y ofrece alternativas para ayudar.',
      system_context: chatbot.system_context || 'Contexto del sistema: Eres parte de una plataforma de chatbots empresariales. Debes proporcionar respuestas útiles y relevantes basadas en la información disponible.'
    });
    setEditingChatbot(chatbot);
    setShowCreateModal(true);
  };

  const handleDelete = (chatbot: any) => {
    showNotification('info', 'Para eliminar chatbots, ve a la sección de Gestión de Usuarios');
  };



  const filteredChatbots = chatbots.filter((chatbot: any) => 
    chatbot.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chatbot.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 ring-1 ring-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">Gestión de Clientes</h3>
            <p className="text-gray-400 mt-1">Administra clientes y organizaciones</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
            >
              <FiFilter className="w-4 h-4" />
              <span>Filtros</span>
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2 shadow-lg"
            >
              <FiPlus className="w-4 h-4" />
              <span>Nuevo Cliente</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-700"
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar clientes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lista de clientes */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden ring-1 ring-white/10">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Cargando clientes...</p>
          </div>
        ) : filteredChatbots.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconMappings.Building className="w-8 h-8 text-purple-400" />
            </div>
            <h5 className="text-xl font-semibold text-white mb-2">
              {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </h5>
            <p className="text-gray-400 mb-6">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando tu primer cliente'}
            </p>
            {!searchTerm && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg transition-all font-medium"
              >
                Agregar Cliente
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredChatbots.map((chatbot) => (
              <div key={chatbot.chatbot_id} className="p-6 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconMappings.Building className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-white mb-1">{chatbot.chatbot_name}</h4>
                      <p className="text-gray-400 text-sm mb-2">{chatbot.company_name || 'Sin descripción'}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <FiClock className="w-3 h-3" />
                          <span>Creado: {new Date(chatbot.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleEdit(chatbot)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <FiEdit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(chatbot)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de creación */}
      <ModalPortal>
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl ring-1 ring-white/5"
            >
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-bold text-white">
                  {editingChatbot ? 'Editar Chatbot' : 'Crear Nuevo Chatbot'}
                </h4>
                <button 
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiXCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {/* Campos básicos */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">ID del Chatbot *</label>
                    <input
                      type="text"
                      value={formData.chatbot_id}
                      onChange={(e) => handleInputChange('chatbot_id', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 transition-colors"
                      placeholder="ej: chatbot-empresa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nombre del Chatbot *</label>
                    <input
                      type="text"
                      value={formData.chatbot_name}
                      onChange={(e) => handleInputChange('chatbot_name', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 transition-colors"
                      placeholder="ej: Asistente Virtual"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Empresa *</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 transition-colors"
                    placeholder="Nombre de la empresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">GCP Name *</label>
                  <input
                    type="text"
                    value={formData.gcp_name}
                    onChange={(e) => handleInputChange('gcp_name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 transition-colors"
                    placeholder="ej: empresa-id"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Mensaje de Bienvenida</label>
                  <textarea
                    value={formData.welcome_message}
                    onChange={(e) => handleInputChange('welcome_message', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 transition-colors"
                    rows={2}
                    placeholder="Mensaje que verá el usuario al iniciar"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descripción</label>
                  <textarea
                    value={formData.about}
                    onChange={(e) => handleInputChange('about', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 transition-colors"
                    rows={2}
                    placeholder="Descripción del chatbot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Prompt Personalizado</label>
                  <textarea
                    value={formData.custom_prompt}
                    onChange={(e) => handleInputChange('custom_prompt', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 transition-colors"
                    rows={3}
                    placeholder="Instrucciones específicas para el comportamiento del chatbot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Contexto del Sistema</label>
                  <textarea
                    value={formData.system_context}
                    onChange={(e) => handleInputChange('system_context', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 transition-colors"
                    rows={2}
                    placeholder="Contexto adicional para el sistema"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button 
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-all font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isCreating}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 rounded-lg transition-all font-medium disabled:opacity-50"
                >
                  {isCreating ? 'Guardando...' : (editingChatbot ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </motion.div>
  );
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [openUserModal, setOpenUserModal] = useState(false);
  const [openClientModal, setOpenClientModal] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [isBayer, setIsBayer] = useState(false);
  const [themeColors, setThemeColors] = useState(getThemeColors());
  const router = useRouter();

  // Hook de analytics reales
  const { weeklyData, overview, loading: loadingAnalytics, error: analyticsError, refresh: refreshAnalytics } = useAnalytics('7d');

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Verificar autenticación y permisos de administrador
  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem('evolve-auth');
      if (authData) {
        try {
          const auth = JSON.parse(authData);
          const now = new Date().getTime();
          const authTime = auth.timestamp || 0;
          const isValid = now - authTime < 24 * 60 * 60 * 1000; // 24 horas
          // Permitir acceso a usuarios con rol 'super_admin' o 'admin'
          const hasAdminAccess = auth.role === 'super_admin' || auth.role === 'admin';
          
          if (auth.isAuthenticated && hasAdminAccess && isValid) {
            setIsAuthenticated(true);
            setAdminUser(auth);
            setUserRole(auth.role);
            
            // Verificar si es usuario Bayer y actualizar tema
            const bayerUser = isBayerAdmin();
            setIsBayer(bayerUser);
            setThemeColors(getThemeColors());
            return true;
          }
        } catch (e) {
          console.error('Error al verificar autenticación:', e);
        }
      }
      return false;
    };

    const isAuth = checkAuth();
    if (!isAuth) {
      router.push('/login');
    } else {
      setLoading(false);
    }
  }, [router]);

  // Cargar estadísticas del dashboard
  useEffect(() => {
    if (isAuthenticated && activeTab === 'dashboard') {
      loadDashboardStats();
    }
  }, [isAuthenticated, activeTab]);

  // Resetear estados de modales cuando se cambie de pestaña
  useEffect(() => {
    if (activeTab !== 'clients') {
      setOpenClientModal(false);
    }
  }, [activeTab]);

  const loadDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      const token = authData ? JSON.parse(authData).accessToken : null;
      
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        localStorage.removeItem('evolve-auth');
        localStorage.removeItem('evolve-selected-client');
        router.push('/login?expired=true');
        return;
      }
      
      if (response.ok) {
        const payload = await response.json();
        const data = payload.data || payload;
        const stats: DashboardStats = {
          totalUsers: data.totalUsers || 0,
          activeUsers: data.activeUsers || 0,
          totalClients: data.totalClients || 0,
          recentUsers: data.recentUsers || [],
          recentClients: data.recentClients || [],
          roleDistribution: data.roleDistribution || []
        };
        setDashboardStats(stats);
      } else {
        const errorText = await response.text();
        throw new Error(`Error del servidor: ${response.status} ${errorText}`);
      }
    } catch (error) {
      const fallbackStats: DashboardStats = {
        totalUsers: 0,
        activeUsers: 0,
        totalClients: 0,
        recentUsers: [],
        recentClients: [],
        roleDistribution: []
      };
      setDashboardStats(fallbackStats);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('evolve-auth');
      localStorage.removeItem('evolve-selected-client');
      router.push('/login?logout=true');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiBarChart, color: 'blue' },
    { id: 'users', label: 'Usuarios', icon: FiUsers, color: 'green' },
    { id: 'clients', label: 'Clientes', icon: IconMappings.Building, color: 'purple' },
    /* Elementos temporalmente ocultos para implementación futura:
    { id: 'connectors', label: 'Conectores', icon: FiLink, color: 'cyan' },
    { id: 'flows', label: 'Flujos', icon: FiGitBranch, color: 'teal' },
    */
    { id: 'settings', label: 'Configuración', icon: FiSettings, color: 'orange' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-center">
          <div className={getBayerClasses(
            "w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4",
            "w-8 h-8 border-2 bayer-primary-border border-t-transparent rounded-full animate-spin mx-auto mb-4"
          )}></div>
          <div className="text-gray-400">Cargando panel de administración...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Estilos dinámicos para Bayer */}
      {isBayer && <div dangerouslySetInnerHTML={{ __html: getBayerDynamicStyles() }} />}
      
    <div className="min-h-screen bg-[#111111] relative overflow-hidden">
      {/* Componente Spotlight como fondo */}
      <div className="absolute inset-0 z-0">
        <Spotlight
          gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 55%, .01) 50%, hsla(210, 100%, 45%, 0) 80%)"
          gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .03) 0, hsla(210, 100%, 55%, .01) 80%, transparent 100%)"
          gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .02) 0, hsla(210, 100%, 45%, .01) 80%, transparent 100%)"
          translateY={-250}
          width={400}
          height={1000}
          smallWidth={180}
          duration={8}
          xOffset={80}
        />
      </div>

      {/* Patrón de fondo sutil */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] z-10"></div>

      <div className="relative z-20 flex">
        {/* Sidebar estilo chatbot */}
        <motion.div 
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="fixed top-0 bottom-0 left-0 z-40 h-full flex-none flex flex-col space-y-4 overflow-hidden bg-black/40 backdrop-blur-xl border-r border-white/10 transition-all duration-300 shadow-2xl w-[280px]"
        >
          {/* Header del sidebar */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center w-full">
              {/* Botón volver al selector - integrado */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/selector')}
                className="mr-3 w-8 h-8 rounded-lg bg-gray-800/60 hover:bg-gray-700/80 flex items-center justify-center transition-all duration-200 border border-gray-700/30 hover:border-gray-600/50 group"
                title="Volver al selector de chatbots"
              >
                <FiArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </motion.button>
              
              <div className="flex-none">
                <div className={getBayerClasses(
                  "h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white",
                  "h-10 w-10 rounded-full overflow-hidden bayer-gradient-primary flex items-center justify-center text-white"
                )}>
                  {isBayer ? (
                    <img 
                      src={getLogoPath()} 
                      alt="Bayer Logo" 
                      className="h-8 w-8 object-contain"
                    />
                  ) : (
                    <FiActivity className="w-6 h-6" />
                  )}
                </div>
              </div>
              <div className="mx-3">
                <p className={getBayerClasses(
                  "mb-0 font-semibold text-white",
                  "mb-0 font-semibold text-white bayer-primary-text"
                )}>Panel Admin {isBayer && 'Bayer'}</p>
                <p className="text-xs text-gray-400">Gestión del sistema</p>
              </div>
            </div>
          </div>

          {/* Barra de búsqueda */}
          <div className="px-4">
            <div className="relative">
              <input 
                type="text" 
                className={getBayerClasses(
                  "w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm focus:bg-white/10",
                  "w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-white focus:outline-none bayer-primary-border transition-colors text-sm focus:bg-white/10"
                )}
                placeholder="Buscar funciones..."
              />
              <div className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400">
                <FiSearch className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Navegación */}
          <div className="px-2">
            <div className="flex items-center justify-between text-xs border-b border-gray-800 pb-2 gap-0.5">
              <button 
                type="button" 
                className={`flex items-center flex-1 justify-center py-2 px-1 rounded-md ${activeTab === 'dashboard' || activeTab === 'users' || activeTab === 'clients' || activeTab === 'chatbots' ? getBayerClasses('bg-blue-600/20 text-blue-400', 'bayer-primary-bg/20 bayer-primary-text') : 'text-gray-400 hover:bg-gray-800/40'}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <FiBarChart className="w-4 h-4 mr-1" />
                <span>Admin</span>
              </button>
              
              {/* Solo mostrar Configuración para super_admin */}
              {userRole === 'super_admin' && (
                <button 
                  type="button" 
                  className={`flex items-center flex-1 justify-center py-2 px-1 rounded-md ${activeTab === 'settings' ? getBayerClasses('bg-blue-600/20 text-blue-400', 'bayer-primary-bg/20 bayer-primary-text') : 'text-gray-400 hover:bg-gray-800/40'}`}
                  onClick={() => setActiveTab('settings')}
                >
                  <FiSettings className="w-4 h-4 mr-1" />
                  <span>Config.</span>
                </button>
              )}
              
              <button 
                type="button" 
                className={`flex items-center flex-1 justify-center py-2 px-1 rounded-md ${activeTab === 'help' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800/40'}`}
                onClick={() => setActiveTab('help')}
              >
                <FiEye className="w-4 h-4 mr-1" />
                <span>Monitor</span>
              </button>
            </div>
          </div>

          {/* Lista de funciones del panel admin */}
          <div className="px-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {(activeTab === 'dashboard' || activeTab === 'users' || activeTab === 'clients' || activeTab === 'chatbots') && (
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">Gestión</h3>
                
                <div 
                  className={`flex w-full items-center rounded-md p-2.5 transition-all duration-300 cursor-pointer ${
                    activeTab === 'dashboard' 
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' 
                      : 'hover:bg-white/5 text-white'
                  }`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  <div className="flex items-center w-full overflow-hidden">
                    <div className="flex-shrink-0 mr-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white ${
                        activeTab === 'dashboard' ? 'bg-blue-600' : 'bg-gray-700'
                      }`}>
                        <FiBarChart className="text-sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-sm">Dashboard</p>
                      <p className="truncate text-xs text-gray-400">Estadísticas del sistema</p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`flex w-full items-center rounded-md p-2.5 transition-all duration-300 cursor-pointer ${
                    activeTab === 'users' 
                      ? 'bg-green-600/20 text-green-400 border border-green-500/20' 
                      : 'hover:bg-white/5 text-white'
                  }`}
                  onClick={() => setActiveTab('users')}
                >
                  <div className="flex items-center w-full overflow-hidden">
                    <div className="flex-shrink-0 mr-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white ${
                        activeTab === 'users' ? 'bg-green-600' : 'bg-gray-700'
                      }`}>
                        <FiUsers className="text-sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-sm">Usuarios</p>
                      <p className="truncate text-xs text-gray-400">Gestión de usuarios</p>
                    </div>
                  </div>
                </div>

                {/* Solo mostrar Clientes para super_admin */}
                {userRole === 'super_admin' && (
                  <div 
                    className={`flex w-full items-center rounded-md p-2.5 transition-all duration-300 cursor-pointer ${
                      activeTab === 'clients' 
                        ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' 
                        : 'hover:bg-white/5 text-white'
                    }`}
                    onClick={() => setActiveTab('clients')}
                  >
                    <div className="flex items-center w-full overflow-hidden">
                      <div className="flex-shrink-0 mr-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white ${
                          activeTab === 'clients' ? 'bg-purple-600' : 'bg-gray-700'
                        }`}>
                          <IconMappings.Building className="text-sm" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-sm">Clientes</p>
                        <p className="truncate text-xs text-gray-400">Gestión de clientes</p>
                      </div>
                    </div>
                  </div>
                )}

                <div 
                  className={`flex w-full items-center rounded-md p-2.5 transition-all duration-300 cursor-pointer ${
                    activeTab === 'chatbots' 
                      ? 'bg-orange-600/20 text-orange-400 border border-orange-500/20' 
                      : 'hover:bg-white/5 text-white'
                  }`}
                  onClick={() => setActiveTab('chatbots')}
                >
                  <div className="flex items-center w-full overflow-hidden">
                    <div className="flex-shrink-0 mr-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white ${
                        activeTab === 'chatbots' ? 'bg-orange-600' : 'bg-gray-700'
                      }`}>
                        <FiPaperclip className="text-sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-sm">Asignaciones</p>
                      <p className="truncate text-xs text-gray-400">Chatbots por usuario</p>
                    </div>
                  </div>
                </div>

                {/* Sección Conectores - Temporalmente oculta para implementación futura
                <div 
                  className={`flex w-full items-center rounded-md p-2.5 transition-all duration-300 cursor-pointer ${
                    activeTab === 'connectors' 
                      ? 'bg-gradient-to-r from-cyan-600/20 to-cyan-700/20 text-cyan-400' 
                      : 'hover:bg-[#1c1c1c] text-white'
                  }`}
                  onClick={() => setActiveTab('connectors')}
                >
                  <div className="flex items-center w-full overflow-hidden">
                    <div className="flex-shrink-0 mr-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white ${
                        activeTab === 'connectors' ? 'bg-cyan-600' : 'bg-gray-700'
                      }`}>
                        <FiLink className="text-sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-sm">Conectores</p>
                      <p className="truncate text-xs text-gray-400">Gestión de conectores</p>
                    </div>
                  </div>
                </div>
                */}

                {/* Sección Flujos - Temporalmente oculta para implementación futura
                <div 
                  className={`flex w-full items-center rounded-md p-2.5 transition-all duration-300 cursor-pointer ${
                    activeTab === 'flows' 
                      ? 'bg-gradient-to-r from-teal-600/20 to-teal-700/20 text-teal-400' 
                      : 'hover:bg-[#1c1c1c] text-white'
                  }`}
                  onClick={() => setActiveTab('flows')}
                >
                  <div className="flex items-center w-full overflow-hidden">
                    <div className="flex-shrink-0 mr-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white ${
                        activeTab === 'flows' ? 'bg-teal-600' : 'bg-gray-700'
                      }`}>
                        <FiGitBranch className="text-sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-sm">Flujos</p>
                      <p className="truncate text-xs text-gray-400">Gestión de flujos</p>
                    </div>
                  </div>
                </div>
                */}

                {/* Sección Fuentes de Datos - Temporalmente oculta para implementación futura
                <div 
                  className={`flex w-full items-center rounded-md p-2.5 transition-all duration-300 cursor-pointer ${
                    activeTab === 'data-sources' 
                      ? 'bg-gradient-to-r from-indigo-600/20 to-indigo-700/20 text-indigo-400' 
                      : 'hover:bg-[#1c1c1c] text-white'
                  }`}
                  onClick={() => setActiveTab('data-sources')}
                >
                  <div className="flex items-center w-full overflow-hidden">
                    <div className="flex-shrink-0 mr-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white ${
                        activeTab === 'data-sources' ? 'bg-indigo-600' : 'bg-gray-700'
                      }`}>
                        <FiDatabase className="text-sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-sm">Fuentes de Datos</p>
                      <p className="truncate text-xs text-gray-400">Gestión de fuentes</p>
                    </div>
                  </div>
                </div>
                */}

                {/* Sección Config YAML - Temporalmente oculta para implementación futura
                <div 
                  className={`flex w-full items-center rounded-md p-2.5 transition-all duration-300 cursor-pointer ${
                    activeTab === 'yaml-config' 
                      ? 'bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 text-yellow-400' 
                      : 'hover:bg-[#1c1c1c] text-white'
                  }`}
                  onClick={() => setActiveTab('yaml-config')}
                >
                  <div className="flex items-center w-full overflow-hidden">
                    <div className="flex-shrink-0 mr-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white ${
                        activeTab === 'yaml-config' ? 'bg-yellow-600' : 'bg-gray-700'
                      }`}>
                        <FiSettings className="text-sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-sm">Config YAML</p>
                      <p className="truncate text-xs text-gray-400">Configuraciones YAML</p>
                    </div>
                  </div>
                </div>
                */}
              </div>
            )}
            
            {activeTab === 'settings' && (
              <div className="space-y-1 py-2">
                <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">Configuración del Sistema</h3>
                <button className="flex w-full items-center text-gray-300 hover:bg-[#1c1c1c] rounded-md p-2.5 transition-colors text-sm">
                  <FiDownload className="mr-3 h-4 w-4 text-gray-400" />
                  <span>Exportar configuración</span>
                </button>
                <button className="flex w-full items-center text-gray-300 hover:bg-[#1c1c1c] rounded-md p-2.5 transition-colors text-sm">
                  <FiRefreshCw className="mr-3 h-4 w-4 text-gray-400" />
                  <span>Reiniciar servicios</span>
                </button>
                <button className="flex w-full items-center text-gray-300 hover:bg-[#1c1c1c] rounded-md p-2.5 transition-colors text-sm">
                  <FiSettings className="mr-3 h-4 w-4 text-gray-400" />
                  <span>Configuración avanzada</span>
                </button>
                
                <h3 className="text-xs font-medium text-gray-400 mb-2 mt-4 px-1">Base de Datos</h3>
                <button className="flex w-full items-center text-gray-300 hover:bg-[#1c1c1c] rounded-md p-2.5 transition-colors text-sm">
                  <FiDownload className="mr-3 h-4 w-4 text-gray-400" />
                  <span>Backup de base de datos</span>
                </button>
                <button className="flex w-full items-center text-gray-300 hover:bg-[#1c1c1c] rounded-md p-2.5 transition-colors text-sm">
                  <FiFilter className="mr-3 h-4 w-4 text-gray-400" />
                  <span>Limpiar logs antiguos</span>
                </button>
              </div>
            )}
            
            {activeTab === 'help' && (
              <div className="space-y-1 py-2">
                <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">Monitoreo del Sistema</h3>
                <button className="flex w-full items-center text-gray-300 hover:bg-[#1c1c1c] rounded-md p-2.5 transition-colors text-sm">
                  <FiActivity className="mr-3 h-4 w-4 text-gray-400" />
                  <span>Estado de servicios</span>
                </button>
                <button className="flex w-full items-center text-gray-300 hover:bg-[#1c1c1c] rounded-md p-2.5 transition-colors text-sm">
                  <FiEye className="mr-3 h-4 w-4 text-gray-400" />
                  <span>Logs del sistema</span>
                </button>
                <button className="flex w-full items-center text-gray-300 hover:bg-[#1c1c1c] rounded-md p-2.5 transition-colors text-sm">
                  <FiCheckCircle className="mr-3 h-4 w-4 text-gray-400" />
                  <span>Health check</span>
                </button>
              </div>
            )}
          </div>

          {/* UserNav Footer */}
          <div className="px-4 pb-4 border-t border-gray-800 pt-3 mt-auto">
            <UserNav
              userName={adminUser?.username || 'Super Admin'}
              userEmail={adminUser?.email || 'superadmin@minddash.ai'}
              onLogout={handleLogout}
              onProfileClick={() => {}}
              onSettingsClick={() => setActiveTab('settings')}
              onHelpClick={() => setActiveTab('help')}
            />
          </div>
        </motion.div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col ml-[280px]">
          {/* Header mejorado */}
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/5 backdrop-blur-md border-b border-white/10 px-8 py-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
                </h1>
                <p className="text-gray-400 mt-2">
                  {activeTab === 'dashboard' && 'Resumen del sistema y estadísticas en tiempo real'}
                  {activeTab === 'users' && 'Gestión completa de usuarios del sistema'}
                  {activeTab === 'clients' && 'Administración de clientes y organizaciones'}
                  {activeTab === 'chatbots' && 'Asignación de chatbots a usuarios específicos'}
                  {/* Descripciones temporalmente ocultas para implementación futura:
                  {activeTab === 'connectors' && 'Gestión de conectores de datos'}
                  {activeTab === 'flows' && 'Gestión de flujos visuales'}
                  {activeTab === 'data-sources' && 'Gestión de fuentes de datos'}
                  {activeTab === 'yaml-config' && 'Configuraciones YAML de productos'}
                  */}
                  {activeTab === 'settings' && 'Configuración y ajustes del sistema'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-400">Última actualización</p>
                  <p className="text-white font-medium">{new Date().toLocaleTimeString()}</p>
                </div>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </motion.div>

          {/* Contenido del panel */}
          <div className="flex-1 p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 relative"
                >
                  {/* Fondo con Spotlight */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <Spotlight
                      gradientFirst="radial-gradient(50% 50% at 50% 50%, hsla(217, 91%, 60%, .08) 0, hsla(217, 91%, 50%, .04) 50%, transparent 100%)"
                      gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(280, 87%, 65%, .06) 0, hsla(280, 87%, 55%, .03) 80%, transparent 100%)"
                      gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(186, 78%, 60%, .04) 0, hsla(186, 78%, 50%, .02) 80%, transparent 100%)"
                      translateY={-300}
                      width={600}
                      height={1200}
                      smallWidth={280}
                      duration={6}
                      xOffset={120}
                    />
                  </div>

                  {/* Header del Dashboard con texto dinámico */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-cyan-600/10 backdrop-blur-md border border-white/10 rounded-2xl p-8 overflow-hidden"
                  >
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-2">Panel de Control</h2>
                          <WordRotate
                            words={[
                              "Gestión en tiempo real",
                              "Estadísticas avanzadas", 
                              "Control total del sistema",
                              "Análisis de rendimiento"
                            ]}
                            className="text-lg text-blue-400 font-medium"
                            duration={3000}
                          />
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Estado del Sistema</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span className="text-green-400 font-medium">Operativo</span>
                            </div>
                          </div>
                          <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
                            <FiActivity className="w-6 h-6 text-green-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Métricas principales mejoradas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { 
                        title: 'Total Usuarios', 
                        value: overview?.totalUsers || dashboardStats?.totalUsers || 0, 
                        subtitle: 'Registrados',
                        icon: FiUsers, 
                        color: 'blue',
                        trend: overview?.userGrowthRate ? `+${overview.userGrowthRate}%` : '+12%',
                        trendIcon: FiTrendingUp
                      },
                      { 
                        title: 'Usuarios Activos', 
                        value: overview?.activeUsers || dashboardStats?.activeUsers || 0, 
                        subtitle: 'Online ahora',
                        icon: FiActivity, 
                        color: 'green',
                        trend: '+8%',
                        trendIcon: FiTrendingUp
                      },
                      { 
                        title: 'Total Clientes', 
                        value: overview?.totalClients || dashboardStats?.totalClients || 0, 
                        subtitle: 'Organizaciones',
                        icon: IconMappings.Building, 
                        color: 'purple',
                        trend: '+5%',
                        trendIcon: FiTrendingUp
                      },
                      { 
                        title: 'Conversaciones', 
                        value: overview?.totalConversations || 0, 
                        subtitle: 'Total',
                        icon: FiMessageSquare, 
                        color: 'cyan',
                        trend: 'Activo',
                        trendIcon: FiBarChart
                      }
                    ].map((stat, index) => (
                      <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl overflow-hidden group hover:scale-105 transition-transform duration-300 ring-1 ring-white/5"
                      >
                        {/* Efecto de brillo al hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-[-200%] group-hover:translate-x-[200%] transform-gpu ease-in-out"></div>
                        
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 bg-${stat.color}-600/20 rounded-xl flex items-center justify-center`}>
                              <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                            </div>
                            <div className="flex items-center space-x-1 text-xs">
                              <stat.trendIcon className={`w-3 h-3 text-${stat.color}-400`} />
                              <span className={`text-${stat.color}-400 font-medium`}>{stat.trend}</span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                            <div className="text-3xl font-bold text-white mt-1">
                              {loadingStats ? (
                                <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                typeof stat.value === 'number' && stat.title === 'Crecimiento' ? `${stat.value}%` : stat.value
                              )}
                            </div>
                            <p className="text-gray-500 text-xs mt-1">{stat.subtitle}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Acciones rápidas */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-lg"
                  >
                    <h3 className="text-xl font-bold text-white mb-6">Acciones Rápidas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Nuevo Usuario', icon: FiPlus, color: 'blue', action: () => { setActiveTab('users'); setOpenUserModal(true); } },
                        { label: 'Nuevo Cliente', icon: FiPlus, color: 'green', action: () => { setActiveTab('clients'); setOpenClientModal(true); } },
                        { label: 'Gestionar Usuarios', icon: FiUsers, color: 'purple', action: () => setActiveTab('users') },
                        { label: 'Configuración', icon: FiSettings, color: 'orange', action: () => setActiveTab('settings') }
                      ].map((action, index) => (
                        <motion.button
                          key={action.label}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={action.action}
                          className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all shadow-lg border border-white/5 ring-1 ring-white/5"
                        >
                          <action.icon className={`w-5 h-5 text-${action.color}-400`} />
                          <span className="text-white font-medium">{action.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Analytics y Gráficos Avanzados */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Distribución de Roles */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl ring-1 ring-white/5"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white">Distribución de Roles</h3>
                        <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                          <FiBarChart className="w-5 h-5 text-purple-400" />
                        </div>
                      </div>
                      
                      {loadingStats ? (
                        <div className="flex items-center justify-center h-64">
                          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : dashboardStats?.roleDistribution && dashboardStats.roleDistribution.length > 0 ? (
                        <div className="h-64 flex flex-col">
                          <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={dashboardStats.roleDistribution.map((role: any) => ({
                                    name: role.role === 'super_admin' ? 'Super Admin' : 
                                          role.role === 'admin' ? 'Admin' : 'Usuario',
                                    value: role.count,
                                    role: role.role
                                  }))}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={80}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {dashboardStats.roleDistribution.map((entry: any, index: number) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={
                                        entry.role === 'super_admin' ? '#f59e0b' :
                                        entry.role === 'admin' ? '#8b5cf6' : '#3b82f6'
                                      } 
                                    />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className="mt-3 space-y-2 flex-shrink-0">
                            {dashboardStats.roleDistribution.map((role: any, index: number) => (
                              <div key={role.role} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{
                                      backgroundColor: 
                                        role.role === 'super_admin' ? '#f59e0b' :
                                        role.role === 'admin' ? '#8b5cf6' : '#3b82f6'
                                    }}
                                  ></div>
                                  <span className="text-gray-400 text-sm truncate">
                                    {role.role === 'super_admin' ? 'Super Admin' : 
                                     role.role === 'admin' ? 'Admin' : 'Usuario'}
                                  </span>
                                </div>
                                <span className="text-white font-medium flex-shrink-0">{role.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FiBarChart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400">No hay datos de roles</p>
                        </div>
                      )}
                    </motion.div>

                    {/* Analytics en Tiempo Real */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="lg:col-span-2"
                    >
                      <RealTimeCharts 
                        clientId={''} 
                        isAdmin={adminUser?.role === 'admin' || adminUser?.role === 'super_admin'}
                      />
                    </motion.div>
                  </div>

                  {/* Lista Mejorada de Actividad Reciente */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Usuarios Recientes Mejorado */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl ring-1 ring-white/5"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white">Usuarios Recientes</h3>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Últimos registros</p>
                            <p className="text-sm text-blue-400 font-medium">{dashboardStats?.recentUsers?.length || 0} nuevos</p>
                          </div>
                          <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                            <FiUsers className="w-5 h-5 text-blue-400" />
                          </div>
                        </div>
                      </div>
                      
                      {loadingStats ? (
                        <div className="space-y-3">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="animate-pulse flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/5">
                              <div className="w-12 h-12 bg-gray-700 rounded-xl"></div>
                              <div className="flex-1">
                                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : dashboardStats?.recentUsers && dashboardStats.recentUsers.length > 0 ? (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {dashboardStats.recentUsers.slice(0, 5).map((user: any, index: number) => (
                            <motion.div 
                              key={user.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group border border-white/5"
                            >
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                                {user.username?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{user.username}</p>
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    user.iam_role === 'admin' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'
                                  }`}>
                                    {user.iam_role === 'admin' ? 'Admin' : 'Usuario'}
                                  </span>
                                  <span className="text-gray-400 text-xs">
                                    {new Date(user.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <FiEye className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiUsers className="w-8 h-8 text-blue-400" />
                          </div>
                          <p className="text-gray-400">No hay usuarios recientes</p>
                        </div>
                      )}
                    </motion.div>

                    {/* Clientes Recientes Mejorado */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl ring-1 ring-white/5"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white">Clientes Recientes</h3>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Organizaciones</p>
                            <p className="text-sm text-purple-400 font-medium">{dashboardStats?.recentClients?.length || 0} nuevos</p>
                          </div>
                          <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                            <IconMappings.Building className="w-5 h-5 text-purple-400" />
                          </div>
                        </div>
                      </div>
                      
                      {loadingStats ? (
                        <div className="space-y-3">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="animate-pulse flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/5">
                              <div className="w-12 h-12 bg-gray-700 rounded-xl"></div>
                              <div className="flex-1">
                                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : dashboardStats?.recentClients && dashboardStats.recentClients.length > 0 ? (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {dashboardStats.recentClients.slice(0, 5).map((client: any, index: number) => (
                            <motion.div 
                              key={client.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group border border-white/5"
                            >
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <IconMappings.Building className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{client.nombre}</p>
                                <div className="flex items-center space-x-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-600/20 text-purple-400">
                                    Cliente
                                  </span>
                                  <span className="text-gray-400 text-xs">
                                    {new Date(client.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <FiEye className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-purple-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <IconMappings.Building className="w-8 h-8 text-purple-400" />
                          </div>
                          <p className="text-gray-400">No hay clientes recientes</p>
                        </div>
                      )}
                    </motion.div>
                  </div>


                </motion.div>
              )}

              {activeTab === 'users' && (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <SuperAdminUserManagement />
                </motion.div>
              )}

              {/* Solo mostrar gestión de clientes para super_admin */}
              {activeTab === 'clients' && userRole === 'super_admin' && (
                <motion.div
                  key="clients"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ClientsManagement showNotification={showNotification} openCreateModal={openClientModal} />
                </motion.div>
              )}

              {activeTab === 'chatbots' && (
                <motion.div
                  key="chatbots"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ChatbotAssignments />
                </motion.div>
              )}

              {/* Sección Conectores - Temporalmente oculta para implementación futura
              {activeTab === 'connectors' && (
                <motion.div
                  key="connectors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ConnectorManager />
                </motion.div>
              )}
              */}

              {/* Sección Flujos - Temporalmente oculta para implementación futura
              {activeTab === 'flows' && (
                <motion.div
                  key="flows"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <FlowEditor />
                </motion.div>
              )}
              */}

              {/* Sección Fuentes de Datos - Temporalmente oculta para implementación futura
              {activeTab === 'data-sources' && (
                <motion.div
                  key="data-sources"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <DataSourceManager />
                </motion.div>
              )}
              */}

              {/* Sección Config YAML - Temporalmente oculta para implementación futura
              {activeTab === 'yaml-config' && (
                <motion.div
                  key="yaml-config"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <YamlConfigManager />
                </motion.div>
              )}
              */}

              {/* Solo mostrar configuración para super_admin */}
              {activeTab === 'settings' && userRole === 'super_admin' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <SuperAdminSettings />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Componente de notificación */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-4 left-1/2 transform z-50 max-w-md w-full mx-auto"
          >
            <div className={`
              p-4 rounded-lg shadow-lg border-l-4 flex items-center space-x-3
              ${notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}
              ${notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800 dark:bg-red-900/20 dark:text-red-400' : ''}
              ${notification.type === 'info' ? 'bg-blue-50 border-blue-400 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : ''}
            `}>
              <div className="flex-shrink-0">
                {notification.type === 'success' && <FiCheckCircle className="w-5 h-5" />}
                {notification.type === 'error' && <FiXCircle className="w-5 h-5" />}
                {notification.type === 'info' && <FiActivity className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="flex-shrink-0 ml-auto pl-3"
              >
                <FiXCircle className="w-4 h-4 opacity-70 hover:opacity-100" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estilos adicionales */}
      <style jsx>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, #1a1a1a 1px, transparent 1px),
            linear-gradient(to bottom, #1a1a1a 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
    </>
  );
}