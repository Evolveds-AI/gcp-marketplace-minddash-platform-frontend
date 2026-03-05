import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET, POST } from '@/app/api/products/[productId]/roles/route';
import { mockPrisma, mockAuth, testData, resetAllMocks, createMockRequest } from '../../../utils/test-helpers';

// Mock de dependencias
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('@/lib/middleware/adminAuth', () => ({
  verifyAdmin: mockAuth.verifyAdmin
}));

jest.mock('@/lib/database', () => mockPrisma);

describe('API /api/products/[productId]/roles', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('GET /api/products/[productId]/roles', () => {
    const params = { productId: testData.product.id };

    it('debería retornar error 401 si no hay autenticación', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({
        success: false,
        error: 'No autorizado',
        status: 401
      });

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/products/${testData.product.id}/roles`
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
        url: `http://localhost:3000/api/products/${testData.product.id}/roles`
      });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Producto no encontrado');
    });

    it('debería retornar lista de roles exitosamente', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.roleAccess.findMany.mockResolvedValue([{
        ...testData.role,
        usuarios: [testData.user]
      }]);
      mockPrisma.roleAccess.count.mockResolvedValue(1);
      mockPrisma.rolesAcDatos.findMany.mockResolvedValue([testData.dataAccessRule]);

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/products/${testData.product.id}/roles?page=1&limit=10`
      });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.roles).toHaveLength(1);
      expect(data.data.roles[0].name).toBe(testData.role.name);
      expect(data.data.pagination.current_page).toBe(1);
    });

    it('debería aplicar filtros de búsqueda correctamente', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.roleAccess.findMany.mockResolvedValue([]);
      mockPrisma.roleAccess.count.mockResolvedValue(0);

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/products/${testData.product.id}/roles?search=admin&role_type=admin`
      });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(mockPrisma.roleAccess.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: {
              contains: 'admin',
              mode: 'insensitive'
            }
          })
        })
      );
      expect(data.data.filters.search).toBe('admin');
      expect(data.data.filters.role_type).toBe('admin');
    });

    it('debería manejar errores internos del servidor', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/products/${testData.product.id}/roles`
      });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Error interno del servidor');
    });
  });

  describe('POST /api/products/[productId]/roles', () => {
    const params = { productId: testData.product.id };
    const validRoleData = {
      name: 'Nuevo Rol',
      description: 'Descripción del rol',
      role_type: 'custom',
      permissions: ['read', 'write'],
      table_names: ['conversations'],
      is_active: true,
      data_access_rules: []
    };

    it('debería retornar error 401 si no hay autenticación', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({
        success: false,
        error: 'No autorizado',
        status: 401
      });

      const request = createMockRequest({
        method: 'POST',
        body: validRoleData,
        url: `http://localhost:3000/api/products/${testData.product.id}/roles`
      });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('debería retornar error 404 si el producto no existe', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        body: validRoleData,
        url: `http://localhost:3000/api/products/${testData.product.id}/roles`
      });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Producto no encontrado');
    });

    it('debería retornar error 400 con datos inválidos', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);

      const invalidData = {
        name: '', // Nombre vacío
        role_type: 'invalid_type'
      };

      const request = createMockRequest({
        method: 'POST',
        body: invalidData,
        url: `http://localhost:3000/api/products/${testData.product.id}/roles`
      });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Datos del rol inválidos');
      expect(data.details).toBeDefined();
    });

    it('debería retornar error 409 si el rol ya existe', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.roleAccess.findUnique.mockResolvedValue(testData.role);

      const request = createMockRequest({
        method: 'POST',
        body: validRoleData,
        url: `http://localhost:3000/api/products/${testData.product.id}/roles`
      });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Ya existe un rol con ese nombre');
    });

    it('debería crear un rol exitosamente', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockResolvedValue(testData.product);
      mockPrisma.roleAccess.findUnique.mockResolvedValue(null);
      mockPrisma.roleAccess.create.mockResolvedValue({
        ...testData.role,
        name: validRoleData.name
      });
      mockPrisma.product.update.mockResolvedValue(testData.product);

      const request = createMockRequest({
        method: 'POST',
        body: validRoleData,
        url: `http://localhost:3000/api/products/${testData.product.id}/roles`
      });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Rol creado exitosamente');
      expect(data.data.name).toBe(validRoleData.name);
      expect(data.data.description).toBe(validRoleData.description);
      expect(data.data.users_count).toBe(0);

      expect(mockPrisma.roleAccess.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: validRoleData.name,
            table_names: validRoleData.table_names
          })
        })
      );
    });

    it('debería manejar errores internos del servidor', async () => {
      mockAuth.verifyAdmin.mockResolvedValue({ success: true });
      mockPrisma.product.findUnique.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        method: 'POST',
        body: validRoleData,
        url: `http://localhost:3000/api/products/${testData.product.id}/roles`
      });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Error interno del servidor');
    });
  });
});