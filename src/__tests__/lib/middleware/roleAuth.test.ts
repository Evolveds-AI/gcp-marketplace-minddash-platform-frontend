import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Crear mock function
const mockVerifyAccessToken = jest.fn();

// Mock de auth module usando doMock
jest.doMock('@/lib/auth', () => ({
  verifyAccessToken: mockVerifyAccessToken
}));

// Importar dinámicamente después del mock
let validateRolePermissions: any;
beforeAll(async () => {
  const module = await import('@/lib/middleware/roleAuth');
  validateRolePermissions = module.validateRolePermissions;
});

// Mock de Prisma
const mockPrisma = {
  usuarios: {
    findUnique: jest.fn()
  },
  productUser: {
    findFirst: jest.fn()
  },
  rolesAcDatos: {
    findMany: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('@/lib/database', () => mockPrisma);

// Datos de prueba
const testData = {
  user: {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    iam_role: 'admin',
    client_id: 'client-1',
    is_active: true,
    RoleAccess: {
      id: 'role-1',
      name: 'admin',
      table_names: ['conversations', 'users', 'products']
    }
  },
  product: {
    id: 'product-1',
    name: 'Test Product'
  }
};

describe('Middleware roleAuth', () => {
  beforeEach(() => {
    // Reset todos los mocks
    jest.clearAllMocks();
    
    // Configurar mocks por defecto
    mockPrisma.usuarios.findUnique.mockResolvedValue(null);
    mockPrisma.productUser.findFirst.mockResolvedValue(null);
  });



  describe('validateRolePermissions', () => {
    const mockRequest = {
      headers: {
        get: jest.fn()
      }
    } as any;

    const validationParams = {
      resource: 'conversations',
      action: 'read' as const,
      allowedRoles: ['admin', 'editor'],
      requiredTables: ['conversations'],
      requiresProductAccess: false
    };

    it('debería retornar error si no hay token', async () => {
      mockRequest.headers.get.mockReturnValue(null);

      const result = await validateRolePermissions(mockRequest, validationParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token de autenticación requerido');
      expect(result.status).toBe(401);
    });

    it('debería retornar error si el token es inválido', async () => {
      mockRequest.headers.get.mockReturnValue('Bearer invalid-token');
      mockVerifyAccessToken.mockReturnValue(null);

      const result = await validateRolePermissions(mockRequest, validationParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token inválido o expirado');
      expect(result.status).toBe(401);
    });

    it('debería retornar error si el usuario no existe', async () => {
      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      mockVerifyAccessToken.mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(null);

      const result = await validateRolePermissions(mockRequest, validationParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no encontrado');
      expect(result.status).toBe(404);
    });

    it('debería permitir acceso a superadministradores', async () => {
      const superAdminUser = {
        ...testData.user,
        iam_role: 'super_admin',
        RoleAccess: {
          id: 'super-role-1',
          name: 'super_admin',
          table_names: ['*']
        }
      };

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      mockVerifyAccessToken.mockReturnValue({
        userId: superAdminUser.id,
        username: superAdminUser.username,
        email: superAdminUser.email,
        role: superAdminUser.iam_role,
        isAdmin: superAdminUser.iam_role === 'admin',
        clientId: superAdminUser.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(superAdminUser);

      const result = await validateRolePermissions(mockRequest, validationParams);

      expect(result.success).toBe(true);
      expect(result.user.iam_role).toBe('super_admin');
      expect(result.user.role.name).toBe('super_admin');
    });

    it('debería retornar error si el usuario no tiene rol asignado', async () => {
      const userWithoutRole = {
        ...testData.user,
        RoleAccess: null
      };

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      mockVerifyAccessToken.mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithoutRole);

      const result = await validateRolePermissions(mockRequest, validationParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario sin rol asignado. Contacte al administrador.');
      expect(result.status).toBe(403);
    });

    it('debería retornar error si el usuario no tiene roles permitidos', async () => {
      const userWithWrongRole = {
        ...testData.user,
        iam_role: 'viewer', // Rol no permitido
        RoleAccess: {
          id: 'role-1',
          name: 'viewer',
          table_names: ['conversations']
        }
      };

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      mockVerifyAccessToken.mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: userWithWrongRole.iam_role,
        isAdmin: userWithWrongRole.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithWrongRole);

      const result = await validateRolePermissions(mockRequest, validationParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Acceso denegado. Roles permitidos: admin, editor');
      expect(result.status).toBe(403);
    });

    it('debería retornar error si el usuario no tiene acceso a las tablas requeridas', async () => {
      const userWithLimitedAccess = {
        ...testData.user,
        iam_role: 'admin',
        RoleAccess: {
          id: 'role-1',
          name: 'admin',
          table_names: ['other_table'] // No tiene acceso a 'conversations'
        }
      };

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      mockVerifyAccessToken.mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: userWithLimitedAccess.iam_role,
        isAdmin: userWithLimitedAccess.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithLimitedAccess);

      const result = await validateRolePermissions(mockRequest, validationParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Acceso denegado a las tablas: conversations');
      expect(result.status).toBe(403);
    });

    it('debería retornar error si el usuario no tiene acceso al recurso específico', async () => {
      const validationParamsWithResource = {
        resource: 'other_resource', // Recurso al que no tiene acceso
        action: 'read' as const,
        allowedRoles: ['admin', 'editor'],
        requiredTables: ['conversations'],
        requiresProductAccess: false
      };

      const userWithValidRole = {
        ...testData.user,
        iam_role: 'admin',
        RoleAccess: {
          id: 'role-1',
          name: 'admin',
          table_names: ['conversations'] // No tiene acceso a 'other_resource'
        }
      };

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      mockVerifyAccessToken.mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithValidRole);

      const result = await validateRolePermissions(mockRequest, validationParamsWithResource);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Acceso denegado al recurso 'other_resource'");
      expect(result.status).toBe(403);
    });

    it('debería permitir acceso cuando todas las validaciones pasan', async () => {
      const validationParamsWithResource = {
        resource: 'conversations', // Recurso al que sí tiene acceso
        action: 'read' as const,
        allowedRoles: ['admin', 'editor'],
        requiredTables: ['conversations'],
        requiresProductAccess: false
      };

      const userWithValidRole = {
        ...testData.user,
        iam_role: 'admin',
        RoleAccess: {
          id: 'role-1',
          name: 'admin',
          table_names: ['conversations']
        }
      };

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      mockVerifyAccessToken.mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithValidRole);
      
      // Mock para validateActionPermission - sin reglas específicas permite acceso
      mockPrisma.rolesAcDatos.findMany.mockResolvedValue([]);

      const result = await validateRolePermissions(mockRequest, validationParamsWithResource);

      expect(result.success).toBe(true);
      expect(result.user.id).toBe(testData.user.id);
      expect(result.user.iam_role).toBe('admin');
      expect(result.user.role.name).toBe('admin');
    });

    it('debería permitir acceso sin verificar recurso específico cuando no se proporciona resource', async () => {
      const userWithValidRole = {
        ...testData.user,
        iam_role: 'admin',
        RoleAccess: {
          id: 'role-1',
          name: 'admin',
          table_names: ['conversations']
        }
      };

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      mockVerifyAccessToken.mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: userWithValidRole.iam_role,
        isAdmin: userWithValidRole.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithValidRole);

      // Mock para validateActionPermission - sin reglas específicas permite acceso
      mockPrisma.rolesAcDatos.findMany.mockResolvedValue([]);

      const paramsWithoutResource = {
        resource: 'conversations', // Recurso requerido
        action: 'read' as const,
        allowedRoles: ['admin', 'editor'],
        requiredTables: ['conversations'],
        requiresProductAccess: false
      };

      const result = await validateRolePermissions(mockRequest, paramsWithoutResource);

      expect(result.success).toBe(true);
      expect(result.user.id).toBe(testData.user.id);
      expect(result.user.iam_role).toBe('admin');
    });

    it('debería manejar errores internos del servidor', async () => {
      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      const mockTokenData = {
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: testData.user.iam_role,
        isAdmin: testData.user.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      };
      mockVerifyAccessToken.mockReturnValue(mockTokenData);
      // Simular error en la base de datos
      mockPrisma.usuarios.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await validateRolePermissions(mockRequest, validationParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error interno del servidor');
      expect(result.status).toBe(500);
    });

    it('debería validar acceso al producto cuando requiresProductAccess es true', async () => {
      const userWithoutProductAccess = {
        ...testData.user,
        iam_role: 'editor',
        RoleAccess: {
          id: 'role-1',
          name: 'editor',
          table_names: ['conversations']
        }
      };

      mockRequest.headers.get.mockReturnValue('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test-signature');
      mockVerifyAccessToken.mockReturnValue({
        userId: testData.user.id,
        username: testData.user.username,
        email: testData.user.email,
        role: userWithoutProductAccess.iam_role,
        isAdmin: userWithoutProductAccess.iam_role === 'admin',
        clientId: testData.user.client_id,
        sessionId: 'test-session'
      });
      mockPrisma.usuarios.findUnique.mockResolvedValue(userWithoutProductAccess);
      // Usuario no tiene acceso al producto
      mockPrisma.productUser.findFirst.mockResolvedValue(null);

      const paramsWithProductAccess = {
        ...validationParams,
        requiresProductAccess: true
      };

      const result = await validateRolePermissions(mockRequest, paramsWithProductAccess, testData.product.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Acceso denegado al producto especificado');
      expect(result.status).toBe(403);
    });
  });
});