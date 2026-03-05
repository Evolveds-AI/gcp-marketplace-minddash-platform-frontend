import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'

// Mock Next.js Web APIs
Object.defineProperty(global, 'Request', {
  value: class Request {
    constructor(input, init) {
      Object.defineProperty(this, 'url', {
        value: input,
        writable: false,
        enumerable: true,
        configurable: true
      })
      this.method = init?.method || 'GET'
      this.headers = new Headers(init?.headers)
    }
  },
  writable: true
})

Object.defineProperty(global, 'Response', {
  value: class Response {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.headers = new Headers(init?.headers)
    }
    
    json() {
      return Promise.resolve(JSON.parse(this.body))
    }
    
    static json(data, init) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers
        }
      })
    }
  },
  writable: true
})

Object.defineProperty(global, 'Headers', {
  value: class Headers {
    constructor(init) {
      this.headers = new Map()
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value)
        })
      }
    }
    
    get(name) {
      return this.headers.get(name.toLowerCase())
    }
    
    set(name, value) {
      this.headers.set(name.toLowerCase(), value)
    }
    
    entries() {
      return this.headers.entries()
    }
    
    keys() {
      return this.headers.keys()
    }
    
    values() {
      return this.headers.values()
    }
  },
  writable: true
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn()
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  }
}))

// Mock Prisma client globally
const mockPrisma = {
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

// Mock the database module
jest.mock('@/lib/database', () => ({
  __esModule: true,
  default: mockPrisma
}));

// Export mockPrisma for use in tests
global.mockPrisma = mockPrisma;

// Global test timeout
jest.setTimeout(10000)