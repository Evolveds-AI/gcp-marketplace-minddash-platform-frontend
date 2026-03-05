// Mock setup para tests del sistema de roles
import { jest } from '@jest/globals';

// Mock de Prisma Client
export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  usuarios: {
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
  roleAccess: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  rolesAcDatos: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  },
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
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

// Mock de funciones de autenticación
export const mockAuth = {
  verifyAccessToken: jest.fn(),
  verifyAdmin: jest.fn()
};

// Mock de la base de datos - configurado en jest.setup.js

// Mock del middleware de autenticación
jest.mock('@/lib/middleware/adminAuth', () => ({
  verifyAdmin: mockAuth.verifyAdmin,
  verifySuperAdmin: jest.fn()
}));

// Datos de prueba
export const testData = {
  user: {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    iam_role: 'user',
    client_id: 'test-client-id',
    is_active: true,
    RoleAccess: {
      id: 'test-role-id',
      name: 'test-role',
      table_names: ['conversations', 'messages']
    }
  },
  adminUser: {
    id: 'admin-user-id',
    username: 'adminuser',
    email: 'admin@example.com',
    iam_role: 'super_admin',
    client_id: 'admin-client-id',
    is_active: true,
    RoleAccess: {
      id: 'admin-role-id',
      name: 'admin-role',
      table_names: ['*']
    }
  },
  product: {
    id: 'test-product-id',
    name: 'Test Product',
    config: {},
    created_at: new Date(),
    updated_at: new Date()
  },
  role: {
    id: 'test-role-id',
    name: 'Test Role',
    table_names: ['conversations', 'messages'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  dataAccessRule: {
    tabla: 'conversations',
    campo: 'product_id',
    valor: 'test-product-id',
    user_id: 'test-user-id'
  }
};

// Helper para resetear todos los mocks
export const resetAllMocks = () => {
  Object.values(mockPrisma).forEach(table => {
    Object.values(table).forEach(method => {
      if (typeof method === 'function' && 'mockClear' in method) {
        method.mockClear();
      }
    });
  });
  
  Object.values(mockAuth).forEach(method => {
    if (typeof method === 'function' && 'mockClear' in method) {
      method.mockClear();
    }
  });
};

// Helper para crear request mock compatible con NextRequest
export const createMockRequest = (options: {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  url?: string;
} = {}) => {
  const { method = 'GET', body = null, headers = {}, url: requestUrl = 'http://localhost:3000/test' } = options;
  const url = new URL(requestUrl);
  
  const request = {
    method,
    headers: {
      get: jest.fn((name: string) => {
        const lowerName = name.toLowerCase();
        const headerKey = Object.keys(headers).find(key => key.toLowerCase() === lowerName);
        return headerKey ? headers[headerKey] : null;
      }),
      ...headers
    },
    json: jest.fn().mockResolvedValue(body),
    url: url.toString(),
    nextUrl: {
      searchParams: url.searchParams,
      pathname: url.pathname,
      href: url.toString()
    }
  } as any;
  
  return request;
};

// Helper para crear response mock
export const createMockResponse = () => {
  const response = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    headers: new Map()
  };
  
  return response;
};

// Mock de NextResponse
export const mockNextResponse = {
  json: jest.fn((data: any, init?: any) => ({
    json: () => Promise.resolve(data),
    status: init?.status || 200,
    headers: new Map(Object.entries(init?.headers || {}))
  }))
};