'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  UserX,
  RefreshCw,
  KeyRound,
  XCircle,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ModalPortal from '@/components/ui/ModalPortal';
import { cn } from '@/lib/utils';

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

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

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
  } | null;
}

interface Client {
  id: string;
  nombre: string;
  descripcion: string;
  created_at: string;
  usersCount?: number;
}

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  iam_role: string;
  client_id: string;
  is_active: boolean;
}

 const UNASSIGNED_CLIENT_VALUE = '__unassigned__';

const INITIAL_FORM_DATA: FormData = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  iam_role: 'user',
  client_id: UNASSIGNED_CLIENT_VALUE,
  is_active: true,
};

const STORAGE_KEY_FILTERS = 'superadmin-users-filters';

export default function SuperAdminUserManagement() {
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<string | null>(null);

  // Access modal states
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessUser, setAccessUser] = useState<User | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessSearch, setAccessSearch] = useState('');
  const [accessOnlySelected, setAccessOnlySelected] = useState(false);
  const [accessOrganizations, setAccessOrganizations] = useState<AccessOrganization[]>([]);
  const [accessProjects, setAccessProjects] = useState<AccessProject[]>([]);
  const [accessProducts, setAccessProducts] = useState<AccessProduct[]>([]);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<Set<string>>(new Set());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [showPassword, setShowPassword] = useState(false);

  // Helper function to get auth token
  const getAuthToken = useCallback(() => {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) return null;
    try {
      return JSON.parse(authData).accessToken;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) return;
    try {
      const parsed = JSON.parse(authData);
      setCurrentUserId(parsed.userId || parsed.user_id || '');
    } catch {
      // ignore
    }
  }, []);

  // Restore filters from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FILTERS);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.searchTerm) setSearchTerm(parsed.searchTerm);
      if (parsed.filterRole) setFilterRole(parsed.filterRole);
      if (parsed.filterStatus) setFilterStatus(parsed.filterStatus);
    } catch {
      // ignore
    }
  }, []);

  // Debounce search and persist filters
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      localStorage.setItem(
        STORAGE_KEY_FILTERS,
        JSON.stringify({ searchTerm, filterRole, filterStatus })
      );
    }, 250);
    return () => clearTimeout(handle);
  }, [searchTerm, filterRole, filterStatus]);

  // Role badge styling
  const getRoleBadgeClass = (role: string) => {
    const roleMap: Record<string, string> = {
      SUPERADMIN: 'border-red-500/30 text-red-400',
      SUPER_ADMIN: 'border-red-500/30 text-red-400',
      ADMIN: 'border-minddash-celeste-500/30 text-minddash-celeste-300',
      EDITOR: 'border-slate-200/60 text-slate-700 dark:border-slate-800 dark:text-slate-300',
      USER: 'border-slate-200/60 text-slate-700 dark:border-slate-800 dark:text-slate-300',
      VIEWER: 'border-slate-200/60 text-slate-700 dark:border-slate-800 dark:text-slate-300',
    };
    return roleMap[role?.toUpperCase()] || roleMap.USER;
  };

  const getStatusBadgeClass = (active: boolean) => {
    return active
      ? 'border-minddash-verde-500/30 text-minddash-verde-300'
      : 'border-slate-200/60 text-slate-600 dark:border-slate-800 dark:text-slate-400';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'SUPERADMIN': 'Super Admin',
      'SUPER_ADMIN': 'Super Admin',
      'ADMIN': 'Administrador',
      'EDITOR': 'Editor',
      'USER': 'Usuario',
      'VIEWER': 'Visualizador',
    };
    return labels[role?.toUpperCase()] || role || 'Usuario';
  };

  // Load users from API
  const loadUsers = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      if (response.status === 403) {
        toast.error('Acceso denegado. Solo super administradores pueden acceder.');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        setUsers(result.users || result.data?.users || []);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al cargar usuarios');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error de conexión al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  // Load clients from API
  const loadClients = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch('/api/admin/companies?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setClients(result.data || []);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }, [getAuthToken]);

  // Refresh users with toast feedback
  const refreshUsers = async () => {
    const token = getAuthToken();
    if (!token) return;

    setRefreshing(true);
    
    toast.promise(
      fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then(async (response) => {
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Error al actualizar');
        }
        const result = await response.json();
        setUsers(result.users || result.data?.users || []);
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

  // Initial data load
  useEffect(() => {
    loadUsers();
    loadClients();
  }, [loadUsers, loadClients]);

  // Reset form
  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setEditingUser(null);
    setShowPassword(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterRole('all');
    setFilterStatus('all');
    setDebouncedSearchTerm('');
    localStorage.removeItem(STORAGE_KEY_FILTERS);
  };

  const highlightMatch = (text: string) => {
    if (!debouncedSearchTerm) return text;
    const regex = new RegExp(`(${debouncedSearchTerm})`, 'ig');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-minddash-celeste-500/20 px-0.5 rounded">
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  const isAccessRestrictedUser = (user: User) => {
    const role = (user.iam_role || '').toUpperCase();
    if (role === 'SUPERADMIN' || role === 'SUPER_ADMIN') return true;
    if (currentUserId && user.id === currentUserId) return true;
    return false;
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

  const openAccessModal = async (user: User) => {
    if (isAccessRestrictedUser(user)) {
      toast.error('No puedes gestionar accesos de este usuario desde aquí.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    setAccessUser(user);
    setShowAccessModal(true);
    setAccessLoading(true);
    setAccessSearch('');

    try {
      const response = await fetch(`/api/admin/users/${user.id}/access`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

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

  const toggleOrganization = (organizationId: string) => {
    const nextSelectedOrgIds = new Set(selectedOrganizationIds);
    const nextSelectedProjectIds = new Set(selectedProjectIds);
    const nextSelectedProductIds = new Set(selectedProductIds);

    const removing = nextSelectedOrgIds.has(organizationId);
    if (removing) {
      nextSelectedOrgIds.delete(organizationId);

      const projectIdsInOrg = accessProjects
        .filter((p) => p.organization_id === organizationId)
        .map((p) => p.id);
      const projectIdSet = new Set(projectIdsInOrg);
      projectIdsInOrg.forEach((id) => nextSelectedProjectIds.delete(id));

      accessProducts
        .filter((p) => projectIdSet.has(p.project_id))
        .forEach((p) => nextSelectedProductIds.delete(p.id));
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

    const removing = nextSelectedProjectIds.has(projectId);
    if (removing) {
      nextSelectedProjectIds.delete(projectId);
      accessProducts
        .filter((p) => p.project_id === projectId)
        .forEach((p) => nextSelectedProductIds.delete(p.id));
    } else {
      nextSelectedProjectIds.add(projectId);

      const orgId = accessProjects.find((p) => p.id === projectId)?.organization_id;
      if (orgId) nextSelectedOrgIds.add(orgId);
    }

    setSelectedOrganizationIds(nextSelectedOrgIds);
    setSelectedProjectIds(nextSelectedProjectIds);
    setSelectedProductIds(nextSelectedProductIds);
  };

  const toggleProduct = (productId: string) => {
    const nextSelectedOrgIds = new Set(selectedOrganizationIds);
    const nextSelectedProjectIds = new Set(selectedProjectIds);
    const nextSelectedProductIds = new Set(selectedProductIds);

    const removing = nextSelectedProductIds.has(productId);
    if (removing) {
      nextSelectedProductIds.delete(productId);
    } else {
      nextSelectedProductIds.add(productId);

      const projectId = accessProducts.find((p) => p.id === productId)?.project_id;
      if (projectId) {
        nextSelectedProjectIds.add(projectId);
        const orgId = accessProjects.find((p) => p.id === projectId)?.organization_id;
        if (orgId) nextSelectedOrgIds.add(orgId);
      }
    }

    setSelectedOrganizationIds(nextSelectedOrgIds);
    setSelectedProjectIds(nextSelectedProjectIds);
    setSelectedProductIds(nextSelectedProductIds);
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

  const saveUserAccess = async () => {
    if (!accessUser) return;
    const token = getAuthToken();
    if (!token) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    setAccessSaving(true);
    const requestPromise = fetch(`/api/admin/users/${accessUser.id}/access`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        organizationIds: Array.from(selectedOrganizationIds),
        projectIds: Array.from(selectedProjectIds),
        productIds: Array.from(selectedProductIds),
      }),
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Error guardando accesos');
      }
      return result;
    });

    toast.promise(requestPromise, {
      loading: 'Guardando accesos...',
      success: 'Accesos actualizados',
      error: (err) => err.message || 'Error guardando accesos',
    });

    requestPromise
      .then(() => {
        closeAccessModal();
      })
      .finally(() => {
        setAccessSaving(false);
      });
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        debouncedSearchTerm === '' ||
        user.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (user.client?.nombre || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || user.iam_role?.toUpperCase() === filterRole.toUpperCase();
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && user.is_active) || 
        (filterStatus === 'inactive' && !user.is_active);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, debouncedSearchTerm, filterRole, filterStatus]);

  // Table columns
  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      accessorKey: 'username',
      header: 'Usuario',
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableSorting: true,
    },
    {
      accessorKey: 'iam_role',
      header: 'Rol',
      enableSorting: true,
    },
    {
      accessorKey: 'client',
      header: 'Cliente',
      enableSorting: false,
    },
    {
      accessorKey: 'is_active',
      header: 'Estado',
      enableSorting: true,
    },
    {
      accessorKey: 'created_at',
      header: 'Creado',
      enableSorting: true,
    },
    {
      id: 'actions',
      header: 'Acciones',
      enableSorting: false,
    },
  ], []);

  // Table instance
  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  // Handle user status toggle
  const handleSetUserStatus = async (userId: string, isActive: boolean) => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    setStatusUpdatingUserId(userId);

    toast.promise(
      fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: isActive })
      }).then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Error cambiando estado del usuario');
        }
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u))
        );
        return result;
      }).finally(() => {
        setStatusUpdatingUserId(null);
      }),
      {
        loading: `${isActive ? 'Activando' : 'Desactivando'} usuario...`,
        success: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
        error: (err) => err.message || 'Error de conexión. Intenta nuevamente.'
      }
    );
  };

  // Handle create user
  const handleCreateUser = async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    // Validations
    if (!formData.username.trim()) {
      toast.error('El nombre de usuario es requerido');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('El email es requerido');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('El formato del email no es válido');
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error('La contraseña es requerida');
      return;
    }
    if (!editingUser && formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!editingUser && formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    const isEditing = !!editingUser;
    const endpoint = isEditing ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
    const method = isEditing ? 'PUT' : 'POST';

    const requestBody: any = {
      username: formData.username,
      email: formData.email,
      iam_role: formData.iam_role,
      is_active: formData.is_active,
      client_id: formData.client_id === UNASSIGNED_CLIENT_VALUE ? null : (formData.client_id || null),
    };

    if (formData.password) {
      requestBody.password = formData.password;
    }

    toast.promise(
      fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      }).then(async (response) => {
        const result = await response.json();

        if (!response.ok || !result.success) {
          // Check for specific error messages
          if (result.message?.includes('ya están en uso') || result.message?.includes('already')) {
            throw new Error('El username o email ya están en uso');
          }
          throw new Error(result.message || `Error ${isEditing ? 'actualizando' : 'creando'} usuario`);
        }

        if (isEditing) {
          setUsers((prev) =>
            prev.map((u) => (u.id === editingUser.id ? { 
              ...u, 
              ...requestBody,
              client: formData.client_id ? clients.find(c => c.id === formData.client_id) || null : null
            } : u))
          );
        } else {
          // Reload to get the new user with all relations
          loadUsers();
        }

        setShowCreateModal(false);
        setEditingUser(null);
        setFormData(INITIAL_FORM_DATA);
        return result;
      }),
      {
        loading: isEditing ? 'Actualizando usuario...' : 'Creando usuario...',
        success: isEditing ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente',
        error: (err) => err.message || 'Error de conexión. Intenta nuevamente.'
      }
    );
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    const token = getAuthToken();
    if (!token) {
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    toast.promise(
      fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Error eliminando usuario');
        }
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setShowDeleteModal(false);
        setUserToDelete(null);
        return result;
      }),
      {
        loading: 'Eliminando usuario...',
        success: `Usuario "${userToDelete.username}" eliminado exitosamente`,
        error: (err) => err.message || 'Error de conexión. Intenta nuevamente.'
      }
    );
  };

  // Open edit modal
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      iam_role: user.iam_role || 'USER',
      client_id: user.client?.id || UNASSIGNED_CLIENT_VALUE,
      is_active: user.is_active,
    });
    setShowCreateModal(true);
  };

  // Open delete modal
  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-xl ring-1 ring-white/5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">Usuarios</h2>
            <p className="text-sm text-gray-400">Administra usuarios, roles y acceso.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshUsers} disabled={refreshing} className="border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white">
              <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
              Actualizar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo usuario
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                type="text"
                placeholder="Buscar usuario, email o cliente"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500"
              />
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/10 text-white focus:ring-purple-500">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="EDITOR">Editor</SelectItem>
                  <SelectItem value="USER">Usuario</SelectItem>
                  <SelectItem value="VIEWER">Visualizador</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[160px] bg-white/5 border-white/10 text-white focus:ring-purple-500">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(debouncedSearchTerm || filterRole !== 'all' || filterStatus !== 'all') && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                <span className="text-xs uppercase tracking-wide text-gray-500">Filtros:</span>
                {debouncedSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-white transition hover:bg-white/20"
                  >
                    <span className="text-xs font-medium">Buscar: {debouncedSearchTerm}</span>
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                )}
                {filterRole !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setFilterRole('all')}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-white transition hover:bg-white/20"
                  >
                    <span className="text-xs font-medium">Rol: {getRoleLabel(filterRole)}</span>
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                )}
                {filterStatus !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setFilterStatus('all')}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-white transition hover:bg-white/20"
                  >
                    <span className="text-xs font-medium">Estado: {filterStatus === 'active' ? 'Activos' : 'Inactivos'}</span>
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-gray-500 underline-offset-4 hover:text-white hover:underline"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-xl ring-1 ring-white/5 overflow-hidden">
        <div className="flex flex-row items-center justify-between space-y-0 p-6 border-b border-white/10">
          <div className="text-sm text-gray-400">{filteredUsers.length} usuarios</div>
          <div className="text-sm text-gray-400">
            {totalRows > 0 ? `${startRow}–${endRow} de ${totalRows}` : '0 resultados'}
          </div>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Cargando usuarios...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center">
              <UserX className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <div className="text-sm font-medium">No se encontraron usuarios</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
                  ? 'No hay usuarios que coincidan con los filtros aplicados.'
                  : 'Comienza creando tu primer usuario.'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={cn(
                            'h-11 border-b border-border/60 bg-inherit text-xs font-semibold uppercase tracking-wide text-muted-foreground/80',
                            header.column.getCanSort() && 'cursor-pointer select-none'
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-2">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              <span className="text-muted-foreground">
                                {header.column.getIsSorted() === 'asc' ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : header.column.getIsSorted() === 'desc' ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : null}
                              </span>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => {
                    const user = row.original;
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          'border-b border-border/60 transition-colors hover:bg-minddash-celeste-500/5',
                          !user.is_active && 'opacity-70'
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-minddash-celeste-500/10 text-xs font-semibold text-foreground ring-1 ring-minddash-celeste-500/15">
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{highlightMatch(user.username)}</div>
                              <div className="truncate text-xs text-muted-foreground">ID {user.id.slice(0, 8)}…</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{highlightMatch(user.email)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('font-medium inline-flex items-center gap-1.5', getRoleBadgeClass(user.iam_role))}
                          >
                            <Users className="h-3.5 w-3.5 opacity-80" />
                            {getRoleLabel(user.iam_role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={cn(!user.client?.nombre && 'text-muted-foreground')}>
                            {highlightMatch(user.client?.nombre || 'Sin asignar')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={cn('font-medium inline-flex items-center gap-1.5', getStatusBadgeClass(user.is_active))}
                            >
                              <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                              {user.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <Switch
                              checked={user.is_active}
                              onCheckedChange={(checked) => handleSetUserStatus(user.id, checked)}
                              disabled={statusUpdatingUserId === user.id}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const restricted = isAccessRestrictedUser(user);
                            const canDelete = user.is_active && !restricted;

                            return (
                              <div className="flex items-center justify-end space-x-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => openAccessModal(user)}
                                        disabled={restricted}
                                        className={cn(
                                          'rounded-lg p-2 transition-colors',
                                          restricted
                                            ? 'cursor-not-allowed text-muted-foreground/50'
                                            : 'text-minddash-verde-300 hover:bg-minddash-verde-500/10'
                                        )}
                                      >
                                        <KeyRound className="h-4 w-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      {restricted
                                        ? 'No disponible para super_admin ni para tu propio usuario'
                                        : 'Gestionar accesos (org/proyecto/producto)'}
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleEditUser(user)}
                                        disabled={restricted}
                                        className={cn(
                                          'rounded-lg p-2 transition-colors',
                                          restricted
                                            ? 'cursor-not-allowed text-muted-foreground/50'
                                            : 'text-minddash-celeste-300 hover:bg-minddash-celeste-500/10'
                                        )}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      {restricted
                                        ? 'No disponible para super_admin ni para tu propio usuario'
                                        : 'Editar usuario'}
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => openDeleteModal(user)}
                                        disabled={!canDelete}
                                        className={cn(
                                          'rounded-lg p-2 transition-colors',
                                          canDelete
                                            ? 'text-destructive hover:bg-destructive/10'
                                            : 'cursor-not-allowed text-muted-foreground/50'
                                        )}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      {restricted
                                        ? 'No disponible para super_admin ni para tu propio usuario'
                                        : user.is_active
                                          ? 'Eliminar usuario'
                                          : 'Reactivar para poder eliminar'}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {totalRows > 0 ? `Mostrando ${startRow}–${endRow} de ${totalRows}` : 'Mostrando 0 de 0'}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filas</span>
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-2 text-sm text-muted-foreground">
                {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
              </div>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Access Modal */}
      <ModalPortal>
        <AnimatePresence>
          {showAccessModal && accessUser && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-4xl overflow-hidden rounded-xl border bg-background text-foreground shadow-2xl"
              >
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-minddash-verde-500/15">
                      <KeyRound className="h-5 w-5 text-minddash-verde-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Accesos del usuario</h3>
                      <p className="text-sm text-muted-foreground">{accessUser.username}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeAccessModal}
                    className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Cerrar"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-[75vh] overflow-y-auto px-6 py-4">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Buscar organización / proyecto / chatbot..."
                          value={accessSearch}
                          onChange={(e) => setAccessSearch(e.target.value)}
                          className="pl-9 focus-visible:ring-minddash-celeste-500"
                        />
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground select-none">
                          <Checkbox
                            checked={accessOnlySelected}
                            onCheckedChange={(checked) => setAccessOnlySelected(!!checked)}
                            className="border-minddash-celeste-600 data-[state=checked]:bg-minddash-celeste-600 data-[state=checked]:text-white data-[state=checked]:border-minddash-celeste-600"
                          />
                          <span>Solo asignados</span>
                        </div>

                        <Button type="button" variant="outline" size="sm" onClick={clearAllAccessSelections}>
                          Limpiar
                        </Button>

                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>Org: <span className="text-foreground font-medium">{selectedOrganizationIds.size}</span></span>
                          <span className="text-muted-foreground/60">|</span>
                          <span>Proy: <span className="text-foreground font-medium">{selectedProjectIds.size}</span></span>
                          <span className="text-muted-foreground/60">|</span>
                          <span>Chatbots: <span className="text-foreground font-medium">{selectedProductIds.size}</span></span>
                        </div>
                      </div>
                    </div>

                    {accessLoading ? (
                      <div className="flex h-56 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-minddash-celeste-500 border-t-transparent" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="overflow-hidden rounded-xl border">
                          <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                            <h4 className="text-sm font-semibold">Organizaciones</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={selectAllOrganizations}
                              className="h-8 px-2 text-xs text-minddash-celeste-300 hover:bg-minddash-celeste-500/10 hover:text-minddash-celeste-300"
                            >
                              Seleccionar todas
                            </Button>
                          </div>
                          <ScrollArea className="h-80">
                            <div className="divide-y">
                              {accessOrganizations
                                .filter((o) => o.name.toLowerCase().includes(accessSearch.toLowerCase()))
                                .filter((o) => (accessOnlySelected ? selectedOrganizationIds.has(o.id) : true))
                                .map((org) => {
                                  const isActive = activeOrganizationId === org.id;
                                  const checked = selectedOrganizationIds.has(org.id);

                                  return (
                                    <div
                                      key={org.id}
                                      className={cn(
                                        'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors',
                                        isActive
                                          ? 'bg-minddash-celeste-500/10 border-l-2 border-l-minddash-celeste-500'
                                          : 'hover:bg-muted/40 border-l-2 border-l-transparent'
                                      )}
                                      onClick={() => {
                                        setActiveOrganizationId(org.id);
                                        setActiveProjectId(null);
                                      }}
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => toggleOrganization(org.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="border-minddash-celeste-600 data-[state=checked]:bg-minddash-celeste-600 data-[state=checked]:text-white data-[state=checked]:border-minddash-celeste-600"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <span className="block truncate text-sm">{org.name}</span>
                                      </div>
                                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted/60">
                                        {checked ? <span className="h-2 w-2 rounded-full bg-minddash-verde-500" /> : <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />}
                                      </div>
                                    </div>
                                  );
                                })}

                              {accessOrganizations.length === 0 && (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">Sin organizaciones</div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>

                        <div className="overflow-hidden rounded-xl border">
                          <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                            <h4 className="text-sm font-semibold">Proyectos</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={selectAllProjectsInActiveOrg}
                                disabled={!activeOrganizationId}
                                className="h-8 px-2 text-xs text-minddash-celeste-300 hover:bg-minddash-celeste-500/10 disabled:text-muted-foreground"
                              >
                                Todo
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearProjectsInActiveOrg}
                                disabled={!activeOrganizationId}
                                className="h-8 px-2 text-xs text-muted-foreground hover:bg-muted disabled:text-muted-foreground"
                              >
                                Nada
                              </Button>
                            </div>
                          </div>
                          <ScrollArea className="h-80">
                            {!activeOrganizationId ? (
                              <div className="px-4 py-6 text-center text-sm text-muted-foreground">Selecciona una organización</div>
                            ) : (
                              <div className="divide-y">
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
                                        className={cn(
                                          'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors',
                                          isActive
                                            ? 'bg-minddash-celeste-500/10 border-l-2 border-l-minddash-celeste-500'
                                            : 'hover:bg-muted/40 border-l-2 border-l-transparent'
                                        )}
                                        onClick={() => setActiveProjectId(project.id)}
                                      >
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={() => toggleProject(project.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="border-minddash-celeste-600 data-[state=checked]:bg-minddash-celeste-600 data-[state=checked]:text-white data-[state=checked]:border-minddash-celeste-600"
                                        />
                                        <div className="min-w-0 flex-1">
                                          <span className="block truncate text-sm">{project.name}</span>
                                        </div>
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted/60">
                                          {checked ? <span className="h-2 w-2 rounded-full bg-minddash-verde-500" /> : <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />}
                                        </div>
                                      </div>
                                    );
                                  })}

                                {accessProjects.length === 0 && (
                                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">Sin proyectos</div>
                                )}
                              </div>
                            )}
                          </ScrollArea>
                        </div>

                        <div className="overflow-hidden rounded-xl border">
                          <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                            <h4 className="text-sm font-semibold">Chatbots</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={selectAllProductsInActiveProject}
                                disabled={!activeProjectId}
                                className="h-8 px-2 text-xs text-minddash-celeste-300 hover:bg-minddash-celeste-500/10 disabled:text-muted-foreground"
                              >
                                Todo
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearProductsInActiveProject}
                                disabled={!activeProjectId}
                                className="h-8 px-2 text-xs text-muted-foreground hover:bg-muted disabled:text-muted-foreground"
                              >
                                Nada
                              </Button>
                            </div>
                          </div>
                          <ScrollArea className="h-80">
                            {!activeProjectId ? (
                              <div className="px-4 py-6 text-center text-sm text-muted-foreground">Selecciona un proyecto</div>
                            ) : (
                              <div className="divide-y">
                                {accessProducts
                                  .filter((p) => p.project_id === activeProjectId)
                                  .filter((p) => p.name.toLowerCase().includes(accessSearch.toLowerCase()))
                                  .filter((p) => (accessOnlySelected ? selectedProductIds.has(p.id) : true))
                                  .map((product) => {
                                    const checked = selectedProductIds.has(product.id);

                                    return (
                                      <div
                                        key={product.id}
                                        className="flex items-center gap-3 border-l-2 border-l-transparent px-3 py-2.5 transition-colors hover:bg-muted/40"
                                      >
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={() => toggleProduct(product.id)}
                                          className="border-minddash-celeste-600 data-[state=checked]:bg-minddash-celeste-600 data-[state=checked]:text-white data-[state=checked]:border-minddash-celeste-600"
                                        />
                                        <div className="min-w-0 flex-1">
                                          <span className="block truncate text-sm">{product.name}</span>
                                        </div>
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted/60">
                                          {checked ? <span className="h-2 w-2 rounded-full bg-minddash-verde-500" /> : <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />}
                                        </div>
                                      </div>
                                    );
                                  })}

                                {accessProducts.length === 0 && (
                                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">Sin chatbots</div>
                                )}
                              </div>
                            )}
                          </ScrollArea>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t bg-muted/20 px-6 py-4">
                  <Button type="button" variant="outline" onClick={closeAccessModal} disabled={accessSaving}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={saveUserAccess}
                    disabled={accessSaving}
                    className="bg-minddash-celeste-600 text-white hover:bg-minddash-celeste-700"
                  >
                    Guardar
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Create/Edit Modal */}
      <ModalPortal>
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-lg rounded-xl border border-white/10 bg-[#121212]/95 backdrop-blur-md text-white shadow-2xl"
              >
                <div className="border-b border-white/10 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">
                    {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    {editingUser ? 'Modifica los datos del usuario' : 'Completa los datos para crear un nuevo usuario'}
                  </p>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">
                        Username *
                      </Label>
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="usuario123"
                        className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">
                        Email *
                      </Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="usuario@empresa.com"
                        className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">
                        {editingUser ? 'Nueva Contraseña' : 'Contraseña *'}
                      </Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder={editingUser ? 'Dejar vacío para mantener' : '••••••••'}
                          className="pr-10 bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">
                        Confirmar Contraseña
                      </Label>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">
                        Rol
                      </Label>
                      <Select value={formData.iam_role} onValueChange={(value) => setFormData({ ...formData, iam_role: value })}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-purple-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                          <SelectItem value="SUPERADMIN">Super Administrador</SelectItem>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                          <SelectItem value="EDITOR">Editor</SelectItem>
                          <SelectItem value="USER">Usuario</SelectItem>
                          <SelectItem value="VIEWER">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">
                        Cliente
                      </Label>
                      <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-purple-500">
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                          <SelectItem value={UNASSIGNED_CLIENT_VALUE}>Sin asignar</SelectItem>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editingUser && (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">
                            Estado del usuario
                          </p>
                          <p className="text-sm text-gray-400">
                            Activa o desactiva el acceso al sistema
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={cn('text-xs', getStatusBadgeClass(formData.is_active))}>
                            {formData.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                          <Switch
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateUser}
                    className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                  >
                    {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Delete Confirmation Modal */}
      <ModalPortal>
        <AnimatePresence>
          {showDeleteModal && userToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-xl border border-white/10 bg-[#121212]/95 backdrop-blur-md text-white shadow-2xl"
              >
                <div className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                    <Trash2 className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    Eliminar Usuario
                  </h3>
                  <p className="mb-6 text-sm text-gray-400">
                    ¿Estás seguro de que deseas eliminar al usuario <strong>"{userToDelete.username}"</strong>?
                    Esta acción no se puede deshacer.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteModal(false);
                        setUserToDelete(null);
                      }}
                      className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleDeleteUser}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                      Eliminar Usuario
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>
      </div>
    </TooltipProvider>
  );
}
