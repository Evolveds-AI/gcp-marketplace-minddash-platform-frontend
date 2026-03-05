// Hook para gestionar roles de producto con React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  rolesService, 
  rolesQueryKeys, 
  rolesQueryUtils,
  rolesQueryErrorHandler 
} from '@/lib/services/roles';
import type {
  ProductRole,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleFilters,
  PaginationOptions,
  RoleStats,
  PaginatedResponse
} from '../../types/roles/index';

/**
 * Hook para obtener la lista de roles de un producto
 */
export const useProductRoles = (
  productId: string,
  filters?: RoleFilters,
  pagination?: PaginationOptions,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  return useQuery({
    queryKey: rolesQueryKeys.productRoles(productId, filters),
    queryFn: () => rolesService.getProductRoles(productId, { ...filters, ...pagination }),
    enabled: !!productId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval,
    select: (data: PaginatedResponse<ProductRole>) => ({
      roles: data.data,
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: Math.ceil(data.total / data.limit),
    }),
    meta: {
      errorMessage: 'Error al cargar los roles del producto',
    },
  });
};

/**
 * Hook para obtener un rol específico por ID
 */
export const useProductRole = (
  productId: string,
  roleId: string,
  options?: {
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: rolesQueryKeys.role(productId, roleId),
    queryFn: () => rolesService.getRoleById(productId, roleId),
    enabled: !!productId && !!roleId && (options?.enabled !== false),
    meta: {
      errorMessage: 'Error al cargar el rol',
    },
  });
};

/**
 * Hook para crear un nuevo rol
 */
export const useCreateRole = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleData: CreateRoleRequest) => 
      rolesService.createRole(productId, roleData),
    onSuccess: (newRole) => {
      // Invalidar las listas de roles para incluir el nuevo rol
      rolesQueryUtils.invalidateProductRoles(queryClient, productId);
      
      // Invalidar estadísticas
      rolesQueryUtils.invalidateStats(queryClient, productId);
    },
    onError: (error) => {
      rolesQueryErrorHandler.defaultErrorHandler(error);
    },
    meta: {
      successMessage: 'Rol creado exitosamente',
      errorMessage: 'Error al crear el rol',
    },
  });
};

/**
 * Hook para actualizar un rol existente
 */
export const useUpdateRole = (productId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roleId, roleData }: { roleId: string; roleData: UpdateRoleRequest }) => 
      rolesService.updateRole(productId, roleId, roleData),
    onSuccess: (updatedRole) => {
      // Invalidar las listas de roles para refrescar
      rolesQueryUtils.invalidateProductRoles(queryClient, productId);
      
      // Invalidar el rol específico
      rolesQueryUtils.invalidateRole(queryClient, productId, updatedRole.id);
      
      // Invalidar estadísticas si es necesario
      rolesQueryUtils.invalidateStats(queryClient, productId);
    },
    onError: (error) => {
      rolesQueryErrorHandler.defaultErrorHandler(error);
    },
    meta: {
      successMessage: 'Rol actualizado exitosamente',
      errorMessage: 'Error al actualizar el rol',
    },
  });
};

/**
 * Hook para eliminar un rol
 */
export const useDeleteRole = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: string) => 
      rolesService.deleteRole(productId, roleId),
    onSuccess: (_, roleId) => {
      // Invalidar las listas de roles para reflejar la eliminación
      rolesQueryUtils.invalidateProductRoles(queryClient, productId);
      
      // Invalidar el rol específico
      rolesQueryUtils.invalidateRole(queryClient, productId, roleId);
      
      // Invalidar estadísticas
      rolesQueryUtils.invalidateStats(queryClient, productId);
    },
    onError: (error) => {
      rolesQueryErrorHandler.defaultErrorHandler(error);
    },
    meta: {
      successMessage: 'Rol eliminado exitosamente',
      errorMessage: 'Error al eliminar el rol',
    },
  });
};

/**
 * Hook para activar/desactivar un rol
 */
export const useToggleRoleStatus = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, active }: { roleId: string; active: boolean }) => 
      rolesService.toggleRoleStatus(productId, roleId, active),
    onSuccess: (updatedRole) => {
      // Invalidar las listas de roles para refrescar
      rolesQueryUtils.invalidateProductRoles(queryClient, productId);
      
      // Invalidar el rol específico
      rolesQueryUtils.invalidateRole(queryClient, productId, updatedRole.id);
      
      // Invalidar estadísticas
      rolesQueryUtils.invalidateStats(queryClient, productId);
    },
    onError: (error) => {
      rolesQueryErrorHandler.defaultErrorHandler(error);
    },
    meta: {
      successMessage: 'Estado del rol actualizado exitosamente',
      errorMessage: 'Error al cambiar el estado del rol',
    },
  });
};

/**
 * Hook para validar la configuración de un rol
 */
export const useValidateRole = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, excludeRoleId }: { name: string; excludeRoleId?: string }) => 
      rolesService.validateRoleName(productId, name, excludeRoleId),
    onError: (error) => {
      rolesQueryErrorHandler.defaultErrorHandler(error);
    },
    meta: {
      errorMessage: 'Error al validar el rol',
    },
  });
};

/**
 * Hook para obtener estadísticas de roles
 */
export const useRoleStats = (
  productId: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  return useQuery({
    queryKey: rolesQueryKeys.stats(productId),
    queryFn: () => rolesService.getRoleStats(productId),
    enabled: !!productId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval,
    staleTime: 10 * 60 * 1000, // 10 minutos
    meta: {
      errorMessage: 'Error al cargar las estadísticas de roles',
    },
  });
};

// Hook useExportRoles eliminado - funcionalidad no implementada en RolesService

// Hook useRoleAuditHistory eliminado - funcionalidad no implementada en RolesService

/**
 * Hook compuesto que proporciona todas las funcionalidades de roles para un producto
 */
export const useProductRolesManager = (productId: string) => {
  const queryClient = useQueryClient();

  return {
    // Queries
    useRoles: (filters?: RoleFilters, pagination?: PaginationOptions) => 
      useProductRoles(productId, filters, pagination),
    useRole: (roleId: string) => useProductRole(productId, roleId),
    useStats: () => useRoleStats(productId),
    // useAuditHistory eliminado - funcionalidad no implementada

    // Mutations
    createRole: useCreateRole(productId),
    updateRole: useUpdateRole(productId),
    deleteRole: useDeleteRole(productId),
    toggleStatus: useToggleRoleStatus(productId),
    validateRole: useValidateRole(productId),
    // exportRoles eliminado - funcionalidad no implementada

    // Utilities
    invalidateRoles: () => rolesQueryUtils.invalidateProductRoles(queryClient, productId),
    invalidateStats: () => rolesQueryUtils.invalidateStats(queryClient, productId),
  };
};