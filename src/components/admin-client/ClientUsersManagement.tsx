'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, 
  FiEdit3, 
  FiTrash2, 
  FiSearch, 
  FiFilter,
  FiEye,
  FiEyeOff,
  FiUser,
  FiMail,
  FiXCircle,
  FiActivity,
  FiRefreshCw,
  FiKey,
  FiChevronUp,
  FiChevronDown,
  FiChevronsLeft,
  FiChevronsRight,
  FiChevronLeft,
  FiChevronRight
} from '@/lib/icons';
import { AlertTriangle } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { useThemeMode } from '@/hooks/useThemeMode';
import { LIGHT_THEME_CLASSES } from '@/lib/theme/tokens';
import { StatusBadge } from './StatusBadge';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import ModalPortal from '@/components/ui/ModalPortal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AccessCode {
  id?: string;
  codevalue: string;
  is_active: boolean;
}

interface User {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string; // Número de WhatsApp
  role: 'user' | 'admin' | 'viewer' | 'editor' | 'super_admin';
  is_active: boolean;
  created_at: string;
  last_login?: string;
  iam_role?: string; // Agregar para referencia
  access_role?: string; // Datos de acceso de Bayer
  cuit_code?: string; // Código CUIT de Bayer (legacy - compatibilidad)
  cuit_codes?: string[]; // Array de CUITs (nuevo)
  cuit_count?: number; // Cantidad de CUITs
}

interface ClientUsersManagementProps {
  clientId: string;
  showNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface AccessOrganization {
  id: string;
  name: string;
  is_assigned: boolean;
}

interface AccessProject {
  id: string;
  name: string;
  organization_id: string | null;
  is_assigned: boolean;
}

interface AccessProduct {
  id: string;
  name: string;
  project_id: string;
  is_assigned: boolean;
}

export default function ClientUsersManagement({ clientId, showNotification }: ClientUsersManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getEffectiveClientId = () => {
    if (clientId && clientId.trim().length > 0) return clientId;
    try {
      const savedClient = localStorage.getItem('evolve-selected-client');
      if (!savedClient) return '';
      const parsed = JSON.parse(savedClient);
      return typeof parsed?.id === 'string' ? parsed.id : '';
    } catch {
      return '';
    }
  };

  // Validación de número de teléfono
  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone.trim()) return true; // Campo opcional
    // Acepta formatos: +54 9 11 1234-5678, +54 11 1234-5678, 11 1234-5678, etc.
    const phoneRegex = /^(\+?54\s?)?([0-9]\s?)?[0-9]{2,4}\s?[0-9]{4}[-\s]?[0-9]{4}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ' ').trim());
  };

  const handleSetUserStatus = async (userId: string, isActive: boolean) => {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    const auth = JSON.parse(authData);
    setStatusUpdatingUserId(userId);

    toast.promise(
      fetch(`/api/admin-client/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.accessToken}`
        },
        body: JSON.stringify({
          is_active: isActive
        })
      }).then(async (response) => {
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Error cambiando estado del usuario');
        }

        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u))
        );
        setEditingUser((prev) => (prev?.id === userId ? { ...prev, is_active: isActive } : prev));

        return result;
      }).finally(() => {
        setStatusUpdatingUserId((prev) => (prev === userId ? null : prev));
      }),
      {
        loading: `${isActive ? 'Activando' : 'Desactivando'} usuario...`,
        success: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
        error: (err) => err.message || 'Error de conexión. Intenta nuevamente.'
      }
    );
  };

  // ========================================
  // FUNCIONES AUXILIARES PARA MÚLTIPLES CUITs
  // ========================================

  // Validación de formato CUIT
  const validateCuitFormat = (cuit: string): boolean => {
    if (!cuit.trim()) return false;
    const cuitRegex = /^\d{11}$/;
    return cuitRegex.test(cuit.trim());
  };

  // Agregar nuevo código CUIT (máximo 3 permitidos)
  const addAccessCode = () => {
    if (formData.cuit_codes.length >= 3) {
      notify('error', 'Máximo 3 CUITs por usuario');
      return;
    }
    setFormData({
      ...formData,
      cuit_codes: [...formData.cuit_codes, { codevalue: '', is_active: true }]
    });
  };

  // Remover código CUIT
  const removeAccessCode = (index: number) => {
    const newCodes = formData.cuit_codes.filter((_, i) => i !== index);
    setFormData({ ...formData, cuit_codes: newCodes });
  };

  // Actualizar código CUIT específico
  const updateAccessCode = (index: number, field: keyof AccessCode, value: any) => {
    const newCodes = [...formData.cuit_codes];
    newCodes[index] = { ...newCodes[index], [field]: value };
    setFormData({ ...formData, cuit_codes: newCodes });
  };

  // Convertir array de AccessCode a array de strings para la API
  const accessCodesToStringArray = (accessCodes: AccessCode[]): string[] => {
    return accessCodes
      .filter(code => code.codevalue && code.codevalue.trim() !== '')
      .map(code => code.codevalue.trim());
  };

  // Convertir array de strings a array de AccessCode para el frontend
  const stringArrayToAccessCodes = (cuitArray: string[]): AccessCode[] => {
    return cuitArray.map(cuit => ({
      codevalue: cuit,
      is_active: true
    }));
  };
  
  // Función local para notificaciones con fallback interno
  const notify = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    void showNotification;
    if (type === 'success') {
      toast.success(message);
      return;
    }
    if (type === 'error') {
      toast.error(message);
      return;
    }

    toast(message);
  }, [showNotification]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'viewer' | 'editor' | 'admin'>('all');
  
  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<string | null>(null);

  // Estados para formulario de creación/edición
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'user' as 'user' | 'viewer' | 'editor',
    access_role: 'AllAccess',
    cuit_code: '', // Mantener para compatibilidad
    cuit_codes: [] as AccessCode[] // Nuevo array de CUITs
  });

  // Detectar si es el admin de Bayer
  const [isBayerAdmin, setIsBayerAdmin] = useState(false);
  
  // ID del usuario actual (para excluirlo del listado)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const isProtectedRole = (role: User['role']): role is 'admin' | 'super_admin' =>
    role === 'admin' || role === 'super_admin';

  const normalizeRole = (role: any): User['role'] => {
    const normalized = typeof role === 'string' ? role.toLowerCase() : '';
    if (
      normalized === 'admin' ||
      normalized === 'user' ||
      normalized === 'viewer' ||
      normalized === 'editor' ||
      normalized === 'super_admin'
    ) {
      return normalized;
    }
    return 'user';
  };

  // Estados para modal de eliminación híbrido
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Estados para confirmación de segundo paso
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showPermanentConfirm, setShowPermanentConfirm] = useState(false);

  // Estados para modal de visualización (solo lectura)
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const { applyThemeClass, isDark } = useThemeMode();

  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessUser, setAccessUser] = useState<User | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessSearch, setAccessSearch] = useState('');
  const [accessOrganizations, setAccessOrganizations] = useState<AccessOrganization[]>([]);
  const [accessProjects, setAccessProjects] = useState<AccessProject[]>([]);
  const [accessProducts, setAccessProducts] = useState<AccessProduct[]>([]);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<Set<string>>(new Set());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [accessOnlySelected, setAccessOnlySelected] = useState(false);

  const getRoleBadgeClass = (role: User['role']) => {
    const darkMap: Record<User['role'], string> = {
      admin: 'bg-red-900/30 text-red-300',
      user: 'bg-minddash-celeste-500/20 text-minddash-celeste-300',
      viewer: 'bg-blue-900/30 text-blue-300',
      editor: 'bg-blue-900/30 text-blue-300',
      super_admin: 'bg-purple-900/30 text-purple-300',
    };

    const lightMap: Record<User['role'], string> = {
      admin: LIGHT_THEME_CLASSES.BADGE_RED,
      user: LIGHT_THEME_CLASSES.BADGE_INFO,
      viewer: LIGHT_THEME_CLASSES.BADGE_BLUE,
      editor: LIGHT_THEME_CLASSES.BADGE_BLUE,
      super_admin: LIGHT_THEME_CLASSES.BADGE_PURPLE,
    };

    return applyThemeClass(darkMap[role], lightMap[role]);
  };

  const getStatusBadgeClass = (active: boolean) => {
    return applyThemeClass(
      active ? 'bg-minddash-celeste-500/20 text-minddash-celeste-300' : 'bg-red-900/30 text-red-300',
      active ? 'bg-minddash-celeste-100 text-minddash-celeste-700' : 'bg-red-100 text-red-600'
    );
  };

  const getRowClasses = (user: User) => {
    if (!user.is_active) {
      return applyThemeClass('opacity-50 bg-red-900/10 hover:bg-red-900/20', 'opacity-90 bg-red-50 hover:bg-red-100');
    }
    return applyThemeClass('hover:bg-minddash-elevated', 'hover:bg-gray-100');
  };

  // Cargar usuarios reales del API
  const loadUsers = async () => {
    try {
      setLoading(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        return;
      }

      const auth = JSON.parse(authData);
      const effectiveClientId = getEffectiveClientId();
      const response = await fetch('/api/admin-client/users', {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          ...(effectiveClientId ? { 'x-client-id': effectiveClientId } : {})
        }
      });

      if (response.status === 401) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      if (response.status === 403) {
        toast.error('Acceso denegado. Solo administradores pueden gestionar usuarios.');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Mapear usuarios desde la API con soporte para múltiples CUITs
          const mappedUsers: User[] = result.users
            .map((user: any) => ({
              id: user.id,
              username: user.username,
              email: user.email,
              phoneNumber: user.phone_number || '',
              role: normalizeRole(user.role?.name), // Usar role.name de la relación
              iam_role: normalizeRole(user.role?.name),
              is_active: user.is_active,
              created_at: user.created_at,
              access_role: user.access_role || 'AllAccess',
              cuit_code: user.cuit_code || '', // Mantener compatibilidad
              cuit_codes: user.cuit_codes || [], // Nuevo campo de array
              cuit_count: user.cuit_count || 0 // Cantidad de CUITs
            }))
            .filter((user: User) => user.role !== 'super_admin')
            .filter((user: User) => user.id !== auth.userId); // Excluir usuario actual
          
          setCurrentUserId(auth.userId);
          setUsers(mappedUsers);
        }
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar tabla de usuarios (para el botón de refresh)
  const refreshUsers = async () => {
    setRefreshing(true);
    
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      setRefreshing(false);
      return;
    }

    const auth = JSON.parse(authData);
    const effectiveClientId = getEffectiveClientId();
    
    toast.promise(
      fetch('/api/admin-client/users', {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          ...(effectiveClientId ? { 'x-client-id': effectiveClientId } : {})
        }
      }).then(async (response) => {
        if (response.status === 401) {
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }

        if (response.status === 403) {
          throw new Error('Acceso denegado. Solo administradores pueden gestionar usuarios.');
        }

        if (!response.ok) {
          throw new Error('Error al actualizar la tabla');
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Error al actualizar');
        }

        // Mapear usuarios desde la API con soporte para múltiples CUITs
        const mappedUsers: User[] = result.users
          .map((user: any) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            phoneNumber: user.phone_number || '',
            role: normalizeRole(user.role?.name),
            iam_role: normalizeRole(user.role?.name),
            is_active: user.is_active,
            created_at: user.created_at,
            access_role: user.access_role || 'AllAccess',
            cuit_code: user.cuit_code || '',
            cuit_codes: user.cuit_codes || [],
            cuit_count: user.cuit_count || 0
          }))
          .filter((user: User) => user.role !== 'super_admin')
          .filter((user: User) => user.id !== auth.userId); // Excluir usuario actual
        
        setUsers(mappedUsers);
        return result;
      }).finally(() => {
        setRefreshing(false);
      }),
      {
        loading: 'Actualizando tabla...',
        success: 'Tabla actualizada correctamente',
        error: (err) => err.message || 'Error al actualizar la tabla'
      }
    );
  };

  useEffect(() => {
    loadUsers();
    checkIfBayerAdmin();
  }, [clientId]);

  // Verificar si el usuario actual es el admin de Bayer
  const checkIfBayerAdmin = () => {
    const authData = localStorage.getItem('evolve-auth');
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        // Verificar si es el usuario admin específico de Bayer
        setIsBayerAdmin(auth.userId === 'fdbc7a27d1d4b7747192');
      } catch (error) {
        console.error('Error verificando usuario Bayer:', error);
      }
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);

  // TanStack Table columns definition
  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      accessorKey: 'username',
      header: 'Usuario',
      enableSorting: true,
    },
    {
      accessorKey: 'phoneNumber',
      header: 'WhatsApp',
      enableSorting: true,
    },
    {
      accessorKey: 'role',
      header: 'Rol',
      enableSorting: true,
    },
    ...(isBayerAdmin ? [{
      accessorKey: 'cuit_codes' as const,
      header: 'CUITs',
      enableSorting: false,
    }] : []),
    {
      accessorKey: 'is_active',
      header: 'Estado',
      enableSorting: true,
    },
    {
      accessorKey: 'created_at',
      header: 'Último acceso',
      enableSorting: true,
    },
    {
      id: 'actions',
      header: 'Acciones',
      enableSorting: false,
    },
  ], [isBayerAdmin]);

  // TanStack Table instance
  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleCreateUser = async () => {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    const auth = JSON.parse(authData);
    const effectiveClientId = getEffectiveClientId();

    // Usar toast.promise para mostrar estados automáticamente
    toast.promise(
      fetch('/api/admin-client/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.accessToken}`,
          ...(effectiveClientId ? { 'x-client-id': effectiveClientId } : {})
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
          role: formData.role,
          access_role: isBayerAdmin ? formData.access_role : undefined,
          cuit_code: isBayerAdmin && formData.access_role === 'DISTRIBUIDOR_ACCESS' ? formData.cuit_code : undefined,
          cuit_codes: isBayerAdmin && formData.access_role === 'DISTRIBUIDOR_ACCESS' ? accessCodesToStringArray(formData.cuit_codes) : undefined
        })
      }).then(async (response) => {
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Error creando usuario');
        }

        // Actualizar lista local
        const cuitCodesArray = isBayerAdmin ? accessCodesToStringArray(formData.cuit_codes) : [];
        const newUser: User = {
          id: result.data.user.id,
          username: result.data.user.username,
          email: result.data.user.email,
          phoneNumber: result.data.user.phone_number || formData.phoneNumber,
          role: normalizeRole(result.data.user.role?.name || formData.role),
          iam_role: normalizeRole(result.data.user.role?.name || formData.role),
          is_active: result.data.user.is_active,
          created_at: result.data.user.created_at,
          access_role: isBayerAdmin ? formData.access_role : 'AllAccess',
          cuit_code: isBayerAdmin ? formData.cuit_code : '',
          cuit_codes: cuitCodesArray,
          cuit_count: cuitCodesArray.length
        };
        
        setUsers([newUser, ...users]);
        setShowCreateModal(false);
        setFormData({ username: '', email: '', phoneNumber: '', password: '', role: 'user', access_role: 'AllAccess', cuit_code: '', cuit_codes: [] });

        return result;
      }),
      {
        loading: 'Creando usuario...',
        success: 'Usuario creado exitosamente',
        error: (err) => err.message || 'Error de conexión. Intenta nuevamente.'
      }
    );
  };

  const handleEditUser = (user: User) => {
    if (isProtectedRole(user.role)) {
      toast.error('No puedes editar usuarios administradores desde esta sección.');
      return;
    }

    setEditingUser(user);
    
    // Procesar CUITs del usuario para el formulario
    const userCuitCodes = user.cuit_codes && user.cuit_codes.length > 0 
      ? stringArrayToAccessCodes(user.cuit_codes)
      : user.cuit_code 
        ? [{ codevalue: user.cuit_code, is_active: true }] // Compatibilidad con formato anterior
        : [];
    
    setFormData({
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      password: '',
      role: user.role,
      access_role: user.access_role || 'AllAccess',
      cuit_code: user.cuit_code || '', // Mantener compatibilidad
      cuit_codes: userCuitCodes // Nuevo array
    });
    setShowCreateModal(true);
  };

  const handleViewUser = (user: User) => {
    setViewingUser(user);
    setShowViewModal(true);
  };

  const openAccessModal = async (user: User) => {
    if (isProtectedRole(user.role)) {
      toast.error('No puedes gestionar accesos de usuarios administradores desde esta sección.');
      return;
    }

    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    setAccessUser(user);
    setShowAccessModal(true);
    setAccessLoading(true);
    setAccessSearch('');

    try {
      const auth = JSON.parse(authData);
      const response = await fetch(`/api/admin-client/users/${user.id}/access`, {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`
        }
      });

      if (response.status === 401) {
        return;
      }

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Error obteniendo accesos');
      }

      const orgs: AccessOrganization[] = result.data?.organizations || [];
      const projects: AccessProject[] = result.data?.projects || [];
      const products: AccessProduct[] = result.data?.products || [];

      setAccessOrganizations(orgs);
      setAccessProjects(projects);
      setAccessProducts(products);

      setSelectedOrganizationIds(new Set(orgs.filter((o) => o.is_assigned).map((o) => o.id)));
      setSelectedProjectIds(new Set(projects.filter((p) => p.is_assigned).map((p) => p.id)));
      setSelectedProductIds(new Set(products.filter((p) => p.is_assigned).map((p) => p.id)));

      setActiveOrganizationId(orgs[0]?.id || null);
      const firstProjectInFirstOrg = orgs[0]?.id
        ? projects.find((p) => p.organization_id === orgs[0].id)
        : undefined;
      setActiveProjectId(firstProjectInFirstOrg?.id || null);
    } catch (error: any) {
      toast.error(error.message || 'Error obteniendo accesos');
    } finally {
      setAccessLoading(false);
    }
  };

  const closeAccessModal = () => {
    if (accessSaving) return;
    setShowAccessModal(false);
    setAccessUser(null);
    setAccessOrganizations([]);
    setAccessProjects([]);
    setAccessProducts([]);
    setSelectedOrganizationIds(new Set());
    setSelectedProjectIds(new Set());
    setSelectedProductIds(new Set());
    setAccessSearch('');
    setActiveOrganizationId(null);
    setActiveProjectId(null);
    setAccessOnlySelected(false);
  };

  useEffect(() => {
    if (!activeOrganizationId) {
      setActiveProjectId(null);
      return;
    }

    if (!activeProjectId) return;

    const stillExists = accessProjects.some(
      (p) => p.id === activeProjectId && p.organization_id === activeOrganizationId
    );
    if (!stillExists) {
      setActiveProjectId(null);
    }
  }, [activeOrganizationId, activeProjectId, accessProjects]);

  const clearAllAccessSelections = () => {
    setSelectedOrganizationIds(new Set());
    setSelectedProjectIds(new Set());
    setSelectedProductIds(new Set());
  };

  const selectAllOrganizations = () => {
    setSelectedOrganizationIds(new Set(accessOrganizations.map((o) => o.id)));
  };

  const selectAllProjectsInActiveOrg = () => {
    if (!activeOrganizationId) return;
    const projectIds = accessProjects
      .filter((p) => p.organization_id === activeOrganizationId)
      .map((p) => p.id);

    setSelectedOrganizationIds((prev) => {
      const next = new Set(prev);
      next.add(activeOrganizationId);
      return next;
    });
    setSelectedProjectIds((prev) => new Set([...Array.from(prev), ...projectIds]));
  };

  const clearProjectsInActiveOrg = () => {
    if (!activeOrganizationId) return;
    const projectIdsInOrg = accessProjects
      .filter((p) => p.organization_id === activeOrganizationId)
      .map((p) => p.id);
    const projectIdSet = new Set(projectIdsInOrg);

    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      projectIdsInOrg.forEach((id) => next.delete(id));
      return next;
    });

    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      accessProducts
        .filter((p) => projectIdSet.has(p.project_id))
        .forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const selectAllProductsInActiveProject = () => {
    if (!activeProjectId) return;
    const productIds = accessProducts
      .filter((p) => p.project_id === activeProjectId)
      .map((p) => p.id);

    setSelectedProductIds((prev) => new Set([...Array.from(prev), ...productIds]));
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      next.add(activeProjectId);
      return next;
    });

    const orgId = accessProjects.find((p) => p.id === activeProjectId)?.organization_id;
    if (orgId) {
      setSelectedOrganizationIds((prev) => {
        const next = new Set(prev);
        next.add(orgId);
        return next;
      });
    }
  };

  const clearProductsInActiveProject = () => {
    if (!activeProjectId) return;
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      accessProducts
        .filter((p) => p.project_id === activeProjectId)
        .forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const toggleOrganization = (organizationId: string) => {
    const nextSelectedOrgIds = new Set(selectedOrganizationIds);
    const nextSelectedProjectIds = new Set(selectedProjectIds);
    const nextSelectedProductIds = new Set(selectedProductIds);

    if (nextSelectedOrgIds.has(organizationId)) {
      nextSelectedOrgIds.delete(organizationId);

      const projectIdsToRemove = accessProjects
        .filter((p) => p.organization_id === organizationId)
        .map((p) => p.id);
      projectIdsToRemove.forEach((id) => nextSelectedProjectIds.delete(id));

      const projectIdSet = new Set(projectIdsToRemove);
      const productIdsToRemove = accessProducts
        .filter((p) => projectIdSet.has(p.project_id))
        .map((p) => p.id);
      productIdsToRemove.forEach((id) => nextSelectedProductIds.delete(id));
    } else {
      nextSelectedOrgIds.add(organizationId);
    }

    setSelectedOrganizationIds(nextSelectedOrgIds);
    setSelectedProjectIds(nextSelectedProjectIds);
    setSelectedProductIds(nextSelectedProductIds);
  };

  const toggleProject = (projectId: string) => {
    const nextSelectedOrgIds = new Set(selectedOrganizationIds);
    const nextSelectedProjectIds = new Set(selectedProjectIds);
    const nextSelectedProductIds = new Set(selectedProductIds);

    if (nextSelectedProjectIds.has(projectId)) {
      nextSelectedProjectIds.delete(projectId);
      accessProducts
        .filter((p) => p.project_id === projectId)
        .forEach((p) => nextSelectedProductIds.delete(p.id));
    } else {
      nextSelectedProjectIds.add(projectId);
      const orgId = accessProjects.find((p) => p.id === projectId)?.organization_id;
      if (orgId) {
        nextSelectedOrgIds.add(orgId);
      }
    }

    setSelectedOrganizationIds(nextSelectedOrgIds);
    setSelectedProjectIds(nextSelectedProjectIds);
    setSelectedProductIds(nextSelectedProductIds);
  };

  const toggleProduct = (productId: string) => {
    const nextSelectedOrgIds = new Set(selectedOrganizationIds);
    const nextSelectedProjectIds = new Set(selectedProjectIds);
    const nextSelectedProductIds = new Set(selectedProductIds);

    if (nextSelectedProductIds.has(productId)) {
      nextSelectedProductIds.delete(productId);
    } else {
      nextSelectedProductIds.add(productId);
      const projectId = accessProducts.find((p) => p.id === productId)?.project_id;
      if (projectId) {
        nextSelectedProjectIds.add(projectId);
        const orgId = accessProjects.find((p) => p.id === projectId)?.organization_id;
        if (orgId) {
          nextSelectedOrgIds.add(orgId);
        }
      }
    }

    setSelectedOrganizationIds(nextSelectedOrgIds);
    setSelectedProjectIds(nextSelectedProjectIds);
    setSelectedProductIds(nextSelectedProductIds);
  };

  const saveUserAccess = async () => {
    if (!accessUser) return;

    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    const auth = JSON.parse(authData);
    setAccessSaving(true);

    const requestPromise = fetch(`/api/admin-client/users/${accessUser.id}/access`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`
      },
      body: JSON.stringify({
        organizationIds: Array.from(selectedOrganizationIds),
        projectIds: Array.from(selectedProjectIds),
        productIds: Array.from(selectedProductIds)
      })
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Error actualizando accesos');
      }

      return result;
    }).finally(() => {
      setAccessSaving(false);
    });

    toast.promise(
      requestPromise,
      {
        loading: 'Guardando accesos...',
        success: 'Accesos actualizados correctamente',
        error: (err) => err.message || 'Error actualizando accesos'
      }
    );

    requestPromise
      .then(() => {
        closeAccessModal();
      })
      .catch(() => {
      });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    const auth = JSON.parse(authData);
    
    const requestData = {
      userId: editingUser.id,
      username: formData.username,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      password: formData.password,
      role: formData.role,
      access_role: isBayerAdmin ? formData.access_role : undefined,
      cuit_code: isBayerAdmin && formData.access_role === 'DISTRIBUIDOR_ACCESS' ? formData.cuit_code : undefined,
      cuit_codes: isBayerAdmin && formData.access_role === 'DISTRIBUIDOR_ACCESS' ? accessCodesToStringArray(formData.cuit_codes) : undefined
    };
    
    toast.promise(
      fetch('/api/admin-client/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.accessToken}`
        },
        body: JSON.stringify(requestData)
      }).then(async (response) => {
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Error actualizando usuario');
        }

        // Actualizar lista local
        const updatedCuitCodes = isBayerAdmin ? accessCodesToStringArray(formData.cuit_codes) : (editingUser.cuit_codes || []);
        setUsers(users.map(user => 
          user.id === editingUser.id 
            ? { 
                ...user, 
                username: formData.username, 
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                role: formData.role,
                iam_role: formData.role,
                access_role: isBayerAdmin ? formData.access_role : user.access_role,
                cuit_code: isBayerAdmin ? formData.cuit_code : user.cuit_code,
                cuit_codes: updatedCuitCodes,
                cuit_count: updatedCuitCodes.length
              }
            : user
        ));
        
        setShowCreateModal(false);
        setEditingUser(null);
        setFormData({ username: '', email: '', phoneNumber: '', password: '', role: 'user', access_role: 'AllAccess', cuit_code: '', cuit_codes: [] });

        return result;
      }),
      {
        loading: 'Actualizando usuario...',
        success: 'Usuario actualizado exitosamente',
        error: (err) => err.message || 'Error actualizando usuario'
      }
    );
  };

  // Abrir modal de confirmación de eliminación
  const handleDeleteUser = (user: User) => {
    if (isProtectedRole(user.role)) {
      toast.error('No puedes eliminar usuarios administradores desde esta sección.');
      return;
    }

    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  // Cerrar modal de eliminación
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  // Cerrar todos los modales
  const handleCancelAllModals = () => {
    setShowDeleteModal(false);
    setShowDeactivateConfirm(false);
    setShowPermanentConfirm(false);
    setUserToDelete(null);
  };

  // Abrir confirmación para desactivar (primer paso)
  const handleRequestDeactivate = () => {
    setShowDeleteModal(false);
    setShowDeactivateConfirm(true);
  };

  // Abrir confirmación para eliminar permanentemente (primer paso)
  const handleRequestPermanentDelete = () => {
    setShowDeleteModal(false);
    setShowPermanentConfirm(true);
  };

  // Desactivar usuario (soft delete) - confirmación final
  const handleConfirmDeactivate = async () => {
    if (!userToDelete) return;
    
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    const auth = JSON.parse(authData);
    
    toast.promise(
      fetch(`/api/admin-client/users/${userToDelete.id}?action=deactivate`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`
        }
      }).then(async (response) => {
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Error desactivando usuario');
        }

        // Actualizar estado local: marcar como inactivo en lugar de remover
        setUsers(users.map(user => 
          user.id === userToDelete.id 
            ? { ...user, is_active: false }
            : user
        ));
        
        handleCancelAllModals();
        return result;
      }),
      {
        loading: 'Desactivando usuario...',
        success: 'Usuario desactivado exitosamente. No podrá acceder al sistema.',
        error: (err) => err.message || 'Error de conexión. Intenta nuevamente.'
      }
    );
  };

  // Eliminar usuario permanentemente (hard delete) - confirmación final
  const handleConfirmPermanentDelete = async () => {
    if (!userToDelete) return;
    
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    const auth = JSON.parse(authData);
    
    toast.promise(
      fetch(`/api/admin-client/users/${userToDelete.id}?action=permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`
        }
      }).then(async (response) => {
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Error eliminando usuario permanentemente');
        }

        // Remover usuario de la lista local
        setUsers(users.filter(user => user.id !== userToDelete.id));
        
        handleCancelAllModals();
        return result;
      }),
      {
        loading: 'Eliminando usuario permanentemente...',
        success: 'Usuario eliminado permanentemente. Se han revocado todos sus accesos.',
        error: (err) => err.message || 'Error de conexión. Intenta nuevamente.'
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-minddash-celeste-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>Gestión de Usuarios</h2>
          <p className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>Administra los usuarios de tu empresa</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-minddash-celeste-600 hover:bg-minddash-celeste-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className={applyThemeClass(
        'bg-minddash-card border border-minddash-border rounded-xl p-6',
        `${LIGHT_THEME_CLASSES.SURFACE} ${LIGHT_THEME_CLASSES.BORDER} rounded-xl p-6 ${LIGHT_THEME_CLASSES.PANEL_SHADOW}`
      )}>
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
            <div className="relative">
              <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`} />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={applyThemeClass(
                  'w-full pl-10 pr-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-celeste-500',
                  `w-full pl-10 pr-4 py-2 ${LIGHT_THEME_CLASSES.INPUT}`
                )}
              />
            </div>
            
            <Select value={filterRole} onValueChange={(next) => setFilterRole(next as any)}>
              <SelectTrigger
                className={applyThemeClass(
                  'px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-celeste-500',
                  `px-4 py-2 ${LIGHT_THEME_CLASSES.INPUT}`
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className={applyThemeClass(
                  'bg-minddash-elevated border border-minddash-border text-white',
                  'bg-white border border-gray-200 text-gray-900'
                )}
              >
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="user">Usuarios</SelectItem>
                <SelectItem value="viewer">Visualizadores</SelectItem>
                <SelectItem value="editor">Editores</SelectItem>
              </SelectContent>
            </Select>
            
            <div className={`text-sm flex items-center ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}>
              <FiFilter className={`w-4 h-4 mr-2 ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`} />
              {filteredUsers.length} de {users.length} usuarios
            </div>
          </div>

          <button
            onClick={refreshUsers}
            disabled={refreshing}
            className={applyThemeClass(
              'flex items-center justify-center p-1 bg-minddash-elevated hover:bg-minddash-card disabled:opacity-50 border border-minddash-border hover:border-gray-600 text-gray-300 hover:text-white rounded transition-all w-8 h-8',
              'flex items-center justify-center p-1 bg-white hover:bg-gray-100 disabled:opacity-50 border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 rounded transition-all w-8 h-8'
            )}
            title="Actualizar tabla"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div
        className={applyThemeClass(
          'bg-minddash-card border border-minddash-border rounded-xl overflow-hidden',
          `${LIGHT_THEME_CLASSES.SURFACE} ${LIGHT_THEME_CLASSES.BORDER} rounded-xl overflow-hidden ${LIGHT_THEME_CLASSES.PANEL_SHADOW}`
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead
              className={applyThemeClass(
                'bg-minddash-elevated border-b border-minddash-border',
                `${LIGHT_THEME_CLASSES.SURFACE_MUTED} border-b ${LIGHT_THEME_CLASSES.BORDER}`
              )}
            >
              <tr>
                {/* Usuario - Sortable */}
                <th 
                  onClick={() => {
                    const currentSort = sorting.find(s => s.id === 'username');
                    setSorting([{ id: 'username', desc: currentSort ? !currentSort.desc : false }]);
                  }}
                  className={`group px-6 py-4 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none transition-colors ${applyThemeClass('text-gray-400 hover:text-gray-200', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}
                >
                  <div className="flex items-center gap-1">
                    Usuario
                    <span className={`inline-flex flex-col -space-y-1 ${sorting.find(s => s.id === 'username') ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                      <FiChevronUp size={10} className={sorting.find(s => s.id === 'username') && !sorting.find(s => s.id === 'username')?.desc ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                      <FiChevronDown size={10} className={sorting.find(s => s.id === 'username')?.desc ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                    </span>
                  </div>
                </th>
                <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}>WhatsApp</th>
                {/* Rol - Sortable */}
                <th 
                  onClick={() => {
                    const currentSort = sorting.find(s => s.id === 'role');
                    setSorting([{ id: 'role', desc: currentSort ? !currentSort.desc : false }]);
                  }}
                  className={`group px-6 py-4 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none transition-colors ${applyThemeClass('text-gray-400 hover:text-gray-200', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}
                >
                  <div className="flex items-center gap-1">
                    Rol
                    <span className={`inline-flex flex-col -space-y-1 ${sorting.find(s => s.id === 'role') ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                      <FiChevronUp size={10} className={sorting.find(s => s.id === 'role') && !sorting.find(s => s.id === 'role')?.desc ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                      <FiChevronDown size={10} className={sorting.find(s => s.id === 'role')?.desc ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                    </span>
                  </div>
                </th>
                {isBayerAdmin && (
                  <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}>CUITs</th>
                )}
                {/* Estado - Sortable */}
                <th 
                  onClick={() => {
                    const currentSort = sorting.find(s => s.id === 'is_active');
                    setSorting([{ id: 'is_active', desc: currentSort ? !currentSort.desc : false }]);
                  }}
                  className={`group px-6 py-4 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none transition-colors ${applyThemeClass('text-gray-400 hover:text-gray-200', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}
                >
                  <div className="flex items-center gap-1">
                    Estado
                    <span className={`inline-flex flex-col -space-y-1 ${sorting.find(s => s.id === 'is_active') ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                      <FiChevronUp size={10} className={sorting.find(s => s.id === 'is_active') && !sorting.find(s => s.id === 'is_active')?.desc ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                      <FiChevronDown size={10} className={sorting.find(s => s.id === 'is_active')?.desc ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                    </span>
                  </div>
                </th>
                {/* Fecha - Sortable */}
                <th 
                  onClick={() => {
                    const currentSort = sorting.find(s => s.id === 'created_at');
                    setSorting([{ id: 'created_at', desc: currentSort ? !currentSort.desc : false }]);
                  }}
                  className={`group px-6 py-4 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none transition-colors ${applyThemeClass('text-gray-400 hover:text-gray-200', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}
                >
                  <div className="flex items-center gap-1">
                    Creación
                    <span className={`inline-flex flex-col -space-y-1 ${sorting.find(s => s.id === 'created_at') ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                      <FiChevronUp size={10} className={sorting.find(s => s.id === 'created_at') && !sorting.find(s => s.id === 'created_at')?.desc ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                      <FiChevronDown size={10} className={sorting.find(s => s.id === 'created_at')?.desc ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                    </span>
                  </div>
                </th>
                <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}>Acciones</th>
              </tr>
            </thead>
            <tbody
              className={applyThemeClass(
                'divide-y divide-gray-800',
                `divide-y ${LIGHT_THEME_CLASSES.BORDER}`
              )}
            >
              {(loading || refreshing) ? (
                // Skeleton loading durante carga inicial o refresh
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-700"></div>
                        </div>
                        <div className="ml-4">
                          <div className="h-4 bg-gray-700 rounded w-24 mb-1"></div>
                          <div className="h-3 bg-gray-700 rounded w-32"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-700 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 bg-gray-700 rounded w-16"></div>
                    </td>
                    {isBayerAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-700 rounded w-12"></div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 bg-gray-700 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-700 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <div className="h-8 w-8 bg-gray-700 rounded"></div>
                        <div className="h-8 w-8 bg-gray-700 rounded"></div>
                        <div className="h-8 w-8 bg-gray-700 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                table.getRowModel().rows.map((row) => {
                  const user = row.original;
                  return (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`transition-colors ${getRowClasses(user)}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div
                          className={applyThemeClass(
                            'h-10 w-10 rounded-full bg-gradient-to-br from-minddash-celeste-600 to-minddash-celeste-700 flex items-center justify-center',
                            'h-10 w-10 rounded-full bg-minddash-celeste-100 text-minddash-celeste-700 flex items-center justify-center'
                          )}
                        >
                          <FiUser className={applyThemeClass('w-5 h-5 text-white', 'w-5 h-5 text-minddash-celeste-700')} />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center space-x-2">
                          <div className={`text-sm font-medium ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>{user.username}</div>
                          {!user.is_active && (
                            <span className={applyThemeClass('text-xs px-2 py-1 bg-red-600/20 text-red-400 rounded-full', 'text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full')}>
                              DESACTIVADO
                            </span>
                          )}
                        </div>
                        <div className={`text-sm ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>{user.phoneNumber || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                      {user.role === 'admin' ? 'Administrador' : user.role === 'user' ? 'Usuario' : user.role === 'viewer' ? 'Visualizador' : user.role === 'editor' ? 'Editor' : 'Super Admin'}
                    </span>
                  </td>
                  {/* Columna CUITs solo para admin de Bayer */}
                  {isBayerAdmin && (
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {user.cuit_codes && user.cuit_codes.length > 0 ? (
                          user.cuit_codes.map((cuit, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <span className={`text-sm px-2 py-1 rounded ${applyThemeClass('bg-indigo-900/40 text-indigo-200', LIGHT_THEME_CLASSES.BADGE_INDIGO)}`}>
                                {cuit}
                              </span>
                            </div>
                          ))
                        ) : user.cuit_code ? (
                          // Fallback para compatibilidad con formato anterior
                          <span className={`text-sm px-2 py-1 rounded ${applyThemeClass('bg-indigo-900/40 text-indigo-200', LIGHT_THEME_CLASSES.BADGE_INDIGO)}`}>
                            {user.cuit_code}
                          </span>
                        ) : user.access_role === 'DISTRIBUIDOR_ACCESS' ? (
                          <span className={`text-sm ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}>Sin CUITs</span>
                        ) : (
                          <span className={`text-sm ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}>Total Acceso</span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge variant={user.is_active ? 'active' : 'inactive'} dot>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </StatusBadge>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}>
                    {user.last_login 
                      ? new Date(user.last_login).toLocaleDateString()
                      : 'Nunca'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleViewUser(user)}
                        className={applyThemeClass('p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors', 'p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors')}
                        title="Ver datos del usuario"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openAccessModal(user)}
                        disabled={isProtectedRole(user.role)}
                        className={`${applyThemeClass('p-2 text-minddash-celeste-300 hover:bg-minddash-celeste-500/10 rounded-lg transition-colors', 'p-2 text-minddash-celeste-700 hover:bg-minddash-celeste-100 rounded-lg transition-colors')} ${
                          isProtectedRole(user.role) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={isProtectedRole(user.role) ? 'Acción no disponible para administradores' : 'Gestionar accesos'}
                      >
                        <FiKey className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        disabled={isProtectedRole(user.role)}
                        className={`${applyThemeClass('p-2 text-purple-400 hover:bg-purple-900/20 rounded-lg transition-colors', 'p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors')} ${
                          isProtectedRole(user.role) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={isProtectedRole(user.role) ? 'Acción no disponible para administradores' : 'Editar usuario'}
                      >
                        <FiEdit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={!user.is_active || isProtectedRole(user.role)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.is_active && !isProtectedRole(user.role)
                            ? applyThemeClass('text-red-400 hover:bg-red-900/20', 'text-red-600 hover:bg-red-100')
                            : applyThemeClass('text-gray-600 cursor-not-allowed', 'text-gray-400 cursor-not-allowed')
                        }`}
                        title={
                          isProtectedRole(user.role)
                            ? 'Acción no disponible para administradores'
                            : user.is_active
                              ? 'Eliminar'
                              : 'Reactivar usuario para eliminar'
                        }
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
        
        {!loading && !refreshing && filteredUsers.length === 0 && (
          <div className="text-center py-16">
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${applyThemeClass('bg-gray-800', 'bg-gray-100')}`}>
              <FiUser className={`w-8 h-8 ${applyThemeClass('text-gray-600', 'text-gray-400')}`} />
            </div>
            {users.length === 0 ? (
              <>
                <p className={`text-lg font-medium mb-2 ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>No hay usuarios todavía</p>
                <p className={`text-sm mb-6 ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}>Comienza creando el primer usuario para tu equipo</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-minddash-celeste-600 hover:bg-minddash-celeste-700 text-white rounded-lg transition-colors"
                >
                  <FiPlus className="w-4 h-4 mr-2" />
                  Crear primer usuario
                </button>
              </>
            ) : (
              <>
                <p className={`text-lg font-medium mb-2 ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>Sin resultados</p>
                <p className={`text-sm mb-6 ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}>No se encontraron usuarios con los filtros actuales</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterRole('all');
                  }}
                  className={applyThemeClass(
                    'inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors',
                    'inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors'
                  )}
                >
                  <FiXCircle className="w-4 h-4 mr-2" />
                  Limpiar filtros
                </button>
              </>
            )}
          </div>
        )}

        {/* Controles de paginación */}
        {!loading && !refreshing && filteredUsers.length > 0 && (
          <div className={`flex items-center justify-between px-6 py-4 border-t ${applyThemeClass('border-gray-800', LIGHT_THEME_CLASSES.BORDER)}`}>
            <div className={`text-sm ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}>
              Mostrando {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredUsers.length)} de {filteredUsers.length} usuarios
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${applyThemeClass('hover:bg-gray-700 text-gray-400', 'hover:bg-gray-100 text-gray-600')}`}
                title="Primera página"
              >
                <FiChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${applyThemeClass('hover:bg-gray-700 text-gray-400', 'hover:bg-gray-100 text-gray-600')}`}
                title="Página anterior"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className={`px-3 py-1 text-sm ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${applyThemeClass('hover:bg-gray-700 text-gray-400', 'hover:bg-gray-100 text-gray-600')}`}
                title="Página siguiente"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${applyThemeClass('hover:bg-gray-700 text-gray-400', 'hover:bg-gray-100 text-gray-600')}`}
                title="Última página"
              >
                <FiChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de creación/edición */}
      <ModalPortal>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden', 'bg-white border border-gray-200 rounded-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden')}
            >
              {/* Header fijo */}
              <div className={applyThemeClass('flex-shrink-0 px-6 py-4 border-b border-minddash-border bg-minddash-card', 'flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white')}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingUser(null);
                    setFormData({ username: '', email: '', phoneNumber: '', password: '', role: 'user', access_role: 'AllAccess', cuit_code: '', cuit_codes: [] });
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
                  title="Cerrar"
                >
                  <FiXCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nombre de usuario
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className={applyThemeClass('w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-celeste-500', 'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-minddash-celeste-500')}
                  placeholder="ej: juan.perez"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={applyThemeClass('w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-celeste-500', 'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-minddash-celeste-500')}
                  placeholder="juan@miempresa.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Número de WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  className={`w-full px-4 py-2 ${applyThemeClass('bg-minddash-elevated', 'bg-white')} border rounded-lg ${applyThemeClass('text-white', 'text-gray-900')} focus:outline-none ${
                    formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-700 focus:border-minddash-celeste-500'
                  }`}
                  placeholder="+54 9 11 1234-5678"
                />
                {formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber) && (
                  <p className="text-xs text-red-400 mt-1">
                    Formato inválido. Ej: +54 9 11 1234-5678
                  </p>
                )}
              </div>
              
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className={applyThemeClass('w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-celeste-500', 'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-minddash-celeste-500')}
                    placeholder="Contraseña segura"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Rol de Usuario
                </label>
                <Select
                  value={formData.role}
                  onValueChange={(next) => setFormData({ ...formData, role: next as 'user' | 'viewer' | 'editor' })}
                >
                  <SelectTrigger className={applyThemeClass('w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-celeste-500', 'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-minddash-celeste-500')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={applyThemeClass('bg-minddash-elevated border border-minddash-border text-white', 'bg-white border border-gray-200 text-gray-900')}>
                    <SelectItem value="user">Usuario - Acceso estándar a chatbots</SelectItem>
                    <SelectItem value="viewer">Visualizador - Solo lectura</SelectItem>
                    <SelectItem value="editor">Editor - Administración sin gestión de usuarios</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  Selecciona el nivel de acceso para este usuario
                </p>
              </div>

              {editingUser && (
                <div className={applyThemeClass('border border-minddash-border rounded-lg p-4 bg-minddash-elevated', 'border border-gray-200 rounded-lg p-4 bg-gray-50')}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">Estado del usuario</p>
                      <p className="text-xs text-gray-400">Activa o desactiva el acceso al sistema</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge variant={editingUser.is_active ? 'active' : 'inactive'} dot>
                        {editingUser.is_active ? 'Activo' : 'Inactivo'}
                      </StatusBadge>
                      <Switch
                        checked={editingUser.is_active}
                        onCheckedChange={(checked) => handleSetUserStatus(editingUser.id, checked)}
                        disabled={statusUpdatingUserId === editingUser.id}
                        className="data-[state=checked]:bg-minddash-celeste-600 data-[state=unchecked]:bg-gray-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Campos adicionales para admin de Bayer */}
              {isBayerAdmin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Rol de Acceso
                    </label>
                    <Select
                      value={formData.access_role}
                      onValueChange={(next) => setFormData({ ...formData, access_role: next })}
                    >
                      <SelectTrigger className={applyThemeClass('w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-celeste-500', 'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-minddash-celeste-500')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={applyThemeClass('bg-minddash-elevated border border-minddash-border text-white', 'bg-white border border-gray-200 text-gray-900')}>
                        <SelectItem value="AllAccess">Total Acceso</SelectItem>
                        <SelectItem value="DISTRIBUIDOR_ACCESS">Distribuidor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.access_role === 'DISTRIBUIDOR_ACCESS' && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-gray-400">
                          Códigos CUIT *
                        </label>
                        {formData.cuit_codes.length < 3 && (
                          <button
                            type="button"
                            onClick={addAccessCode}
                            className="inline-flex items-center px-3 py-1 text-xs bg-minddash-celeste-600 text-white rounded hover:bg-minddash-celeste-700"
                          >
                            <FiPlus className="w-3 h-3 mr-1" />
                            Agregar CUIT
                          </button>
                        )}
                      </div>

                      {/* Contenedor scrolleable para CUITs */}
                      <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-2">
                        {formData.cuit_codes.map((code, index) => (
                          <div key={index} className={`flex items-center space-x-3 p-3 border rounded-lg ${applyThemeClass('border-minddash-border bg-minddash-elevated', 'border-gray-200 bg-gray-50')}`}>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={code.codevalue}
                                onChange={(e) => updateAccessCode(index, 'codevalue', e.target.value)}
                                placeholder="12345678901"
                                maxLength={11}
                                className={`w-full px-3 py-2 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                                  code.codevalue && !validateCuitFormat(code.codevalue)
                                    ? 'border-red-500 focus:ring-red-500 bg-red-900/20'
                                    : applyThemeClass('border-gray-600 focus:ring-minddash-celeste-500 bg-minddash-elevated', 'border-gray-300 focus:ring-minddash-celeste-500 bg-white')
                                }`}
                              />
                              {code.codevalue && !validateCuitFormat(code.codevalue) && (
                                <p className="text-xs text-red-400 mt-1">
                                  CUIT debe contener exactamente 11 dígitos
                                </p>
                              )}
                            </div>
                            <div>
                              <span className="px-3 py-2 bg-gray-600 text-gray-300 rounded-md text-sm">
                                CUIT
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAccessCode(index)}
                              className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                              title="Eliminar CUIT"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {formData.cuit_codes.length === 0 && (
                          <div className={`text-center py-8 border-2 border-dashed rounded-lg ${applyThemeClass('border-gray-600 bg-minddash-elevated/50', 'border-gray-300 bg-gray-50')}`}>
                            <div className="space-y-2">
                              <div className="mx-auto w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                                <FiPlus className="w-6 h-6 text-gray-400" />
                              </div>
                              <p className="text-gray-400 text-sm font-medium">
                                No hay CUITs agregados
                              </p>
                              <p className="text-gray-500 text-xs">
                                Haz clic en "Agregar CUIT" para comenzar
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        💡 Máximo 3 CUITs por usuario. Cada CUIT debe ser único.
                      </p>
                    </div>
                  )}
                </>
              )}
              </div>
            </div>
            
            {/* Footer fijo con botones */}
            <div className={applyThemeClass('flex-shrink-0 px-4 sm:px-6 py-4 border-t border-minddash-border bg-minddash-card', 'flex-shrink-0 px-4 sm:px-6 py-4 border-t border-gray-200 bg-white')}>
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingUser(null);
                  setFormData({ username: '', email: '', phoneNumber: '', password: '', role: 'user', access_role: 'AllAccess', cuit_code: '', cuit_codes: [] });
                }}
                className="w-full sm:w-auto px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-600 rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={editingUser ? handleUpdateUser : handleCreateUser}
                disabled={
                  editingUser
                    ? // Para edición: deshabilitar si no hay cambios
                      (formData.username === editingUser.username &&
                       formData.email === editingUser.email &&
                       formData.phoneNumber === (editingUser.phoneNumber || '') &&
                       formData.role === editingUser.role &&
                       !formData.password)
                    : // Para creación: deshabilitar si faltan campos requeridos
                      (!formData.username.trim() || !formData.email.trim() || !formData.password.trim())
                }
                className="w-full sm:w-auto bg-minddash-celeste-600 hover:bg-minddash-celeste-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {editingUser ? 'Actualizar' : 'Crear'}
              </button>
              </div>
            </div>
            </motion.div>
          </div>
        )}
      </ModalPortal>

      <ModalPortal>
        <AnimatePresence>
          {showAccessModal && accessUser && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden', 'bg-white border border-gray-200 rounded-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden')}
            >
              <div className={applyThemeClass('flex-shrink-0 px-6 py-4 border-b border-minddash-border bg-minddash-card', 'flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-minddash-celeste-600/20 rounded-full flex items-center justify-center">
                      <FiKey className="w-5 h-5 text-minddash-celeste-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Accesos del Usuario</h3>
                      <p className="text-sm text-gray-400">{accessUser.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeAccessModal}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
                    title="Cerrar"
                  >
                    <FiXCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="relative flex-1">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Buscar organización / proyecto / chatbot..."
                        value={accessSearch}
                        onChange={(e) => setAccessSearch(e.target.value)}
                        className={applyThemeClass('pl-10 bg-minddash-elevated border-minddash-border text-white placeholder:text-gray-400 focus-visible:ring-minddash-celeste-500 focus-visible:border-minddash-celeste-500', 'pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-minddash-celeste-500 focus-visible:border-minddash-celeste-500')}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                      <div className="flex items-center gap-2 text-sm text-gray-300 select-none">
                        <Checkbox
                          checked={accessOnlySelected}
                          onCheckedChange={(checked) => setAccessOnlySelected(!!checked)}
                          className="border-minddash-celeste-600 data-[state=checked]:bg-minddash-celeste-600 data-[state=checked]:text-white data-[state=checked]:border-minddash-celeste-600"
                        />
                        <span>Solo asignados</span>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={clearAllAccessSelections}
                        className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white"
                      >
                        Limpiar
                      </Button>

                      <div className="text-sm text-gray-400 flex items-center gap-2">
                      <span>Org: <span className={applyThemeClass('text-white font-medium', 'text-gray-900 font-medium')}>{selectedOrganizationIds.size}</span></span>
                      <span className="text-gray-600">|</span>
                      <span>Proy: <span className={applyThemeClass('text-white font-medium', 'text-gray-900 font-medium')}>{selectedProjectIds.size}</span></span>
                      <span className="text-gray-600">|</span>
                      <span>Chatbots: <span className={applyThemeClass('text-white font-medium', 'text-gray-900 font-medium')}>{selectedProductIds.size}</span></span>
                      </div>
                    </div>
                  </div>

                  {accessLoading ? (
                    <div className="flex items-center justify-center h-56">
                      <div className="w-8 h-8 border-2 border-minddash-celeste-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className={applyThemeClass('border border-minddash-border rounded-xl overflow-hidden', 'border border-gray-200 rounded-xl overflow-hidden')}>
                        <div className={applyThemeClass('px-4 py-3 bg-minddash-elevated border-b border-minddash-border', 'px-4 py-3 bg-gray-50 border-b border-gray-200')}>
                          <div className="flex items-center justify-between gap-3">
                            <h4 className={`text-sm font-semibold ${applyThemeClass('text-white', 'text-gray-900')}`}>Organizaciones</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={selectAllOrganizations}
                              className="h-8 px-2 text-xs text-minddash-celeste-300 hover:text-minddash-celeste-200 hover:bg-minddash-celeste-500/10"
                            >
                              Seleccionar todas
                            </Button>
                          </div>
                        </div>
                        <ScrollArea className="h-80">
                          <div className="divide-y divide-gray-800">
                            {accessOrganizations
                              .filter((o) => o.name.toLowerCase().includes(accessSearch.toLowerCase()))
                              .filter((o) => (accessOnlySelected ? selectedOrganizationIds.has(o.id) : true))
                              .map((org) => {
                                const isActive = activeOrganizationId === org.id;
                                const checked = selectedOrganizationIds.has(org.id);

                                return (
                                  <div
                                    key={org.id}
                                    className={
                                      'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ' +
                                      (isActive ? 'bg-minddash-celeste-500/10 border-l-2 border-l-minddash-celeste-500' : applyThemeClass('hover:bg-minddash-elevated border-l-2 border-l-transparent', 'hover:bg-gray-50 border-l-2 border-l-transparent'))
                                    }
                                    onClick={() => {
                                      setActiveOrganizationId(org.id);
                                      setActiveProjectId(null);
                                    }}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() => toggleOrganization(org.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-shrink-0 border-minddash-celeste-600 data-[state=checked]:bg-minddash-celeste-600 data-[state=checked]:text-white data-[state=checked]:border-minddash-celeste-600"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm text-white truncate block">{org.name}</span>
                                    </div>
                                    <div className="flex-shrink-0">
                                      {checked ? (
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-minddash-celeste-600/30">
                                          <svg className="w-3 h-3 text-minddash-celeste-300" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700/50">
                                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>

                          {accessOrganizations.length === 0 && (
                            <div className="px-4 py-6 text-center text-sm text-gray-400">Sin organizaciones</div>
                          )}
                        </ScrollArea>
                      </div>

                      <div className={applyThemeClass('border border-minddash-border rounded-xl overflow-hidden', 'border border-gray-200 rounded-xl overflow-hidden')}>
                        <div className={applyThemeClass('px-4 py-3 bg-minddash-elevated border-b border-minddash-border', 'px-4 py-3 bg-gray-50 border-b border-gray-200')}>
                          <div className="flex items-center justify-between gap-3">
                            <h4 className={`text-sm font-semibold ${applyThemeClass('text-white', 'text-gray-900')}`}>Proyectos</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={selectAllProjectsInActiveOrg}
                                disabled={!activeOrganizationId}
                                className="h-8 px-2 text-xs text-minddash-celeste-300 hover:text-minddash-celeste-200 hover:bg-minddash-celeste-500/10 disabled:text-gray-500 disabled:hover:bg-transparent"
                              >
                                Todo
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearProjectsInActiveOrg}
                                disabled={!activeOrganizationId}
                                className="h-8 px-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 disabled:text-gray-500 disabled:hover:bg-transparent"
                              >
                                Nada
                              </Button>
                            </div>
                          </div>
                        </div>
                        <ScrollArea className="h-80">
                          {!activeOrganizationId ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-400">Selecciona una organización</div>
                          ) : (
                            <div className="divide-y divide-gray-800">
                              {accessProjects
                                .filter((p) => p.organization_id === activeOrganizationId)
                                .filter((p) => p.name.toLowerCase().includes(accessSearch.toLowerCase()))
                                .filter((p) => (accessOnlySelected ? selectedProjectIds.has(p.id) : true))
                                .map((project) => {
                                  const isActive = activeProjectId === project.id;
                                  const checked = selectedProjectIds.has(project.id);

                                  return (
                                    <div
                                      key={project.id}
                                      className={
                                        'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ' +
                                        (isActive ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : applyThemeClass('hover:bg-minddash-elevated border-l-2 border-l-transparent', 'hover:bg-gray-50 border-l-2 border-l-transparent'))
                                      }
                                      onClick={() => setActiveProjectId(project.id)}
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => toggleProject(project.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-shrink-0 border-minddash-celeste-600 data-[state=checked]:bg-minddash-celeste-600 data-[state=checked]:text-white data-[state=checked]:border-minddash-celeste-600"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm text-white truncate block">{project.name}</span>
                                      </div>
                                      <div className="flex-shrink-0">
                                        {checked ? (
                                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-minddash-celeste-600/30">
                                            <svg className="w-3 h-3 text-minddash-celeste-300" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700/50">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          {accessProjects.length === 0 && (
                            <div className="px-4 py-6 text-center text-sm text-gray-400">Sin proyectos</div>
                          )}
                        </ScrollArea>
                      </div>

                      <div className={applyThemeClass('border border-minddash-border rounded-xl overflow-hidden', 'border border-gray-200 rounded-xl overflow-hidden')}>
                        <div className={applyThemeClass('px-4 py-3 bg-minddash-elevated border-b border-minddash-border', 'px-4 py-3 bg-gray-50 border-b border-gray-200')}>
                          <div className="flex items-center justify-between gap-3">
                            <h4 className={`text-sm font-semibold ${applyThemeClass('text-white', 'text-gray-900')}`}>Chatbots</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={selectAllProductsInActiveProject}
                                disabled={!activeProjectId}
                                className="h-8 px-2 text-xs text-minddash-celeste-300 hover:text-minddash-celeste-200 hover:bg-minddash-celeste-500/10 disabled:text-gray-500 disabled:hover:bg-transparent"
                              >
                                Todo
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearProductsInActiveProject}
                                disabled={!activeProjectId}
                                className="h-8 px-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 disabled:text-gray-500 disabled:hover:bg-transparent"
                              >
                                Nada
                              </Button>
                            </div>
                          </div>
                        </div>
                        <ScrollArea className="h-80">
                          {!activeProjectId ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-400">Selecciona un proyecto</div>
                          ) : (
                            <div className="divide-y divide-gray-800">
                              {accessProducts
                                .filter((p) => p.project_id === activeProjectId)
                                .filter((p) => p.name.toLowerCase().includes(accessSearch.toLowerCase()))
                                .filter((p) => (accessOnlySelected ? selectedProductIds.has(p.id) : true))
                                .map((product) => {
                                  const checked = selectedProductIds.has(product.id);

                                  return (
                                    <div
                                      key={product.id}
                                      className={`flex items-center gap-3 px-3 py-2.5 transition-colors border-l-2 border-l-transparent ${applyThemeClass('hover:bg-minddash-elevated', 'hover:bg-gray-50')}`}
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => toggleProduct(product.id)}
                                        className="flex-shrink-0 border-minddash-celeste-600 data-[state=checked]:bg-minddash-celeste-600 data-[state=checked]:text-white data-[state=checked]:border-minddash-celeste-600"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm text-white truncate block">{product.name}</span>
                                      </div>
                                      <div className="flex-shrink-0">
                                        {checked ? (
                                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-minddash-celeste-600/30">
                                            <svg className="w-3 h-3 text-minddash-celeste-300" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700/50">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          {accessProducts.length === 0 && (
                            <div className="px-4 py-6 text-center text-sm text-gray-400">Sin chatbots</div>
                          )}
                        </ScrollArea>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={applyThemeClass('flex-shrink-0 px-6 py-4 border-t border-minddash-border bg-minddash-surface rounded-b-xl', 'flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl')}>
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeAccessModal}
                    disabled={accessSaving}
                    className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={saveUserAccess}
                    disabled={accessSaving}
                    className="bg-minddash-celeste-600 hover:bg-minddash-celeste-700 text-white"
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Sistema de notificaciones interno como fallback */}

      {/* Modal de confirmación de eliminación híbrido */}
      <ModalPortal>
        <AnimatePresence>
          {showDeleteModal && userToDelete && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-xl w-full max-w-md shadow-2xl', 'bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-2xl')}
            >
              {/* Header simplificado */}
              <div className={applyThemeClass('px-6 py-3 text-center border-b border-minddash-border', 'px-6 py-3 text-center border-b border-gray-200')}>
                <h3 className="text-base font-medium text-white">
                  Eliminar: {userToDelete.username}
                </h3>
              </div>

              {/* Botones en línea estilo confirmación */}
              <div className="px-6 py-4">
                <div className="flex gap-2 justify-center">
                  {/* Cancelar */}
                  <button
                    onClick={handleCancelDelete}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  
                  {/* Desactivar */}
                  <button
                    onClick={handleRequestDeactivate}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors"
                  >
                    Desactivar
                  </button>

                  {/* Eliminar */}
                  <button
                    onClick={handleRequestPermanentDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal de confirmación para DESACTIVAR */}
      <ModalPortal>
        <AnimatePresence>
          {showDeactivateConfirm && userToDelete && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-xl w-full max-w-md shadow-2xl', 'bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-2xl')}
            >
              {/* Header */}
              <div className={applyThemeClass('px-6 py-4 border-b border-minddash-border', 'px-6 py-4 border-b border-gray-200')}>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-yellow-600/20 rounded-full flex items-center justify-center">
                    <FiEyeOff className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className={applyThemeClass('text-lg font-semibold text-white', 'text-lg font-semibold text-gray-900')}>
                      Confirmar Desactivación
                    </h3>
                    <p className={applyThemeClass('text-sm text-gray-400', 'text-sm text-gray-500')}>
                      Usuario: <span className={applyThemeClass('text-white font-medium', 'text-gray-900 font-medium')}>{userToDelete.username}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenido */}
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-yellow-400 mb-2">
                      ¿Desactivar este usuario?
                    </h4>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>• El usuario no podrá acceder al sistema</p>
                      <p>• Sus datos se conservan para auditoría</p>
                      <p>• Puede ser reactivado posteriormente desde administración</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={applyThemeClass('px-6 py-4 border-t border-minddash-border bg-minddash-surface rounded-b-xl', 'px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl')}>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelAllModals}
                    className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDeactivate}
                    className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal de confirmación para ELIMINAR PERMANENTEMENTE */}
      <ModalPortal>
        <AnimatePresence>
          {showPermanentConfirm && userToDelete && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-xl w-full max-w-md shadow-2xl', 'bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-2xl')}
            >
              {/* Header */}
              <div className={applyThemeClass('px-6 py-4 border-b border-minddash-border', 'px-6 py-4 border-b border-gray-200')}>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                    <FiTrash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className={applyThemeClass('text-lg font-semibold text-white', 'text-lg font-semibold text-gray-900')}>
                      Confirmar Eliminación Permanente
                    </h3>
                    <p className={applyThemeClass('text-sm text-gray-400', 'text-sm text-gray-500')}>
                      Usuario: <span className={applyThemeClass('text-white font-medium', 'text-gray-900 font-medium')}>{userToDelete.username}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenido */}
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-red-400 mb-2">
                      <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" aria-label="Advertencia" /> Eliminación Permanente</span>
                    </h4>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>• Se eliminan todos los datos del usuario</p>
                      <p>• Se revocan accesos a WhatsApp y sistemas internos</p>
                      <p>• Se pierden historiales y configuraciones</p>
                      <p><strong className="text-red-400">• Esta acción NO se puede deshacer</strong></p>
                    </div>
                  </div>

                  <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <FiActivity className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <p className="text-xs text-blue-300">
                        <strong>Importante:</strong> Se revocan todos los accesos de seguridad y permisos internos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={applyThemeClass('px-6 py-4 border-t border-minddash-border bg-minddash-surface rounded-b-xl', 'px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl')}>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelAllModals}
                    className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmPermanentDelete}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Eliminar Permanentemente
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de visualización (solo lectura) */}
        {showViewModal && viewingUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={applyThemeClass('bg-minddash-card border border-minddash-border rounded-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl', 'bg-white border border-gray-200 rounded-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl')}
            >
              {/* Header fijo */}
              <div className={applyThemeClass('flex-shrink-0 px-6 py-4 border-b border-minddash-border', 'flex-shrink-0 px-6 py-4 border-b border-gray-200')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                      <FiEye className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Datos del Usuario</h3>
                      <p className="text-sm text-gray-400">Información de {viewingUser.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setViewingUser(null);
                    }}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
                    title="Cerrar"
                  >
                    <FiXCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Contenido scrolleable */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-6">
                  {/* Información básica */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nombre de usuario
                      </label>
                      <div className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white">
                        {viewingUser.username}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Correo electrónico
                      </label>
                      <div className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white">
                        {viewingUser.email}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Número de WhatsApp
                      </label>
                      <div className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white">
                        {viewingUser.phoneNumber || '-'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Rol
                      </label>
                      <div className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white">
                        {viewingUser.role === 'admin' ? 'Administrador' : viewingUser.role === 'user' ? 'Usuario' : viewingUser.role === 'viewer' ? 'Visualizador' : 'Super Admin'}
                      </div>
                    </div>
                  </div>

                  {/* Estado y fechas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Estado
                      </label>
                      <div className={`flex items-center space-x-2`}>
                        <StatusBadge variant={viewingUser.is_active ? 'active' : 'inactive'} dot size="md">
                          {viewingUser.is_active ? 'Activo' : 'Inactivo'}
                        </StatusBadge>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Fecha de creación
                      </label>
                      <div className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white">
                        {new Date(viewingUser.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Sección específica para admin de Bayer */}
                  {isBayerAdmin && (
                    <div className="border-t border-gray-700 pt-6">
                      <h4 className={applyThemeClass('text-lg font-semibold text-white mb-4', 'text-lg font-semibold text-gray-900 mb-4')}>Configuración Bayer</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Rol de acceso
                          </label>
                          <div className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white">
                            {viewingUser.access_role === 'DISTRIBUIDOR_ACCESS' ? 'Distribuidor' : 'Acceso General'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            {viewingUser.access_role === 'AllAccess' ? 'Tipo de Acceso' : 'Cantidad de CUITs'}
                          </label>
                          <div className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white">
                            {viewingUser.access_role === 'AllAccess' ? 'Acceso Total' : (viewingUser.cuit_count || 0)}
                          </div>
                        </div>
                      </div>

                      {/* CUITs asignados */}
                      {viewingUser.access_role === 'DISTRIBUIDOR_ACCESS' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            CUITs asignados
                          </label>
                          <div className="bg-gray-50 dark:bg-minddash-elevated/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            {viewingUser.cuit_codes && viewingUser.cuit_codes.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {viewingUser.cuit_codes.map((cuit, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-900/30 text-blue-300 border border-blue-700/50"
                                  >
                                    {cuit}
                                  </span>
                                ))}
                              </div>
                            ) : viewingUser.cuit_code ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-900/30 text-blue-300 border border-blue-700/50">
                                {viewingUser.cuit_code}
                              </span>
                            ) : (
                              <p className="text-gray-400 text-sm">No hay CUITs asignados</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer fijo */}
              <div className={applyThemeClass('flex-shrink-0 px-6 py-4 border-t border-minddash-border bg-minddash-surface rounded-b-xl', 'flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl')}>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setViewingUser(null);
                    }}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>
      </ModalPortal>
    </div>
  );
}