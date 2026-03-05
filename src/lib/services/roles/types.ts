// Importar los tipos del enum principal
import { RoleType, RoleSource } from '@/types/roles/index';

export type RolePermission = 
  | 'read'
  | 'write'
  | 'delete'
  | 'manage_users'
  | 'manage_roles'
  | 'manage_settings'
  | 'view_analytics'
  | 'export_data'
  | 'import_data'
  | 'moderate_content';

// Interfaz principal del rol
export interface Role {
  id: string;
  name: string;
  description?: string;
  type: RoleType;
  permissions: RolePermission[];
  isActive: boolean;
  productId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  usersCount?: number;
}

// Datos para crear un nuevo rol
export interface CreateRoleData {
  name: string;
  type: RoleType;
  source?: RoleSource;
  table?: string;
  field?: string;
  uses_user_code: boolean;
  user_code_table?: string;
  user_code_key?: string;
  user_code_value_col?: string;
  static_value?: string;
  active?: boolean;
}

// Datos para actualizar un rol existente
export interface UpdateRoleData {
  name?: string;
  type?: RoleType;
  source?: RoleSource;
  table?: string;
  field?: string;
  uses_user_code?: boolean;
  user_code_table?: string;
  user_code_key?: string;
  user_code_value_col?: string;
  static_value?: string;
  active?: boolean;
}

// Filtros para la búsqueda de roles
export interface RoleFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: RoleType;
  isActive?: boolean;
  sortBy?: 'name' | 'type' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

// Respuesta paginada - usando la misma estructura que los tipos principales
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Datos del formulario de rol
export interface RoleFormData {
  name: string;
  description: string;
  type: RoleType;
  permissions: RolePermission[];
  isActive: boolean;
}

// Opciones para tipos de rol
export const ROLE_TYPE_OPTIONS = [
  { value: RoleType.DYNAMIC, label: 'Dinámico' },
  { value: RoleType.STATIC, label: 'Estático' },
  { value: RoleType.ALL, label: 'Todos' },
  { value: RoleType.NONE, label: 'Ninguno' },
];

// Opciones para permisos
export const PERMISSION_OPTIONS = [
  {
    value: 'read' as RolePermission,
    label: 'Lectura',
    description: 'Permite ver contenido y datos'
  },
  {
    value: 'write' as RolePermission,
    label: 'Escritura',
    description: 'Permite crear y editar contenido'
  },
  {
    value: 'delete' as RolePermission,
    label: 'Eliminación',
    description: 'Permite eliminar contenido'
  },
  {
    value: 'manage_users' as RolePermission,
    label: 'Gestionar Usuarios',
    description: 'Permite administrar usuarios del sistema'
  },
  {
    value: 'manage_roles' as RolePermission,
    label: 'Gestionar Roles',
    description: 'Permite crear y modificar roles'
  },
  {
    value: 'manage_settings' as RolePermission,
    label: 'Gestionar Configuración',
    description: 'Permite modificar configuraciones del sistema'
  },
  {
    value: 'view_analytics' as RolePermission,
    label: 'Ver Analíticas',
    description: 'Permite acceder a reportes y estadísticas'
  },
  {
    value: 'export_data' as RolePermission,
    label: 'Exportar Datos',
    description: 'Permite exportar información del sistema'
  },
  {
    value: 'import_data' as RolePermission,
    label: 'Importar Datos',
    description: 'Permite importar información al sistema'
  },
  {
    value: 'moderate_content' as RolePermission,
    label: 'Moderar Contenido',
    description: 'Permite revisar y aprobar contenido'
  },
];

// Utilidades para validación
export const roleValidationUtils = {
  isValidRoleName: (name: string): boolean => {
    return name.length >= 2 && name.length <= 50 && /^[a-zA-Z0-9\s\-_]+$/.test(name);
  },
  
  isValidRoleType: (type: string): type is RoleType => {
    return Object.values(RoleType).includes(type as RoleType);
  },
  
  isValidPermission: (permission: string): permission is RolePermission => {
    return [
      'read', 'write', 'delete', 'manage_users', 'manage_roles',
      'manage_settings', 'view_analytics', 'export_data', 'import_data', 'moderate_content'
    ].includes(permission);
  },
  
  validateRoleData: (data: CreateRoleData | UpdateRoleData): string[] => {
    const errors: string[] = [];
    
    if ('name' in data && data.name !== undefined) {
      if (!roleValidationUtils.isValidRoleName(data.name)) {
        errors.push('El nombre del rol debe tener entre 2 y 50 caracteres y solo contener letras, números, espacios, guiones y guiones bajos');
      }
    }
    
    if ('type' in data && data.type !== undefined) {
      if (!roleValidationUtils.isValidRoleType(data.type)) {
        errors.push('Tipo de rol inválido');
      }
    }
    
    if ('permissions' in data && data.permissions !== undefined && data.permissions !== null && Array.isArray(data.permissions)) {
      const invalidPermissions = data.permissions.filter(p => !roleValidationUtils.isValidPermission(p));
      if (invalidPermissions.length > 0) {
        errors.push(`Permisos inválidos: ${invalidPermissions.join(', ')}`);
      }
    }
    
    return errors;
  }
};