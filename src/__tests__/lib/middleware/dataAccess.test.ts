import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { mockPrisma, testData, resetAllMocks } from '../../utils/test-helpers';

// Mock de dependencias
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('@/lib/database', () => ({
  __esModule: true,
  default: mockPrisma
}));

// Importar módulos después de los mocks
import { verifyDataAccess } from '@/lib/middleware/dataAccess';

describe('Middleware dataAccess', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('verifyDataAccess', () => {
    const mockRequest = {
      headers: {
        get: jest.fn()
      }
    } as any;

    const accessParams = {
      tabla: 'conversations',
      userId: testData.user.id,
      productId: testData.product.id,
      enforceProductScope: true
    };

    it('debería retornar error si no hay token', async () => {
      mockRequest.headers.get.mockReturnValue(null);
      const mockVerifyToken = jest.fn();

      const result = await verifyDataAccess(mockRequest, accessParams, mockVerifyToken, mockPrisma);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token requerido');
      expect(result.status).toBe(401);
    });

    it('debería retornar error si el token es inválido', async () => {
      mockRequest.headers.get.mockReturnValue('Bearer invalid-token');
      const mockVerifyToken = jest.fn().mockReturnValue(null);

      const result = await verifyDataAccess(mockRequest, accessParams, mockVerifyToken, mockPrisma);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token inválido');
      expect(result.status).toBe(401);
    });

    it('debería retornar error si el usuario no existe', async () => {
      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      const mockVerifyToken = jest.fn().mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(null);

      const result = await verifyDataAccess(mockRequest, accessParams, mockVerifyToken, mockPrisma);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no encontrado');
      expect(result.status).toBe(404);
    });

    it('debería permitir acceso completo a superadministradores', async () => {
      const superAdminUser = {
        ...testData.user,
        iam_role: 'super_admin',
        is_active: true,
        RoleAccess: null
      };

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      const mockVerifyToken = jest.fn().mockReturnValue({
        userId: superAdminUser.id,
        username: superAdminUser.username,
        email: superAdminUser.email,
        role: superAdminUser.iam_role,
        isAdmin: superAdminUser.iam_role === 'admin',
        clientId: superAdminUser.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(superAdminUser);

      const result = await verifyDataAccess(mockRequest, accessParams, mockVerifyToken, mockPrisma);

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: superAdminUser.id,
        username: superAdminUser.username,
        email: superAdminUser.email,
        iam_role: superAdminUser.iam_role,
        client_id: superAdminUser.client_id
      });
      expect(result.allowedTables).toEqual(['*']);
    });

    it('debería retornar error si el usuario no tiene acceso a la tabla', async () => {
      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      const mockVerifyToken = jest.fn().mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      const userWithoutAccess = {
        ...testData.user,
        is_active: true,
        RoleAccess: {
          id: testData.role.id,
          name: testData.role.name,
          table_names: ['other_table'] // No tiene acceso a 'conversations'
        }
      };
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithoutAccess);

      const result = await verifyDataAccess(mockRequest, accessParams, mockVerifyToken, mockPrisma);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Acceso denegado a la tabla 'conversations'");
      expect(result.status).toBe(403);
    });

    it('debería aplicar reglas de acceso a datos específicas', async () => {
      const userWithAccess = {
        ...testData.user,
        is_active: true,
        RoleAccess: {
          id: testData.role.id,
          name: testData.role.name,
          table_names: ['conversations']
        }
      };

      const dataAccessRules = [
        {
          tabla: 'conversations',
          campo: 'userId',
          valor: testData.user.id
        },
        {
          tabla: 'conversations',
          campo: 'product_id',
          valor: testData.product.id
        }
      ];

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      const mockVerifyToken = jest.fn().mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithAccess);
      mockPrisma.productUser.findFirst.mockResolvedValue({
        user_id: testData.user.id,
        product_id: testData.product.id
      });
      mockPrisma.rolesAcDatos.findMany.mockResolvedValue(dataAccessRules);

      const result = await verifyDataAccess(mockRequest, accessParams, mockVerifyToken, mockPrisma);
      console.log('Test result:', JSON.stringify(result, null, 2));

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        iam_role: testData.user.iam_role,
        client_id: testData.user.client_id
      });
      expect(result.accessRules).toEqual([{
        tabla: 'conversations',
        campo: 'product_id',
        valor: testData.product.id
      }]);
      expect(result.allowedTables).toEqual(['conversations']);
    });

    it('debería retornar error si la operación no está permitida', async () => {
      const userWithAccess = {
        ...testData.user,
        is_active: true,
        RoleAccess: {
          id: testData.role.id,
          name: testData.role.name,
          table_names: ['conversations']
        }
      };

      const dataAccessRules = [
        {
          tabla: 'conversations',
          campo: 'userId',
          valor: testData.user.id
        },
        {
          tabla: 'conversations',
          campo: 'product_id',
          valor: testData.product.id
        }
      ];

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      const mockVerifyToken = jest.fn().mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithAccess);
      mockPrisma.productUser.findFirst.mockResolvedValue({
        user_id: testData.user.id,
        product_id: testData.product.id
      });
      mockPrisma.rolesAcDatos.findMany.mockResolvedValue(dataAccessRules);

      const result = await verifyDataAccess(mockRequest, accessParams, mockVerifyToken, mockPrisma);

      expect(result.success).toBe(true);
      expect(result.accessRules).toEqual([{
        tabla: 'conversations',
        campo: 'product_id',
        valor: testData.product.id
      }]);
      expect(result.allowedTables).toEqual(['conversations']);
    });

    it('debería combinar filtros de múltiples reglas de acceso', async () => {
      const userWithAccess = {
        ...testData.user,
        is_active: true,
        RoleAccess: {
          id: testData.role.id,
          name: testData.role.name,
          table_names: ['conversations']
        }
      };

      const dataAccessRules = [
        {
          tabla: 'conversations',
          campo: 'userId',
          valor: testData.user.id
        },
        {
          tabla: 'conversations',
          campo: 'status',
          valor: 'active'
        },
        {
          tabla: 'conversations',
          campo: 'product_id',
          valor: testData.product.id
        }
      ];

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      const mockVerifyToken = jest.fn().mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithAccess);
      mockPrisma.productUser.findFirst.mockResolvedValue({
        user_id: testData.user.id,
        product_id: testData.product.id
      });
      mockPrisma.rolesAcDatos.findMany.mockResolvedValue(dataAccessRules);

      const result = await verifyDataAccess(mockRequest, accessParams, mockVerifyToken, mockPrisma);

      expect(result.success).toBe(true);
      expect(result.accessRules).toEqual([{
        tabla: 'conversations',
        campo: 'product_id',
        valor: testData.product.id
      }]);
      expect(result.allowedTables).toEqual(['conversations']);
    });

    it('debería filtrar por producto cuando se proporciona productId', async () => {
      const userWithAccess = {
        ...testData.user,
        is_active: true,
        RoleAccess: {
          id: testData.role.id,
          name: testData.role.name,
          table_names: ['conversations']
        }
      };

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      const mockVerifyToken = jest.fn().mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithAccess);
      mockPrisma.productUser.findFirst.mockResolvedValue({
        user_id: testData.user.id,
        product_id: testData.product.id
      });
      mockPrisma.rolesAcDatos.findMany.mockResolvedValue([]);

      const result = await verifyDataAccess(mockRequest, accessParams, mockVerifyToken, mockPrisma);

      expect(result.success).toBe(true);
      expect(result.accessRules).toEqual([]);
      expect(result.allowedTables).toEqual(['conversations']);
    });

    it('debería permitir acceso sin reglas específicas cuando el usuario tiene acceso a la tabla', async () => {
      const userWithAccess = {
        ...testData.user,
        is_active: true,
        RoleAccess: {
          id: testData.role.id,
          name: testData.role.name,
          table_names: ['conversations']
        }
      };

      const paramsWithoutProduct = {
        tabla: 'conversations' as const,
        userId: testData.user.id,
        enforceProductScope: false
      };

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      const mockVerifyToken = jest.fn().mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithAccess);
      mockPrisma.rolesAcDatos.findMany.mockResolvedValue([]);

      const result = await verifyDataAccess(mockRequest, paramsWithoutProduct, mockVerifyToken, mockPrisma);

      expect(result.success).toBe(true);
      expect(result.accessRules).toEqual([]);
      expect(result.allowedTables).toEqual(['conversations']);
    });

    it('debería manejar errores internos del servidor', async () => {
      mockRequest.headers.get.mockReturnValue('Bearer valid-token');
      const mockVerifyToken = jest.fn().mockReturnValue({ userId: 'user1', productId: 'product1' });
      mockPrisma.rolesAcDatos.findMany.mockRejectedValue(new Error('Database error'));

      const result = await verifyDataAccess(mockRequest, accessParams, mockVerifyToken, mockPrisma);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error interno del servidor');
      expect(result.status).toBe(500);
    });

    it('debería aplicar filtros adicionales proporcionados en los parámetros', async () => {
      const userWithAccess = {
        ...testData.user,
        is_active: true,
        RoleAccess: {
          id: testData.role.id,
          name: testData.role.name,
          table_names: ['conversations']
        }
      };

      const dataAccessRules = [{
        tabla: 'conversations',
        campo: 'product_id',
        valor: testData.product.id
      }];

      const paramsWithFilters = {
        tabla: 'conversations' as const,
        userId: testData.user.id,
        productId: testData.product.id,
        enforceProductScope: true,
        additionalFilters: {
          status: 'active',
          category: 'important'
        }
      };

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      const mockVerifyToken = jest.fn().mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithAccess);
      mockPrisma.productUser.findFirst.mockResolvedValue({
        user_id: testData.user.id,
        product_id: testData.product.id
      });
      mockPrisma.rolesAcDatos.findMany.mockResolvedValue(dataAccessRules);

      const result = await verifyDataAccess(mockRequest, paramsWithFilters, mockVerifyToken, mockPrisma);

      expect(result.success).toBe(true);
      expect(result.accessRules).toEqual(dataAccessRules);
      expect(result.allowedTables).toEqual(['conversations']);
    });
  });
});