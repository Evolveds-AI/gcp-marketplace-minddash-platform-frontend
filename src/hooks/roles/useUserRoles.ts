// Hook para gestionar roles de usuarios con React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  rolesService, 
  rolesQueryKeys, 
  rolesQueryUtils,
  rolesQueryErrorHandler 
} from '@/lib/services/roles';
import { Role, UserRoleAssignment, AssignRoleData } from '@/types/roles';

/**
 * Hook para obtener los roles asignados a un usuario específico
 * en un producto determinado
 */
export const useUserRoles = (
  productId: string,
  userId: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  return useQuery({
    queryKey: rolesQueryKeys.userRoles(productId, userId),
    queryFn: () => rolesService.getUserRoles(productId, userId),
    enabled: options?.enabled !== false && !!productId && !!userId,
    refetchInterval: options?.refetchInterval,
    select: (data: UserRoleAssignment[]) => ({
      roles: data,
      totalRoles: data.length,
      activeRoles: data.filter(ur => ur.isActive).length
    })
  });
};

/**
 * Hook para asignar un rol a un usuario
 */
export const useAssignRole = (productId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: AssignRoleData) => 
      rolesService.assignRole(productId, data),
    onSuccess: (_, variables) => {
      // Invalidar consultas relacionadas
      queryClient.invalidateQueries({
        queryKey: rolesQueryKeys.userRoles(productId, variables.userId)
      });
      queryClient.invalidateQueries({
        queryKey: rolesQueryKeys.stats(productId)
      });
    },
    onError: rolesQueryErrorHandler.defaultErrorHandler
  });
};

/**
 * Hook para desasignar un rol de un usuario
 */
export const useUnassignRole = (productId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => 
      rolesService.unassignRole(productId, userId, roleId),
    onSuccess: (_, variables) => {
      // Invalidar consultas relacionadas
      queryClient.invalidateQueries({
        queryKey: rolesQueryKeys.userRoles(productId, variables.userId)
      });
      queryClient.invalidateQueries({
        queryKey: rolesQueryKeys.stats(productId)
      });
    },
    onError: rolesQueryErrorHandler.defaultErrorHandler
  });
};

/**
 * Hook para actualizar múltiples asignaciones de roles de un usuario
 */
export const useBulkUpdateUserRoles = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      rolesToAssign, 
      rolesToUnassign 
    }: {
      userId: string;
      rolesToAssign: string[];
      rolesToUnassign: string[];
    }) => {
      return rolesService.bulkUpdateUserRoles(productId, userId, {
        rolesToAssign,
        rolesToUnassign
      });
    },
    onSuccess: (updatedRoles, { userId }) => {
      // Actualizar la caché con los nuevos roles
      queryClient.setQueryData(
        rolesQueryKeys.userRoles(productId, userId),
        updatedRoles
      );
      
      // Invalidar estadísticas
      queryClient.invalidateQueries({
        queryKey: rolesQueryKeys.stats(productId)
      });
    },
    onError: rolesQueryErrorHandler.defaultErrorHandler
  });
};

/**
 * Hook para verificar si un usuario tiene un rol específico
 */
export const useUserHasRole = (
  productId: string,
  userId: string,
  roleId: string
) => {
  const { data: userRolesData } = useUserRoles(productId, userId);
  
  return {
    hasRole: userRolesData?.roles.some(ur => ur.roleId === roleId) ?? false,
    isActive: (userRolesData?.activeRoles ?? 0) > 0,
    userRole: userRolesData?.roles.find(ur => ur.roleId === roleId),
  };
};

/**
 * Hook para obtener solo los IDs de roles de un usuario
 */
export const useUserRoleIds = (productId: string, userId: string) => {
  const { data: userRolesData, isLoading } = useUserRoles(productId, userId);
  
  const userRoleIds = userRolesData?.roles.map(ur => ur.roleId) ?? [];
  const activeRoleIds = userRolesData?.roles.filter(ur => ur.isActive).map(ur => ur.roleId) ?? [];
  
  return {
    roleIds: userRoleIds,
    activeRoleIds,
    isLoading,
  };
};

/**
 * Hook para obtener usuarios de un producto con sus roles
 */
export const useProductUsers = (
  productId: string,
  filters?: {
    page?: number;
    limit?: number;
    search?: string;
    roleId?: string;
  }
) => {
  return useQuery({
    queryKey: ['productUsers', productId, filters],
    queryFn: () => rolesService.getProductUsers(productId, filters),
    enabled: !!productId,
  });
};

/**
 * Hook para verificar múltiples permisos de un usuario
 */
export const useUserPermissions = (
  productId: string,
  userId: string,
  requiredRoles: string[]
) => {
  const { data: userRolesData, isLoading } = useUserRoles(productId, userId);
  
  const userRoleIds = userRolesData?.roles.map(ur => ur.roleId) ?? [];
  const activeRoleIds = userRolesData?.roles.filter(ur => ur.isActive).map(ur => ur.roleId) ?? [];
  
  return {
    isLoading,
    hasAllRoles: requiredRoles.every(roleId => userRoleIds.includes(roleId)),
    hasAnyRole: requiredRoles.some(roleId => userRoleIds.includes(roleId)),
    hasAllActiveRoles: requiredRoles.every(roleId => activeRoleIds.includes(roleId)),
    hasAnyActiveRole: requiredRoles.some(roleId => activeRoleIds.includes(roleId)),
    missingRoles: requiredRoles.filter(roleId => !userRoleIds.includes(roleId)),
    inactiveRoles: requiredRoles.filter(roleId => 
      userRoleIds.includes(roleId) && !activeRoleIds.includes(roleId)
    ),
  };
};

/**
 * Hook compuesto para gestión completa de roles de usuario
 */
export const useUserRolesManager = (productId: string, userId: string) => {
  const queryClient = useQueryClient();

  return {
    // Queries
    userRoles: useUserRoles(productId, userId),
    
    // Mutations
    assignRole: useAssignRole(productId),
    unassignRole: useUnassignRole(productId),
    bulkUpdateRoles: useBulkUpdateUserRoles(productId),
    
    // Utilities
    hasRole: (roleId: string) => useUserHasRole(productId, userId, roleId),
    checkPermissions: (requiredRoles: string[]) => 
      useUserPermissions(productId, userId, requiredRoles),
    
    // Cache management
    invalidateUserRoles: () => 
      queryClient.invalidateQueries({
        queryKey: rolesQueryKeys.userRoles(productId, userId)
      }),
    
    // Helper functions
    toggleRole: async (roleId: string) => {
      const { data: userRolesData } = useUserRoles(productId, userId);
      const hasRole = userRolesData?.roles.some(ur => ur.roleId === roleId) ?? false;
      
      if (hasRole) {
        return useUnassignRole(productId).mutateAsync({ userId, roleId });
      } else {
        return useAssignRole(productId).mutateAsync({ userId, roleId, productId });
      }
    },
  };
};

/**
 * Hook para obtener usuarios con un rol específico
 */
export const useUsersWithRole = (
  productId: string,
  roleId: string,
  options?: {
    enabled?: boolean;
  }
) => {
  // Este hook requeriría un endpoint adicional en el backend
  // Por ahora, se puede implementar como una query personalizada
  return useQuery({
    queryKey: [...rolesQueryKeys.productRoles(productId), roleId, 'users'],
    queryFn: async () => {
      // Implementar llamada al endpoint que retorne usuarios con el rol específico
      // Por ejemplo: GET /api/products/{productId}/roles/{roleId}/users
      const response = await fetch(`/api/products/${productId}/roles/${roleId}/users`);
      if (!response.ok) {
        throw new Error('Error fetching users with role');
      }
      return response.json();
    },
    enabled: !!productId && !!roleId && (options?.enabled !== false),
    meta: {
      errorMessage: 'Error al cargar usuarios con este rol',
    },
  });
};

/**
 * Hook para estadísticas de asignación de roles
 */
export const useRoleAssignmentStats = (
  productId: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  return useQuery({
    queryKey: [...rolesQueryKeys.stats(productId), 'assignments'],
    queryFn: async () => {
      // Implementar llamada al endpoint de estadísticas de asignación
      const response = await fetch(`/api/products/${productId}/roles/assignment-stats`);
      if (!response.ok) {
        throw new Error('Error fetching assignment stats');
      }
      return response.json();
    },
    enabled: !!productId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutos
    meta: {
      errorMessage: 'Error al cargar estadísticas de asignación',
    },
  });
};