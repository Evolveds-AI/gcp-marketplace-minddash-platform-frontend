import { GET } from '../../../app/api/access/check/route';
import { NextRequest } from 'next/server';
import { checkAccess } from '../../../lib/authorization/accessControl';
import { logger } from '../../../lib/logger';

// Mock del módulo accessControl
jest.mock('../../../lib/authorization/accessControl', () => ({
  checkAccess: jest.fn()
}));

// Mock the logger
jest.mock('../../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const mockCheckAccess = checkAccess as jest.MockedFunction<typeof checkAccess>;
const mockLogger = logger as jest.Mocked<typeof logger>;



describe('/api/access/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  const createMockRequest = (searchParams: Record<string, string>) => {
    const url = new URL('http://localhost:3000/api/access/check');
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    return new NextRequest(url);
  };

  describe('GET', () => {
    it('should return hasAccess true when user has access', async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue(true);
      const request = createMockRequest({
        userId: 'user123',
        tabla: 'product',
        campo: 'id',
        valor: 'product123'
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ hasAccess: true });
      expect(mockCheckAccess).toHaveBeenCalledWith({
        userId: 'user123',
        tabla: 'product',
        campo: 'id',
        valor: 'product123'
      });
    });

    it('should return hasAccess false when user does not have access', async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue(false);
      const request = createMockRequest({
        userId: 'user123',
        tabla: 'product',
        campo: 'id',
        valor: 'product123'
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ hasAccess: false });
    });

    it('should return 400 when userId is missing', async () => {
      // Arrange
      const request = createMockRequest({
        tabla: 'product',
        campo: 'id',
        valor: 'product123'
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Missing parameters' });
      expect(mockCheckAccess).not.toHaveBeenCalled();
    });

    it('should return 400 when tabla is missing', async () => {
      // Arrange
      const request = createMockRequest({
        userId: 'user123',
        campo: 'id',
        valor: 'product123'
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Missing parameters' });
    });

    it('should return 400 when campo is missing', async () => {
      // Arrange
      const request = createMockRequest({
        userId: 'user123',
        tabla: 'product',
        valor: 'product123'
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Missing parameters' });
    });

    it('should return 400 when valor is missing', async () => {
      // Arrange
      const request = createMockRequest({
        userId: 'user123',
        tabla: 'product',
        campo: 'id'
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Missing parameters' });
    });

    it('should return 500 when checkAccess throws an error', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockCheckAccess.mockRejectedValue(dbError);
      const request = createMockRequest({
        userId: 'user123',
        tabla: 'product',
        campo: 'id',
        valor: 'product123'
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
      expect(mockLogger.error).toHaveBeenCalledWith('Error checking access', {
        userId: 'user123',
        tabla: 'product',
        campo: 'id',
        valor: 'product123',
        error: 'Database connection failed',
        stack: expect.any(String)
      });
    });

    it('should handle special characters in parameters', async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue(true);
      const request = createMockRequest({
        userId: 'user@123',
        tabla: 'product',
        campo: 'name',
        valor: 'product with spaces & symbols'
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ hasAccess: true });
      expect(mockCheckAccess).toHaveBeenCalledWith({
        userId: 'user@123',
        tabla: 'product',
        campo: 'name',
        valor: 'product with spaces & symbols'
      });
    });

    it('should handle empty string parameters', async () => {
      // Arrange
      const request = createMockRequest({
        userId: '',
        tabla: '',
        campo: '',
        valor: ''
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Missing parameters' });
    });
  });
});