import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { testData, createMockRequest } from '../../../utils/test-helpers';

// Crear mock local de Prisma
const mockPrisma = {
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  role: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  productUser: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  }
};

// Mock local de auth
const mockAuth = {
  verifyAccessToken: jest.fn(),
  verifyAdmin: jest.fn()
};

// Mock del módulo de base de datos usando doMock
jest.doMock('@/lib/database', () => ({
  __esModule: true,
  default: mockPrisma
}));

// Mock del middleware de autenticación
jest.doMock('@/lib/middleware/adminAuth', () => ({
  verifyAdmin: mockAuth.verifyAdmin
}));

// Importar la API después de configurar los mocks
let GET: any, POST: any, PUT: any, DELETE: any;

beforeAll(async () => {
  const module = await import('@/app/api/products/[productId]/users/route');
  GET = module.GET;
  POST = module.POST;
  PUT = module.PUT;
  DELETE = module.DELETE;
});

describe('API /api/products/[productId]/users', () => {
  beforeEach(() => {
    // Limpiar todos los mocks
    Object.values(mockPrisma).forEach(model => {
      if (typeof model === 'object' && model !== null) {
        Object.values(model).forEach(method => {
          if (typeof method === 'function' && method.mockReset) {
            method.mockReset();
          }
        });
      }
    });
    
    Object.values(mockAuth).forEach(method => {
      if (typeof method === 'function' && method.mockReset) {
        method.mockReset();
      }
    });

    // Configurar mocks por defecto
    mockPrisma.product.findUnique.mockResolvedValue(testData.product);
    mockPrisma.user.findUnique.mockResolvedValue(testData.user);
    mockPrisma.role.findUnique.mockResolvedValue(testData.role);
    mockPrisma.productUser.findUnique.mockResolvedValue(null);
    mockPrisma.productUser.findFirst.mockResolvedValue(null);
  });

  describe('GET /api/products/[productId]/users', () => {
    const params = { productId: testData.product.id };

    it('debería retornar error 401 si no hay autenticación', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({
        success: false,
        error: 'No autorizado',
        status: 401
      });

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/products/${testData.product.id}/users`
      });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No autorizado');
    });

    it('debería retornar error 404 si el producto no existe', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/products/${testData.product.id}/users`
      });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Producto no encontrado');
    });

    it('debería retornar lista de usuarios con roles exitosamente', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.productUser.findMany.mockResolvedValue([{
        id: '1',
        productId: testData.product.id,
        userId: testData.user.id,
        roleId: testData.role.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: testData.user,
        role: testData.role
      }]);
      mockPrisma.productUser.count.mockResolvedValue(1);

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/products/${testData.product.id}/users?page=1&limit=10`
      });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(1);
      expect(data.data.users[0].email).toBe(testData.user.email);
      expect(data.data.users[0].role.name).toBe(testData.role.name);
      expect(data.data.pagination.current_page).toBe(1);
    });

    it('debería aplicar filtros de búsqueda correctamente', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.productUser.findMany.mockResolvedValue([]);
      mockPrisma.productUser.count.mockResolvedValue(0);

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/products/${testData.product.id}/users?search=admin&role_id=${testData.role.id}`
      });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(mockPrisma.productUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            roleId: testData.role.id,
            user: {
              OR: [
                { email: { contains: 'admin', mode: 'insensitive' } },
                { name: { contains: 'admin', mode: 'insensitive' } }
              ]
            }
          })
        })
      );
      expect(data.data.filters.search).toBe('admin');
      expect(data.data.filters.role_id).toBe(testData.role.id);
    });
  });

  describe('POST /api/products/[productId]/users', () => {
    const params = { productId: testData.product.id };
    const validUserData = {
      email: 'nuevo@usuario.com',
      name: 'Nuevo Usuario',
      role_id: testData.role.id
    };

    it('debería retornar error 401 si no hay autenticación', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({
        success: false,
        error: 'No autorizado',
        status: 401
      });

      const request = createMockRequest({
        method: 'POST',
        body: validUserData,
        url: `http://localhost:3000/api/products/${testData.product.id}/users`
      });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('debería retornar error 400 para datos inválidos', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);

      const invalidData = {
        email: 'email-invalido', // Email inválido
        role_id: 'invalid-id'
      };

      const request = createMockRequest({
        method: 'POST',
        body: invalidData,
        url: `http://localhost:3000/api/products/${testData.product.id}/users`
      });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Datos inválidos');
    });

    it('debería retornar error 404 si el rol no existe', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.role.findUnique.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        body: validUserData,
        url: `http://localhost:3000/api/products/${testData.product.id}/users`
      });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Rol no encontrado');
    });

    it('debería crear nuevo usuario y asignarlo al producto', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.role.findUnique.mockResolvedValue(testData.role);
      mockPrisma.user.findUnique.mockResolvedValue(null); // Usuario no existe
      mockPrisma.productUser.findFirst.mockResolvedValue(null); // No está asignado
      mockPrisma.user.create.mockResolvedValue({
        ...testData.user,
        email: validUserData.email,
        name: validUserData.name
      });
      mockPrisma.productUser.create.mockResolvedValue({
        id: '1',
        productId: testData.product.id,
        userId: testData.user.id,
        roleId: testData.role.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: testData.user.id,
          email: validUserData.email,
          name: validUserData.name
        },
        role: {
          id: testData.role.id,
          name: testData.role.name
        }
      });

      const request = createMockRequest({
        method: 'POST',
        body: validUserData,
        url: `http://localhost:3000/api/products/${testData.product.id}/users`
      });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Usuario asignado exitosamente');
      expect(data.data.email).toBe(validUserData.email);
    });

    it('debería asignar usuario existente a producto', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.role.findUnique.mockResolvedValue(testData.role);
      mockPrisma.user.findUnique.mockResolvedValue(testData.user);
      mockPrisma.productUser.findFirst.mockResolvedValue(null); // No está asignado
      mockPrisma.productUser.create.mockResolvedValue({
        id: '1',
        productId: testData.product.id,
        userId: testData.user.id,
        roleId: testData.role.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: testData.user.id,
          email: testData.user.email,
          name: testData.user.name
        },
        role: {
          id: testData.role.id,
          name: testData.role.name
        }
      });

      const request = createMockRequest({
        method: 'POST',
        body: { ...validUserData, email: testData.user.email },
        url: `http://localhost:3000/api/products/${testData.product.id}/users`
      });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Usuario asignado exitosamente');
    });
  });

  describe('PUT /api/products/[productId]/users', () => {
    const params = { productId: testData.product.id };
    const updateData = {
      user_id: testData.user.id,
      role_id: testData.role.id
    };

    it('debería actualizar rol de usuario exitosamente', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.user.findUnique.mockResolvedValue(testData.user);
      mockPrisma.role.findUnique.mockResolvedValue(testData.role);
      mockPrisma.productUser.findFirst.mockResolvedValue({
        id: '1',
        productId: testData.product.id,
        userId: testData.user.id,
        roleId: 'old-role-id',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      mockPrisma.productUser.update.mockResolvedValue({
        id: '1',
        productId: testData.product.id,
        userId: testData.user.id,
        roleId: testData.role.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: testData.user.id,
          email: testData.user.email,
          name: testData.user.name
        },
        role: {
          id: testData.role.id,
          name: testData.role.name
        }
      });

      const request = createMockRequest({
        method: 'PUT',
        body: updateData,
        url: `http://localhost:3000/api/products/${testData.product.id}/users`
      });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Rol de usuario actualizado exitosamente');
    });

    it('debería retornar error 404 si el usuario no está asignado al producto', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.role.findUnique.mockResolvedValue(testData.role);
      mockPrisma.user.findUnique.mockResolvedValue(testData.user);
      mockPrisma.productUser.findFirst.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'PUT',
        body: updateData,
        url: `http://localhost:3000/api/products/${testData.product.id}/users`
      });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Usuario no encontrado en este producto');
    });
  });

  describe('DELETE /api/products/[productId]/users', () => {
    const params = { productId: testData.product.id };

    it('debería eliminar usuario del producto exitosamente', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.user.findUnique.mockResolvedValue(testData.user);
      mockPrisma.productUser.findUnique.mockResolvedValue({
        id: '1',
        productId: testData.product.id,
        userId: testData.user.id,
        roleId: testData.role.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      mockPrisma.productUser.delete.mockResolvedValue({
        id: '1',
        productId: testData.product.id,
        userId: testData.user.id,
        roleId: testData.role.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const request = createMockRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/products/${testData.product.id}/users?user_id=${testData.user.id}`
      });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Usuario eliminado del producto exitosamente');
    });

    it('debería retornar error 400 si falta user_id', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });

      const request = createMockRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/products/${testData.product.id}/users`
      });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('ID de usuario requerido');
    });

    it('debería retornar error 404 si el usuario no está asignado al producto', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.user.findUnique.mockResolvedValue(testData.user);
      mockPrisma.productUser.findUnique.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/products/${testData.product.id}/users?user_id=${testData.user.id}`
      });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Usuario no encontrado en este producto');
    });
  });
});