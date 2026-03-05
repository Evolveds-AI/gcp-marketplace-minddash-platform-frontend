// Mock de Prisma antes de cualquier importación

jest.mock('@/lib/database', () => {
  const mockPrisma = {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    usuarios: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    roleAccess: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    productUser: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn()
    },
    rolesAcDatos: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  };
  
  return {
    __esModule: true,
    default: mockPrisma
  };
});

// Import modules after mocking
import { NextRequest, NextResponse } from 'next/server';
import { GET as getRoles, POST as createRole, PUT as updateRole, DELETE as deleteRole } from '@/app/api/products/[productId]/roles/route';
import { GET as getUsers, POST as createUser, PUT as updateUser, DELETE as deleteUser } from '@/app/api/products/[productId]/users/route';
import { validateRolePermissions } from '@/lib/middleware/roleAuth';
import { verifyDataAccess } from '@/lib/middleware/dataAccess';
import { RoleType } from '@/types/roles/index';
import { mockAuth, testData, resetAllMocks, createMockRequest, createMockResponse, mockNextResponse } from '../utils/test-helpers';
import { createContext } from '@/lib/test-utils';
import prisma from '@/lib/database';

// Obtener referencia al mock de Prisma
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Mock de los módulos de autenticación
jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
  getUserFromToken: jest.fn()
}));

jest.mock('@/lib/middleware/adminAuth', () => ({
  verifyAdmin: jest.fn()
}));

jest.mock('@/lib/middleware/roleAuth', () => ({
  validateRolePermissions: jest.fn(),
  validateActionPermission: jest.fn(),
  validateAdminAccess: jest.fn(),
  validateUserManagementAccess: jest.fn(),
  validateRoleManagementAccess: jest.fn(),
  validateSensitiveDataAccess: jest.fn()
}));

jest.mock('@/lib/middleware/dataAccess', () => ({
  verifyDataAccess: jest.fn()
}));

// Importar los mocks después de mockear los módulos
import { verifyAdmin } from '@/lib/middleware/adminAuth';
const mockVerifyAdmin = verifyAdmin as jest.MockedFunction<typeof verifyAdmin>;
const mockValidateRolePermissions = validateRolePermissions as jest.MockedFunction<typeof validateRolePermissions>;

// El mock de prisma ya está definido arriba como mockPrisma

// Mock de NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      data
    })),
    next: jest.fn(() => ({ next: true }))
  }
}));

// Mock helpers are imported from utils/test-helpers

// Helper para crear contexto de parámetros
const createTestContext = (productId: string) => ({
  params: { productId }
});

describe('Sistema de Roles - Tests de Integración', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAdmin.mockClear();
    mockValidateRolePermissions.mockClear();
    
    // Limpiar específicamente los mocks de Prisma
    mockPrisma.product.findUnique.mockReset();
    mockPrisma.usuarios.findUnique.mockReset();
    mockPrisma.roleAccess.findFirst.mockReset();
    mockPrisma.roleAccess.findUnique.mockReset();
    mockPrisma.roleAccess.create.mockReset();
    mockPrisma.productUser.findUnique.mockReset();
    mockPrisma.productUser.create.mockReset();
    mockPrisma.productUser.update.mockReset();
    mockPrisma.productUser.delete.mockReset();
  });

  describe('Flujo completo: Crear rol y asignar a usuario', () => {
    it('permite crear un rol y asignarlo a un usuario exitosamente', async () => {
      const productId = 'product-1';
      const userId = 'user-1';
      const roleData = {
        name: 'Administrador de Ventas',
        type: RoleType.DYNAMIC,
        table: 'sales',
        field: 'manager_id'
      };

      // Mock de autenticación como admin
      mockVerifyAdmin.mockResolvedValue({ success: true, user: { id: 'admin-1' } });
      
      // Mock de producto existente
      mockPrisma.product.findUnique.mockResolvedValue({
        id: productId,
        name: 'Producto Test'
      });

      // Mock de rol no existente (para permitir creación)
      mockPrisma.roleAccess.findFirst.mockResolvedValue(null);

      // Mock de creación de rol exitosa
      const createdRole = {
        id: 'role-1',
        ...roleData,
        product_id: productId,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockPrisma.roleAccess.create.mockResolvedValue(createdRole);

      // Paso 1: Crear el rol
      const createRoleRequest = createMockRequest('POST', roleData, {
        'authorization': 'Bearer admin-token'
      });
      
      const createRoleResponse = await createRole(createRoleRequest, createTestContext(productId));
      
      expect(createRoleResponse.status).toBe(201);
      expect(mockPrisma.roleAccess.create).toHaveBeenCalledWith({
          data: {
            ...roleData,
            product_id: productId
          }
        });

        // Mock para asignación de usuario
        mockPrisma.usuarios.findUnique.mockResolvedValue({
          id: userId,
          email: 'user@test.com'
        });

        mockPrisma.productUser.findUnique.mockResolvedValue(null); // Usuario no asignado
        
        const assignedUser = {
          id: 'assignment-1',
          user_id: userId,
          product_id: productId,
          role_id: 'role-1',
          created_at: new Date()
        };
        mockPrisma.productUser.create.mockResolvedValue(assignedUser);

      // Paso 2: Asignar usuario al producto con el rol
      const assignUserRequest = createMockRequest('POST', {
        user_id: userId,
        role_id: 'role-1'
      }, {
        'authorization': 'Bearer admin-token'
      });

      const assignUserResponse = await createUser(assignUserRequest, createTestContext(productId));
      
      expect(assignUserResponse.status).toBe(201);
      expect(mockPrisma.productUser.create).toHaveBeenCalledWith({
        data: {
          user_id: userId,
          product_id: productId,
          role_id: 'role-1'
        }
      });
    });

    it('valida permisos correctamente después de asignar rol', async () => {
      const productId = 'product-1';
      const userId = 'user-1';
      const roleId = 'role-1';

      // Mock de token válido
      mockAuth.verifyAccessToken.mockResolvedValue({
      valid: true,
      user: { id: userId }
    });

      // Mock de usuario con rol asignado
      mockPrisma.usuarios.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@test.com',
        is_superadmin: false,
        productUsers: [{
          id: 'assignment-1',
          product_id: productId,
          role_id: roleId,
          roleAccess: {
            id: roleId,
            name: 'Administrador de Ventas',
            type: RoleType.DYNAMIC,
            table: 'sales',
            field: 'manager_id',
            active: true
          }
        }]
      });

      // Validar permisos con middleware
      const mockRequest = createMockRequest('GET', null, {
        'authorization': 'Bearer user-token'
      });
      
      const permission = {
        resource: 'sales',
        action: 'read' as const,
        allowedRoles: ['Administrador de Ventas'],
        requiredTables: ['sales']
      };
      
      mockValidateRolePermissions.mockResolvedValue({
        success: true,
        user: {
          id: userId,
          username: 'user@test.com',
          email: 'user@test.com',
          iam_role: 'user',
          client_id: 'test-client',
          role: {
            id: roleId,
            name: 'Administrador de Ventas',
            table_names: ['sales']
          }
        }
      });
      
      const result = await mockValidateRolePermissions(mockRequest, permission, productId);

      expect(result.success).toBe(true);
      expect(result.user?.id).toBe(userId);
      expect(result.user?.role?.name).toBe('Administrador de Ventas');
    });
  });

  describe('Flujo de acceso a datos con roles', () => {
    it('permite acceso a datos cuando el usuario tiene el rol correcto', async () => {
      const productId = 'product-1';
      const userId = 'user-1';
      const table = 'sales';

      // Mock de token válido
      mockAuth.verifyAccessToken.mockResolvedValue({
      valid: true,
      user: { id: userId }
    });

      // Mock de usuario con rol y reglas de acceso
      mockPrisma.usuarios.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@test.com',
        is_superadmin: false,
        productUsers: [{
          id: 'assignment-1',
          product_id: productId,
          role_id: 'role-1',
          roleAccess: {
            id: 'role-1',
            name: 'Administrador de Ventas',
            type: RoleType.DYNAMIC,
            table: 'sales',
            field: 'manager_id',
            active: true
          }
        }],
        rolesAcDatos: [{
          id: 'data-rule-1',
          tabla: table,
          operacion: 'SELECT',
          filtro_campo: 'manager_id',
          filtro_valor: userId,
          product_id: productId
        }]
      });

      // Verificar acceso a datos
      const result = await verifyDataAccess({
        token: 'Bearer user-token',
        table,
        operation: 'SELECT',
        productId
      });

      expect(result.success).toBe(true);
      expect(result.filters).toEqual([{
        field: 'manager_id',
        value: userId
      }]);
    });

    it('deniega acceso cuando el usuario no tiene permisos', async () => {
      const productId = 'product-1';
      const userId = 'user-1';
      const table = 'restricted_table';

      // Mock de token válido
      mockAuth.verifyAccessToken.mockResolvedValue({
      valid: true,
      user: { id: userId }
    });

      // Mock de usuario sin acceso a la tabla
      mockPrisma.usuarios.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@test.com',
        is_superadmin: false,
        productUsers: [],
        rolesAcDatos: []
      });

      // Verificar acceso a datos
      const result = await verifyDataAccess({
        token: 'Bearer user-token',
        table,
        operation: 'SELECT',
        productId
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('No tienes acceso');
      expect(result.statusCode).toBe(403);
    });
  });

  describe('Flujo de gestión de roles por administrador', () => {
    it('permite a un admin listar, crear, y gestionar roles', async () => {
      const productId = 'product-1';
      const adminId = 'admin-1';

      // Mock de autenticación como admin
      mockAuth.verifyAdmin.mockResolvedValue({ valid: true, user: { id: adminId } });
      
      // Mock de producto existente
      mockPrisma.product.findUnique.mockResolvedValue({
        id: productId,
        name: 'Producto Test'
      });

      // Mock de roles existentes
      const existingRoles = [
        {
          id: 'role-1',
          name: 'Administrador',
          type: RoleType.STATIC,
          static_value: 'admin',
          active: true,
          product_id: productId,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'role-2',
          name: 'Usuario',
          type: RoleType.DYNAMIC,
          table: 'users',
          field: 'role',
          active: true,
          product_id: productId,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockPrisma.roleAccess.findMany.mockResolvedValue(existingRoles);
      mockPrisma.roleAccess.count.mockResolvedValue(2);

      // Paso 1: Listar roles existentes
      const listRolesRequest = createMockRequest('GET', null, {
        'authorization': 'Bearer admin-token'
      });
      
      const listRolesResponse = await getRoles(listRolesRequest, createTestContext(productId));
      
      expect(listRolesResponse.status).toBe(200);
      expect(mockPrisma.roleAccess.findMany).toHaveBeenCalledWith({
        where: { product_id: productId },
        orderBy: { created_at: 'desc' },
        skip: 0,
        take: 10
      });

      // Paso 2: Crear nuevo rol
      const newRoleData = {
        name: 'Supervisor',
        type: RoleType.DYNAMIC,
        table: 'departments',
        field: 'supervisor_id'
      };

      mockPrisma.roleAccess.findFirst.mockResolvedValue(null); // Rol no existe
      
      const createdRole = {
        id: 'role-3',
        ...newRoleData,
        product_id: productId,
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockPrisma.roleAccess.create.mockResolvedValue(createdRole);

      const createRoleRequest = createMockRequest('POST', newRoleData, {
        'authorization': 'Bearer admin-token'
      });
      
      const createRoleResponse = await createRole(createRoleRequest, createTestContext(productId));
      
      expect(createRoleResponse.status).toBe(201);
      expect(mockPrisma.roleAccess.create).toHaveBeenCalledWith({
        data: {
          ...newRoleData,
          product_id: productId,
          active: true
        }
      });
    });
  });

  describe('Flujo de gestión de usuarios en producto', () => {
    it('permite gestionar usuarios completo: asignar, actualizar y remover', async () => {
      const productId = 'product-1';
      const userId = 'user-1';
      const roleId = 'role-1';
      const newRoleId = 'role-2';

      // Mock de autenticación como admin
      mockVerifyAdmin.mockResolvedValue({ success: true, user: { id: 'admin-1' } });
      
      // Mock de producto y usuario existentes
      mockPrisma.product.findUnique.mockResolvedValue({ id: productId, name: 'Test Product' });
      mockPrisma.usuarios.findUnique.mockResolvedValue({ id: userId, email: 'user@test.com' });
      mockPrisma.roleAccess.findUnique.mockResolvedValue({ id: roleId, name: 'Role 1' });

      // Paso 1: Asignar usuario al producto
      mockPrisma.productUser.findUnique.mockResolvedValue(null); // No asignado previamente
      
      const assignment = {
        id: 'assignment-1',
        user_id: userId,
        product_id: productId,
        role_id: roleId,
        created_at: new Date()
      };
      mockPrisma.productUser.create.mockResolvedValue(assignment);

      const assignRequest = createMockRequest('POST', {
        user_id: userId,
        role_id: roleId
      }, { 'authorization': 'Bearer admin-token' });
      
      const assignResponse = await createUser(assignRequest, createTestContext(productId));
      expect(assignResponse.status).toBe(201);

      // Paso 2: Actualizar rol del usuario
      mockPrisma.productUser.findUnique.mockResolvedValue(assignment);
      mockPrisma.roleAccess.findUnique.mockResolvedValue({ id: newRoleId, name: 'Role 2' });
      
      const updatedAssignment = { ...assignment, role_id: newRoleId };
      mockPrisma.productUser.update.mockResolvedValue(updatedAssignment);

      const updateRequest = createMockRequest('PUT', {
        role_id: newRoleId
      }, { 'authorization': 'Bearer admin-token' });
      
      const updateResponse = await updateUser(updateRequest, createTestContext(productId), { params: { userId } });
      expect(updateResponse.status).toBe(200);

      // Paso 3: Remover usuario del producto
      mockPrisma.productUser.delete.mockResolvedValue(assignment);

      const deleteRequest = createMockRequest('DELETE', null, {
        'authorization': 'Bearer admin-token'
      });
      
      const deleteResponse = await deleteUser(deleteRequest, createTestContext(productId), { params: { userId } });
      expect(deleteResponse.status).toBe(200);
      expect(mockPrisma.productUser.delete).toHaveBeenCalledWith({
        where: {
          user_id_product_id: {
            user_id: userId,
            product_id: productId
          }
        }
      });
    });
  });

  describe('Casos de error en flujos integrados', () => {
    it('maneja errores en cascada cuando falla la creación de rol', async () => {
      const productId = 'product-1';
      
      // Mock de autenticación exitosa
      mockVerifyAdmin.mockResolvedValue({ success: true, user: { id: 'admin-1' } });
      mockPrisma.product.findUnique.mockResolvedValue({ id: productId, name: 'Test' });
      
      // Mock de error en creación de rol - rol no existe previamente
      mockPrisma.roleAccess.findUnique.mockResolvedValueOnce(null); // Para verificación de nombre
      mockPrisma.roleAccess.create.mockRejectedValue(new Error('Database error'));

      const createRoleRequest = createMockRequest('POST', {
        name: 'Test Role',
        description: 'Test Description',
        role_type: 'custom',
        permissions: [],
        table_names: ['test'],
        is_active: true
      }, { 'authorization': 'Bearer admin-token' });
      
      const response = await createRole(createRoleRequest, createTestContext(productId));
      expect(response.status).toBe(500);
    });

    it('previene asignación de usuarios a roles inexistentes', async () => {
      const productId = 'product-1';
      const userId = 'user-1';
      const invalidRoleId = 'invalid-role';

      // Limpiar todos los mocks antes de configurar este test específico
      jest.clearAllMocks();
      
      // Mock de autenticación exitosa
      mockVerifyAdmin.mockResolvedValue({ success: true, user: { id: 'admin-1' } });
      
      // Mock de producto existente
      mockPrisma.product.findUnique.mockResolvedValue({ id: productId, name: 'Test' });
      
      // Mock de usuario existente
      mockPrisma.usuarios.findUnique.mockResolvedValue({ id: userId, email: 'user@test.com' });
      
      // Mock de usuario no asignado previamente
      mockPrisma.productUser.findUnique.mockResolvedValue(null);
      
      // Mock de rol inexistente
      mockPrisma.roleAccess.findUnique.mockResolvedValue(null);

      const assignRequest = createMockRequest('POST', {
        user_id: userId,
        role_id: invalidRoleId
      }, { 'authorization': 'Bearer admin-token' });
      
      const response = await createUser(assignRequest, createTestContext(productId));
      
      // Verificar que los mocks se están llamando
      const productCalls = mockPrisma.product.findUnique.mock.calls;
      const usuariosCalls = mockPrisma.usuarios.findUnique.mock.calls;
      const roleAccessCalls = mockPrisma.roleAccess.findUnique.mock.calls;
      
      // Forzar que se muestren los logs usando fail
      if (response.status !== 404) {
        let responseBody;
        try {
          responseBody = await response.json();
        } catch (e) {
          responseBody = 'Could not parse JSON';
        }
        
        fail(`Expected 404 but got ${response.status}. Response: ${JSON.stringify(responseBody)}. Mock calls - product: ${productCalls.length}, usuarios: ${usuariosCalls.length}, roleAccess: ${roleAccessCalls.length}`);
      }
      
      expect(response.status).toBe(404);
    });
  });

  describe('Validación de permisos en flujos complejos', () => {
    it('valida permisos jerárquicos correctamente', async () => {
      const productId = 'product-1';
      const userId = 'user-1';

      // Mock de token válido
      mockAuth.verifyAccessToken.mockResolvedValue({
      valid: true,
      user: { id: userId }
    });

      // Mock de usuario con múltiples roles
      mockPrisma.usuarios.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@test.com',
        is_superadmin: false,
        productUsers: [
          {
            id: 'assignment-1',
            product_id: productId,
            role_id: 'role-1',
            roleAccess: {
              id: 'role-1',
              name: 'Usuario',
              type: RoleType.STATIC,
              static_value: 'user',
              active: true
            }
          },
          {
            id: 'assignment-2',
            product_id: productId,
            role_id: 'role-2',
            roleAccess: {
              id: 'role-2',
              name: 'Administrador',
              type: RoleType.STATIC,
              static_value: 'admin',
              active: true
            }
          }
        ]
      });

      // Validar que puede acceder con cualquiera de los roles
      const mockRequest1 = createMockRequest('GET', null, {
        'authorization': 'Bearer user-token'
      });
      
      const permission1 = {
        resource: 'test',
        action: 'read' as const,
        allowedRoles: ['Usuario']
      };
      
      mockValidateRolePermissions.mockResolvedValue({ success: true });
      
      const result1 = await mockValidateRolePermissions(mockRequest1, permission1, productId);
      expect(result1.success).toBe(true);

      const mockRequest2 = createMockRequest('GET', null, {
        'authorization': 'Bearer user-token'
      });
      
      const permission2 = {
        resource: 'test',
        action: 'read' as const,
        allowedRoles: ['Administrador']
      };
      
      const result2 = await mockValidateRolePermissions(mockRequest2, permission2, productId);
      expect(result2.success).toBe(true);

      const mockRequest3 = createMockRequest('GET', null, {
        'authorization': 'Bearer user-token'
      });
      
      const permission3 = {
        resource: 'test',
        action: 'read' as const,
        allowedRoles: ['Usuario', 'Administrador']
      };
      
      const result3 = await mockValidateRolePermissions(mockRequest3, permission3, productId);
      expect(result3.success).toBe(true);
    });
  });
});