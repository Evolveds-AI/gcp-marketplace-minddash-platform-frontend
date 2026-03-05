// Exportaciones principales de los hooks de roles

// Hooks para gestión de roles de producto
export {
  useProductRoles,
  useProductRole,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useToggleRoleStatus,
  useValidateRole,
  useRoleStats,
  useProductRolesManager,
} from './useProductRoles';

// Hooks para gestión de roles de usuario
export {
  useUserRoles,
  useAssignRole,
  useUnassignRole,
  useUserHasRole,
  useUserPermissions,
  useUserRoleIds,
  useProductUsers,
  useUsersWithRole,
  useRoleAssignmentStats,
  useBulkUpdateUserRoles,
  useUserRolesManager
} from './useUserRoles';

// Re-exportar tipos para conveniencia
export type {
  ProductRole,
  UserProductRole,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignRoleRequest,
  RoleFilters,
  PaginationOptions,
  RoleValidation,
  RoleStats,
  RoleType,
  RoleSource,
} from '../../types/roles/index';