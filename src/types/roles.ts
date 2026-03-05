// Tipos base para el sistema de roles
export type RoleType = 'admin' | 'editor' | 'viewer' | 'custom';

export type Permission = 
  | 'read'
  | 'write'
  | 'delete'
  | 'manage_users'
  | 'manage_roles'
  | 'manage_settings'
  | 'view_analytics'
  | 'export_data'
  | 'import_data';

// Interfaz base para un rol
export interface Role {
  id: string;
  name: string;
  description?: string;
  type: RoleType;
  permissions: Permission[];
  isActive: boolean;
  productId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Datos para crear un nuevo rol
export interface CreateRoleData {
  name: string;
  description?: string;
  type: RoleType;
  permissions: Permission[];
  isActive?: boolean;
}

// Datos para actualizar un rol existente
export interface UpdateRoleData {
  name?: string;
  description?: string;
  type?: RoleType;
  permissions?: Permission[];
  isActive?: boolean;
}

// Respuesta de la API para listar roles
export interface RolesResponse {
  roles: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Parámetros para filtrar roles
export interface RoleFilters {
  productId: string;
  page?: number;
  limit?: number;
  search?: string;
  type?: RoleType;
  isActive?: boolean;
}

// Asignación de rol a usuario
export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  productId: string;
  assignedAt: string;
  assignedBy: string;
  isActive: boolean;
}

// Datos para asignar rol a usuario
export interface AssignRoleData {
  userId: string;
  roleId: string;
  productId: string;
}

// Estadísticas de roles
export interface RoleStats {
  totalRoles: number;
  activeRoles: number;
  inactiveRoles: number;
  rolesByType: Record<RoleType, number>;
  totalAssignments: number;
  activeAssignments: number;
}

// Configuración de roles del producto
export interface ProductRoleConfig {
  id: string;
  productId: string;
  allowCustomRoles: boolean;
  maxRolesPerUser: number;
  defaultRole?: string;
  requiredPermissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

// Datos para actualizar configuración
export interface UpdateRoleConfigData {
  allowCustomRoles?: boolean;
  maxRolesPerUser?: number;
  defaultRole?: string;
  requiredPermissions?: Permission[];
}

// Respuesta estándar de la API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Error de la API
export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

// Opciones para hooks
export interface UseRoleOptions {
  productId: string;
  roleId: string;
}

export type UseProductRolesOptions = RoleFilters;

export interface UseUserRolesOptions {
  productId: string;
  userId: string;
}

// Permisos predefinidos por tipo de rol
export const ROLE_PERMISSIONS: Record<RoleType, Permission[]> = {
  admin: [
    'read',
    'write',
    'delete',
    'manage_users',
    'manage_roles',
    'manage_settings',
    'view_analytics',
    'export_data',
    'import_data'
  ],
  editor: [
    'read',
    'write',
    'view_analytics',
    'export_data'
  ],
  viewer: [
    'read'
  ],
  custom: [] // Los permisos se definen manualmente
};

// Etiquetas para mostrar en la UI
export const ROLE_TYPE_LABELS: Record<RoleType, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
  custom: 'Personalizado'
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  read: 'Lectura',
  write: 'Escritura',
  delete: 'Eliminación',
  manage_users: 'Gestionar Usuarios',
  manage_roles: 'Gestionar Roles',
  manage_settings: 'Gestionar Configuración',
  view_analytics: 'Ver Analíticas',
  export_data: 'Exportar Datos',
  import_data: 'Importar Datos'
};