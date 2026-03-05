'use client';

// Simple in-memory cache with TTL support
class MemoryCache {
  private cache = new Map<string, { value: any; expiry: number }>();
  private defaultTTL: number;

  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, item] of entries) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
export const globalCache = new MemoryCache();

// Cache with localStorage persistence
class PersistentCache {
  private memoryCache: MemoryCache;
  private storageKey: string;

  constructor(storageKey = 'app_cache', defaultTTL = 24 * 60 * 60 * 1000) { // 24 hours default
    this.memoryCache = new MemoryCache(defaultTTL);
    this.storageKey = storageKey;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([key, item]: [string, any]) => {
          if (item.expiry > Date.now()) {
            this.memoryCache.set(key, item.value, item.expiry - Date.now());
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data: Record<string, any> = {};
      const stats = this.memoryCache.getStats();
      
      stats.keys.forEach(key => {
        const value = this.memoryCache.get(key);
        if (value !== null) {
          data[key] = {
            value,
            expiry: Date.now() + 24 * 60 * 60 * 1000 // Reset TTL for storage
          };
        }
      });
      
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  set(key: string, value: any, ttl?: number): void {
    this.memoryCache.set(key, value, ttl);
    this.saveToStorage();
  }

  get(key: string): any | null {
    return this.memoryCache.get(key);
  }

  has(key: string): boolean {
    return this.memoryCache.has(key);
  }

  delete(key: string): boolean {
    const result = this.memoryCache.delete(key);
    this.saveToStorage();
    return result;
  }

  clear(): void {
    this.memoryCache.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}

// Persistent cache instance
export const persistentCache = new PersistentCache();

// Cache decorator for functions
export function cached<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
    cache?: MemoryCache;
  } = {}
): T {
  const {
    keyGenerator = (...args) => JSON.stringify(args),
    ttl,
    cache = globalCache
  } = options;

  return ((...args: Parameters<T>) => {
    const key = `fn_${fn.name}_${keyGenerator(...args)}`;
    
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result, ttl);
    return result;
  }) as T;
}

// React hook for cached API calls
export function useCachedFetch<T>(
  url: string,
  options: RequestInit = {},
  cacheOptions: { ttl?: number; key?: string } = {}
) {
  const { ttl = 5 * 60 * 1000, key } = cacheOptions; // 5 minutes default
  const cacheKey = key || `fetch_${url}_${JSON.stringify(options)}`;

  // Check cache first
  const cachedData = globalCache.get(cacheKey);
  if (cachedData) {
    return {
      data: cachedData as T,
      loading: false,
      error: null,
      refetch: () => {}
    };
  }

  // If not in cache, you would typically use a data fetching library here
  // This is a simplified example
  return {
    data: null,
    loading: true,
    error: null,
    refetch: () => {}
  };
}

// Cleanup function to run periodically
export function startCacheCleanup(interval = 10 * 60 * 1000) { // 10 minutes
  if (typeof window === 'undefined') return;
  
  const cleanup = () => {
    globalCache.cleanup();
  };
  
  const intervalId = setInterval(cleanup, interval);
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
  
  return () => {
    clearInterval(intervalId);
    window.removeEventListener('beforeunload', cleanup);
  };
}

// Initialize cache cleanup when module loads
if (typeof window !== 'undefined') {
  startCacheCleanup();
}