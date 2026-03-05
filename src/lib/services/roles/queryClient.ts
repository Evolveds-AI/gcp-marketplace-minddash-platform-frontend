import { QueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { Role, RoleFilters, PaginatedResponse, CreateRoleData, UpdateRoleData } from './types';

// Claves de consulta para React Query
export const rolesQueryKeys = {
  all: ['roles'] as const,
  products: () => [...rolesQueryKeys.all, 'products'] as const,
  product: (productId: string) => [...rolesQueryKeys.products(), productId] as const,
  productRoles: (productId: string, filters?: RoleFilters) => 
    [...rolesQueryKeys.product(productId), 'roles', filters] as const,
  role: (productId: string, roleId: string) => 
    [...rolesQueryKeys.product(productId), 'role', roleId] as const,
  stats: (productId: string) => 
    [...rolesQueryKeys.product(productId), 'stats'] as const,
  config: () => [...rolesQueryKeys.all, 'config'] as const,
  validation: (productId: string, name: string, excludeRoleId?: string) => 
    [...rolesQueryKeys.product(productId), 'validation', name, excludeRoleId] as const,
  userRoles: (productId: string, userId: string) => 
    [...rolesQueryKeys.product(productId), 'user-roles', userId] as const,
};

// Utilidades para React Query
export const rolesQueryUtils = {
  // Invalidar todas las consultas de roles
  invalidateAll: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({ queryKey: rolesQueryKeys.all });
  },

  // Invalidar consultas de un producto específico
  invalidateProduct: (queryClient: QueryClient, productId: string) => {
    return queryClient.invalidateQueries({ queryKey: rolesQueryKeys.product(productId) });
  },

  // Invalidar lista de roles de un producto
  invalidateProductRoles: (queryClient: QueryClient, productId: string) => {
    return queryClient.invalidateQueries({ 
      queryKey: rolesQueryKeys.product(productId),
      predicate: (query) => query.queryKey.includes('roles')
    });
  },

  // Invalidar un rol específico
  invalidateRole: (queryClient: QueryClient, productId: string, roleId: string) => {
    return queryClient.invalidateQueries({ queryKey: rolesQueryKeys.role(productId, roleId) });
  },

  // Invalidar estadísticas
  invalidateStats: (queryClient: QueryClient, productId: string) => {
    return queryClient.invalidateQueries({ queryKey: rolesQueryKeys.stats(productId) });
  },

  // Actualizar caché de un rol específico
  setRoleData: (queryClient: QueryClient, productId: string, roleId: string, data: Role) => {
    queryClient.setQueryData(rolesQueryKeys.role(productId, roleId), data);
  },

  // Obtener datos de un rol desde la caché
  getRoleData: (queryClient: QueryClient, productId: string, roleId: string): Role | undefined => {
    return queryClient.getQueryData(rolesQueryKeys.role(productId, roleId));
  },

  // Actualizar rol en la lista de roles
  updateRoleInList: (
    queryClient: QueryClient, 
    productId: string, 
    roleId: string, 
    updater: (role: Role) => Role
  ) => {
    queryClient.setQueriesData(
      { queryKey: rolesQueryKeys.product(productId), predicate: (query) => query.queryKey.includes('roles') },
      (oldData: PaginatedResponse<Role> | undefined) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          data: oldData.data.map(role => 
            role.id === roleId ? updater(role) : role
          )
        };
      }
    );
  },

  // Remover rol de la lista
  removeRoleFromList: (queryClient: QueryClient, productId: string, roleId: string) => {
    queryClient.setQueriesData(
      { queryKey: rolesQueryKeys.product(productId), predicate: (query) => query.queryKey.includes('roles') },
      (oldData: PaginatedResponse<Role> | undefined) => {
        if (!oldData) return oldData;
        
        return {
          data: oldData.data.filter(role => role.id !== roleId),
          total: oldData.total - 1,
          page: oldData.page,
          limit: oldData.limit,
          totalPages: Math.ceil((oldData.total - 1) / oldData.limit)
        };
      }
    );
  },

  // Agregar nuevo rol a la lista
  addRoleToList: (queryClient: QueryClient, productId: string, newRole: Role) => {
    queryClient.setQueriesData(
      { queryKey: rolesQueryKeys.product(productId), predicate: (query) => query.queryKey.includes('roles') },
      (oldData: PaginatedResponse<Role> | undefined) => {
        if (!oldData) return oldData;
        
        return {
          data: [newRole, ...oldData.data],
          total: oldData.total + 1,
          page: oldData.page,
          limit: oldData.limit,
          totalPages: Math.ceil((oldData.total + 1) / oldData.limit)
        };
      }
    );
  }
};

// Manejo de errores para React Query
export const rolesQueryErrorHandler = {
  // Manejo de errores por defecto
  defaultErrorHandler: (error: Error) => {
    console.error('Error en consulta de roles:', error);
    
    // Aquí puedes agregar lógica adicional como:
    // - Mostrar notificaciones de error
    // - Logging a servicios externos
    // - Redirección en caso de errores de autenticación
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      // Manejar errores de autenticación
      console.error('Error de autenticación en roles');
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      // Manejar errores de autorización
      console.error('Error de autorización en roles');
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      // Manejar errores de recurso no encontrado
      console.error('Rol no encontrado');
    } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
      // Manejar errores del servidor
      console.error('Error interno del servidor');
    }
  },

  // Retry logic personalizada
  shouldRetry: (failureCount: number, error: Error): boolean => {
    // No reintentar en errores de cliente (4xx)
    if (error.message.includes('4')) {
      return false;
    }
    
    // Reintentar hasta 3 veces en errores de servidor (5xx)
    return failureCount < 3;
  },

  // Delay entre reintentos
  retryDelay: (attemptIndex: number): number => {
    return Math.min(1000 * 2 ** attemptIndex, 30000);
  }
};

// Configuración por defecto para consultas de roles
export const defaultRolesQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutos
  gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
  retry: rolesQueryErrorHandler.shouldRetry,
  retryDelay: rolesQueryErrorHandler.retryDelay,
  refetchOnWindowFocus: false,
  refetchOnMount: true,
};

// Configuración por defecto para mutaciones de roles
export const defaultRolesMutationOptions = {
  retry: false,
  onError: rolesQueryErrorHandler.defaultErrorHandler,
};

// Crear cliente de React Query específico para roles
export const createRolesQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: defaultRolesQueryOptions,
      mutations: defaultRolesMutationOptions,
    },
  });
};

// Hook para usar el cliente de React Query con configuración de roles
export const useRolesQueryClient = () => {
  // En una aplicación real, esto podría venir de un contexto
  // Por ahora, usamos el cliente global
  return createRolesQueryClient();
};