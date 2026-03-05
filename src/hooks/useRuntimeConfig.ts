'use client';

import { useState, useEffect } from 'react';
import { fetchRuntimeConfig, defaultConfig } from '@/lib/runtime-config';
import type { RuntimeConfig } from '@/lib/runtime-config';

/**
 * Hook to get runtime configuration.
 * Falls back to NEXT_PUBLIC_* build-time values if the API is unavailable.
 * Caches the result so only one fetch per session.
 */
export function useRuntimeConfig() {
  const [config, setConfig] = useState<RuntimeConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRuntimeConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  return { config, loading };
}

// Re-export for backward compatibility
export { fetchRuntimeConfig, defaultConfig };
export type { RuntimeConfig };
