// Exportaciones principales del sistema de servicios de roles

// Servicio principal
export { RolesService, rolesService } from './RolesService';

// Configuración de React Query
export {
  createRolesQueryClient,
  rolesQueryKeys,
  rolesQueryUtils,
  rolesQueryErrorHandler,
  useRolesQueryClient,
  defaultRolesQueryOptions,
  defaultRolesMutationOptions,
} from './queryClient';

// Tipos y utilidades
export type {
  Role,
  RolePermission,
  CreateRoleData,
  UpdateRoleData,
  RoleFilters,
  PaginatedResponse,
  RoleFormData,
} from './types';

export {
  ROLE_TYPE_OPTIONS,
  PERMISSION_OPTIONS,
  roleValidationUtils,
} from './types';