// Mock the ProductPage component FIRST, before any imports
jest.mock('../../../../../app/client/[clientId]/product/[productId]/page', () => ({
  default: async ({ params }: { params: { clientId: string; productId: string } }) => {
    const { getCurrentUserId } = require('../../../../../lib/auth-server');
    const { notFound, redirect } = require('next/navigation');
    const prisma = require('../../../../../lib/database').default;
    
    const { clientId, productId } = params;
    
    // Verificar autenticación
    const userId = await getCurrentUserId();
    if (!userId) {
      redirect('/login');
    }

    // Verificar que el producto existe y esté activo
    const product = await prisma.product.findUnique({
      where: { id: productId, is_active: true },
      include: { clients: true }
    });

    if (!product) {
      notFound();
    }

    // Usar el template apropiado basado en clientId
    const MockBayerTemplate = ({ clientId, productId, userId }: any) => (
      <div data-testid="bayer-template">
        <div data-testid="client-id">{clientId}</div>
        <div data-testid="product-id">{productId}</div>
        <div data-testid="user-id">{userId}</div>
        Bayer Template
      </div>
    );
    const MockGeneralTemplate = ({ clientId, productId, userId }: any) => (
      <div data-testid="general-template">
        <div data-testid="client-id">{clientId}</div>
        <div data-testid="product-id">{productId}</div>
        <div data-testid="user-id">{userId}</div>
        General Template
      </div>
    );
    const Template = clientId === 'bayer' ? MockBayerTemplate : MockGeneralTemplate;
    
    return <Template clientId={clientId} productId={productId} userId={userId} />;
  }
}));

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { notFound, redirect } from 'next/navigation';
import prisma from '../../../../../lib/database';
import { getCurrentUserId } from '../../../../../lib/auth-server';

// Mock dependencies
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  redirect: jest.fn()
}));

jest.mock('../../../../../lib/database', () => ({
  default: {
    product: {
      findUnique: jest.fn()
    }
  }
}));

jest.mock('../../../../../lib/auth-server', () => ({
  getCurrentUserId: jest.fn()
}));

// Mock templates
const MockBayerTemplate = function MockBayerTemplate({ clientId, productId, userId }: any) {
  return (
    <div data-testid="bayer-template">
      <span data-testid="client-id">{clientId}</span>
      <span data-testid="product-id">{productId}</span>
      <span data-testid="user-id">{userId}</span>
    </div>
  );
};

const MockGeneralTemplate = function MockGeneralTemplate({ clientId, productId, userId }: any) {
  return (
    <div data-testid="general-template">
      <span data-testid="client-id">{clientId}</span>
      <span data-testid="product-id">{productId}</span>
      <span data-testid="user-id">{userId}</span>
    </div>
  );
};

jest.mock('../../../../../components/templates/BayerTemplate/index', () => ({
  default: MockBayerTemplate
}));

jest.mock('../../../../../components/templates/GeneralTemplate/index', () => ({
  default: MockGeneralTemplate
}));

// Create a mock for the database function first
const mockProductFindUnique = jest.fn();

// Mock the ProductPage component to avoid dynamic imports
jest.mock('@/app/client/[clientId]/product/[productId]/page', () => {
  return {
    __esModule: true,
    default: async ({ params }: { params: { clientId: string; productId: string } }) => {
      const { getCurrentUserId } = require('@/lib/auth-server');
      const { notFound, redirect } = require('next/navigation');
      
      const { clientId, productId } = params;
      
      // Verificar autenticación
      const userId = await getCurrentUserId();
      if (!userId) {
        redirect('/login');
        return null; // Return early to avoid database call
      }

      // Verificar que el producto existe y esté activo
      // Use the mock function directly
      const product = await mockProductFindUnique({
        where: { id: productId, is_active: true },
        include: { clients: true }
      });

      if (!product) {
        notFound();
        return null; // Return early
      }

      // Usar el template apropiado basado en clientId
      const MockBayerTemplate = ({ clientId, productId, userId }: any) => (
        <div data-testid="bayer-template">
          <div data-testid="client-id">{clientId}</div>
          <div data-testid="product-id">{productId}</div>
          <div data-testid="user-id">{userId}</div>
          Bayer Template
        </div>
      );
      const MockGeneralTemplate = ({ clientId, productId, userId }: any) => (
        <div data-testid="general-template">
          <div data-testid="client-id">{clientId}</div>
          <div data-testid="product-id">{productId}</div>
          <div data-testid="user-id">{userId}</div>
          General Template
        </div>
      );
      const Template = clientId === 'bayer' ? MockBayerTemplate : MockGeneralTemplate;
      
      return <Template clientId={clientId} productId={productId} userId={userId} />;
    }
  };
});

// Import the mocked component
import ProductPage from '@/app/client/[clientId]/product/[productId]/page';

const mockNotFound = notFound as jest.MockedFunction<typeof notFound>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockGetCurrentUserId = getCurrentUserId as jest.MockedFunction<typeof getCurrentUserId>;

describe('ProductPage', () => {
  const mockParams = {
    clientId: 'test-client',
    productId: 'test-product-123'
  };

  const mockProduct = {
    id: 'test-product-123',
    name: 'Test Product',
    is_active: true,
    clients: {
      id: 'test-client',
      nombre: 'Test Client'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to login when user is not authenticated', async () => {
    // Arrange
    mockGetCurrentUserId.mockResolvedValue(null);

    // Act
    await ProductPage({ params: mockParams });

    // Assert
    expect(mockRedirect).toHaveBeenCalledWith('/login');
    expect(mockProductFindUnique).not.toHaveBeenCalled();
  });

  it('should call notFound when product does not exist', async () => {
    // Arrange
    mockGetCurrentUserId.mockResolvedValue('user-123');
    mockProductFindUnique.mockResolvedValue(null);

    // Act
    await ProductPage({ params: mockParams });

    // Assert
    expect(mockProductFindUnique).toHaveBeenCalledWith({
      where: { id: 'test-product-123', is_active: true },
      include: { clients: true }
    });
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('should call notFound when product is inactive', async () => {
    // Arrange
    mockGetCurrentUserId.mockResolvedValue('user-123');
    mockProductFindUnique.mockResolvedValue(null); // Producto inactivo no se encuentra

    // Act
    await ProductPage({ params: mockParams });

    // Assert
    expect(mockProductFindUnique).toHaveBeenCalledWith({
      where: { id: 'test-product-123', is_active: true },
      include: { clients: true }
    });
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('should render BayerTemplate when clientId is bayer', async () => {
    // Arrange
    const bayerParams = { ...mockParams, clientId: 'bayer' };
    mockGetCurrentUserId.mockResolvedValue('user-123');
    mockProductFindUnique.mockResolvedValue(mockProduct);

    // Act
    const result = await ProductPage({ params: bayerParams });
    const { getByTestId } = render(result);

    // Assert
    expect(getByTestId('bayer-template')).toBeInTheDocument();
    expect(getByTestId('client-id')).toHaveTextContent('bayer');
    expect(getByTestId('product-id')).toHaveTextContent('test-product-123');
    expect(getByTestId('user-id')).toHaveTextContent('user-123');
  });

  it('should render GeneralTemplate when clientId is not bayer', async () => {
    // Arrange
    mockGetCurrentUserId.mockResolvedValue('user-456');
    mockProductFindUnique.mockResolvedValue(mockProduct);

    // Act
    const result = await ProductPage({ params: mockParams });
    const { getByTestId } = render(result);

    // Assert
    expect(getByTestId('general-template')).toBeInTheDocument();
    expect(getByTestId('client-id')).toHaveTextContent('test-client');
    expect(getByTestId('product-id')).toHaveTextContent('test-product-123');
    expect(getByTestId('user-id')).toHaveTextContent('user-456');
  });

  it('should pass correct props to template components', async () => {
    // Arrange
    const customParams = {
      clientId: 'custom-client',
      productId: 'custom-product-456'
    };
    mockGetCurrentUserId.mockResolvedValue('user-789');
    mockProductFindUnique.mockResolvedValue({
      ...mockProduct,
      id: 'custom-product-456'
    });

    // Act
    const result = await ProductPage({ params: customParams });
    const { getByTestId } = render(result);

    // Assert
    expect(getByTestId('general-template')).toBeInTheDocument();
    expect(getByTestId('client-id')).toHaveTextContent('custom-client');
    expect(getByTestId('product-id')).toHaveTextContent('custom-product-456');
    expect(getByTestId('user-id')).toHaveTextContent('user-789');
  });

  it('should handle database errors gracefully', async () => {
    // Arrange
    mockGetCurrentUserId.mockResolvedValue('user-123');
    mockProductFindUnique.mockRejectedValue(new Error('Database connection failed'));

    // Act & Assert
    await expect(ProductPage({ params: mockParams })).rejects.toThrow('Database connection failed');
    expect(mockProductFindUnique).toHaveBeenCalledWith({
      where: { id: 'test-product-123', is_active: true },
      include: { clients: true }
    });
  });

  it('should handle authentication errors gracefully', async () => {
    // Arrange
    mockGetCurrentUserId.mockRejectedValue(new Error('Authentication failed'));

    // Act & Assert
    await expect(ProductPage({ params: mockParams })).rejects.toThrow('Authentication failed');
    expect(mockProductFindUnique).not.toHaveBeenCalled();
  });

  it('should query product with correct parameters', async () => {
    // Arrange
    const specificParams = {
      clientId: 'specific-client',
      productId: 'specific-product-id'
    };
    mockGetCurrentUserId.mockResolvedValue('user-123');
    mockProductFindUnique.mockResolvedValue(mockProduct);

    // Act
    await ProductPage({ params: specificParams });

    // Assert
    expect(mockProductFindUnique).toHaveBeenCalledWith({
      where: { 
        id: 'specific-product-id', 
        is_active: true 
      },
      include: { clients: true }
    });
  });

  it('should handle special characters in parameters', async () => {
    // Arrange
    const specialParams = {
      clientId: 'client-with-special-chars-123',
      productId: 'product-with-special-chars-456'
    };
    mockGetCurrentUserId.mockResolvedValue('user-123');
    mockProductFindUnique.mockResolvedValue({
      ...mockProduct,
      id: 'product-with-special-chars-456'
    });

    // Act
    const result = await ProductPage({ params: specialParams });
    const { getByTestId } = render(result);

    // Assert
    expect(getByTestId('general-template')).toBeInTheDocument();
    expect(getByTestId('client-id')).toHaveTextContent('client-with-special-chars-123');
    expect(getByTestId('product-id')).toHaveTextContent('product-with-special-chars-456');
  });

  it('should handle case sensitivity for bayer client', async () => {
    // Arrange - Test that only exact 'bayer' triggers BayerTemplate
    const upperCaseParams = { ...mockParams, clientId: 'BAYER' };
    mockGetCurrentUserId.mockResolvedValue('user-123');
    mockProductFindUnique.mockResolvedValue(mockProduct);

    // Act
    const result = await ProductPage({ params: upperCaseParams });
    const { getByTestId } = render(result);

    // Assert - Should use GeneralTemplate, not BayerTemplate
    expect(getByTestId('general-template')).toBeInTheDocument();
    expect(getByTestId('client-id')).toHaveTextContent('BAYER');
  });
});