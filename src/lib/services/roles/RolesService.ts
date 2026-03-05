import { CreateRoleData, UpdateRoleData, RoleFilters, PaginatedResponse } from './types';
import { ProductRole, RoleType } from '@/types/roles/index';

class RolesService {
  private baseUrl = '/api';

  // Obtener roles de un producto con paginación y filtros
  async getProductRoles(
    productId: string,
    filters?: RoleFilters
  ): Promise<PaginatedResponse<ProductRole>> {
    const params = new URLSearchParams();
    
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = `${this.baseUrl}/products/${productId}/roles${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching roles: ${response.statusText}`);
    }

    const response_data = await response.json();
    return {
      data: response_data.data || [],
      total: response_data.total || 0,
      page: response_data.page || 1,
      limit: response_data.limit || 10,
      totalPages: response_data.totalPages || 0
    };
  }

  // Obtener un rol específico por ID
  async getRoleById(productId: string, roleId: string): Promise<ProductRole> {
    const response = await fetch(`${this.baseUrl}/products/${productId}/roles/${roleId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching role: ${response.statusText}`);
    }

    return response.json();
  }

  // Crear un nuevo rol
  async createRole(productId: string, data: CreateRoleData): Promise<ProductRole> {
    const response = await fetch(`${this.baseUrl}/products/${productId}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error creating role: ${response.statusText}`);
    }

    return response.json();
  }

  // Actualizar un rol existente
  async updateRole(productId: string, roleId: string, data: UpdateRoleData): Promise<ProductRole> {
    const response = await fetch(`${this.baseUrl}/products/${productId}/roles/${roleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error updating role: ${response.statusText}`);
    }

    return response.json();
  }

  // Eliminar un rol
  async deleteRole(productId: string, roleId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/products/${productId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error deleting role: ${response.statusText}`);
    }
  }

  // Activar/desactivar un rol
  async toggleRoleStatus(productId: string, roleId: string, isActive: boolean): Promise<ProductRole> {
    const response = await fetch(`${this.baseUrl}/products/${productId}/roles/${roleId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive }),
    });

    if (!response.ok) {
      throw new Error(`Error toggling role status: ${response.statusText}`);
    }

    return response.json();
  }

  // Validar nombre de rol único
  async validateRoleName(productId: string, name: string, excludeRoleId?: string): Promise<boolean> {
    const params = new URLSearchParams({ name });
    if (excludeRoleId) {
      params.append('excludeRoleId', excludeRoleId);
    }

    const response = await fetch(
      `${this.baseUrl}/products/${productId}/roles/validate?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error validating role name: ${response.statusText}`);
    }

    const result = await response.json();
    return result.isValid;
  }

  // Obtener estadísticas de roles
  async getRoleStats(productId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<RoleType, number>;
  }> {
    const response = await fetch(`${this.baseUrl}/products/${productId}/roles/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching role stats: ${response.statusText}`);
    }

    return response.json();
  }

  // Obtener configuración de roles (tipos y permisos disponibles)
  async getRoleConfig(): Promise<{
    types: { value: RoleType; label: string }[];
    permissions: { value: string; label: string; description: string }[];
  }> {
    const response = await fetch(`${this.baseUrl}/roles/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching role config: ${response.statusText}`);
    }

    return response.json();
  }

  // ===== MÉTODOS DE GESTIÓN DE USUARIOS Y ROLES =====

  // Obtener roles asignados a un usuario específico
  async getUserRoles(productId: string, userId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/products/${productId}/users/${userId}/roles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching user roles: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  }

  // Asignar un rol a un usuario
  async assignRole(productId: string, data: { userId: string; roleId: string; productId: string }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/products/${productId}/users/${data.userId}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_role_id: data.roleId }),
    });

    if (!response.ok) {
      throw new Error(`Error assigning role: ${response.statusText}`);
    }

    return response.json();
  }

  // Desasignar un rol de un usuario
  async unassignRole(productId: string, userId: string, roleId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/products/${productId}/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error unassigning role: ${response.statusText}`);
    }
  }

  // Obtener usuarios de un producto con sus roles
  async getProductUsers(productId: string, filters?: {
    page?: number;
    limit?: number;
    search?: string;
    roleId?: string;
  }): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.roleId) params.append('roleId', filters.roleId);

    const queryString = params.toString();
    const url = `${this.baseUrl}/products/${productId}/users${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching product users: ${response.statusText}`);
    }

    const response_data = await response.json();
    return {
      data: response_data.data || [],
      total: response_data.total || 0,
      page: response_data.page || 1,
      limit: response_data.limit || 10,
      totalPages: response_data.totalPages || 0
    };
  }

  // Actualizar múltiples asignaciones de roles de un usuario
  async bulkUpdateUserRoles(productId: string, userId: string, data: {
    rolesToAssign: string[];
    rolesToUnassign: string[];
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/products/${productId}/users/${userId}/roles/bulk`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error bulk updating user roles: ${response.statusText}`);
    }

    return response.json();
  }
}

// Instancia singleton del servicio
export const rolesService = new RolesService();
export { RolesService };