import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccess } from '@/hooks/useAccess';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial state correctly', () => {
    // Act
    const { result } = renderHook(() => 
      useAccess('user123', 'product', 'id', 'product123'),
      { wrapper: createWrapper() }
    );

    // Assert
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasAccess).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should set hasAccess when API returns access granted', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasAccess: true })
    });

    // Act
    const { result } = renderHook(() => 
      useAccess('user123', 'product', 'id', 'product123'),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAccess).toBe(true);
    expect(result.current.error).toBe(null);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/access/check?userId=user123&tabla=product&campo=id&valor=product123'
    );
  });

  it('should set hasAccess when API returns access denied', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasAccess: false })
    });

    // Act
    const { result } = renderHook(() => 
      useAccess('user456', 'product', 'id', 'product456'),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAccess).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle API error response', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    // Act
    const { result } = renderHook(() => 
      useAccess('user123', 'product', 'id', 'product123'),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAccess).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should handle network error', async () => {
    // Arrange
    const networkError = new Error('Network error');
    mockFetch.mockRejectedValueOnce(networkError);

    // Act
    const { result } = renderHook(() => 
      useAccess('user123', 'product', 'id', 'product123'),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAccess).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should handle malformed API response', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invalidProperty: true })
    });

    // Act
    const { result } = renderHook(() => 
      useAccess('user123', 'product', 'id', 'product123'),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAccess).toBe(false); // Should default to false for invalid response
    expect(result.current.error).toBe(null);
  });

  it('should make API call even when parameters are empty', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasAccess: false })
    });

    // Act
    const { result } = renderHook(() => 
      useAccess('', 'product', 'id', 'product123'),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/access/check?userId=&tabla=product&campo=id&valor=product123'
    );
  });

  it('should refetch when parameters change', async () => {
    // Arrange
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hasAccess: true })
    });

    // Act
    const { result, rerender } = renderHook(
      ({ userId, tabla, campo, valor }) => useAccess(userId, tabla, campo, valor),
      {
        wrapper: createWrapper(),
        initialProps: {
          userId: 'user123',
          tabla: 'product',
          campo: 'id',
          valor: 'product123'
        }
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Change parameters
    rerender({
      userId: 'user456',
      tabla: 'product',
      campo: 'id',
      valor: 'product456'
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/access/check?userId=user456&tabla=product&campo=id&valor=product456'
    );
  });

  it('should handle special characters in parameters', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasAccess: true })
    });

    // Act
    const { result } = renderHook(() => 
      useAccess('user@123', 'product-table', 'field_name', 'value with spaces'),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/access/check?userId=user@123&tabla=product-table&campo=field_name&valor=value with spaces'
    );
  });
});