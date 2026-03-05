import { checkAccess, canAccessProduct } from '@/lib/authorization/accessControl';
import prisma from '@/lib/database';

// Mock del módulo de base de datos
jest.mock('../../../lib/database', () => ({
  default: {
    rolesAcDatos: {
      findFirst: jest.fn()
    }
  }
}));

// Create a mock for the database function
const mockRolesAcDatosFindFirst = jest.fn();

// Override the mock after it's been created
(prisma as any).rolesAcDatos = {
  findFirst: mockRolesAcDatosFindFirst
};

describe('accessControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAccess', () => {
    it('should return true when user has access', async () => {
      // Arrange
      const mockRole = {
        id: '1',
        user_id: 'user123',
        tabla: 'product',
        campo: 'id',
        valor: 'product123'
      };
      
      mockRolesAcDatosFindFirst.mockResolvedValue(mockRole);

      // Act
      const result = await checkAccess({
        userId: 'user123',
        tabla: 'product',
        campo: 'id',
        valor: 'product123'
      });

      // Assert
      expect(result).toBe(true);
      expect(mockRolesAcDatosFindFirst).toHaveBeenCalledWith({
        where: {
          user_id: 'user123',
          tabla: 'product',
          campo: 'id',
          valor: 'product123'
        }
      });
    });

    it('should return false when user does not have access', async () => {
      // Arrange
      mockRolesAcDatosFindFirst.mockResolvedValue(null);

      // Act
      const result = await checkAccess({
        userId: 'user123',
        tabla: 'product',
        campo: 'id',
        valor: 'product123'
      });

      // Assert
      expect(result).toBe(false);
      expect(mockRolesAcDatosFindFirst).toHaveBeenCalledWith({
        where: {
          user_id: 'user123',
          tabla: 'product',
          campo: 'id',
          valor: 'product123'
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockRolesAcDatosFindFirst.mockRejectedValue(dbError);

      // Act & Assert
      await expect(checkAccess({
        userId: 'user123',
        tabla: 'product',
        campo: 'id',
        valor: 'product123'
      })).rejects.toThrow('Database connection failed');
    });

    it('should work with different table types', async () => {
      // Arrange
      const mockRole = {
        id: '2',
        user_id: 'user456',
        tabla: 'client',
        campo: 'name',
        valor: 'bayer'
      };
      
      mockRolesAcDatosFindFirst.mockResolvedValue(mockRole);

      // Act
      const result = await checkAccess({
        userId: 'user456',
        tabla: 'client',
        campo: 'name',
        valor: 'bayer'
      });

      // Assert
      expect(result).toBe(true);
      expect(mockRolesAcDatosFindFirst).toHaveBeenCalledWith({
        where: {
          user_id: 'user456',
          tabla: 'client',
          campo: 'name',
          valor: 'bayer'
        }
      });
    });
  });

  describe('canAccessProduct', () => {
    it('should return true when user can access product', async () => {
      // Arrange
      const mockRole = {
        id: '3',
        user_id: 'user789',
        tabla: 'product',
        campo: 'id',
        valor: 'product789'
      };
      
      mockRolesAcDatosFindFirst.mockResolvedValue(mockRole);

      // Act
      const result = await canAccessProduct('user789', 'product789');

      // Assert
      expect(result).toBe(true);
      expect(mockRolesAcDatosFindFirst).toHaveBeenCalledWith({
        where: {
          user_id: 'user789',
          tabla: 'product',
          campo: 'id',
          valor: 'product789'
        }
      });
    });

    it('should return false when user cannot access product', async () => {
      // Arrange
      mockRolesAcDatosFindFirst.mockResolvedValue(null);

      // Act
      const result = await canAccessProduct('user789', 'product789');

      // Assert
      expect(result).toBe(false);
    });

    it('should handle empty parameters', async () => {
      // Arrange
      mockRolesAcDatosFindFirst.mockResolvedValue(null);

      // Act
        const result = await canAccessProduct('', '');

        // Assert
        expect(result).toBe(false);
        expect(mockRolesAcDatosFindFirst).toHaveBeenCalledWith({
          where: {
            user_id: '',
          tabla: 'product',
          campo: 'id',
          valor: ''
        }
      });
    });
  });
});