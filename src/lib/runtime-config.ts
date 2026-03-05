/**
 * Runtime configuration fetcher — safe to import from both client and server code.
 * Does NOT depend on React hooks.
 */

export interface RuntimeConfig {
  backendApiUrl: string;
  dashboardsApiUrl: string;
  ragApiUrl: string;
  mindsdbServerUrl: string;
  environment: string;
}

export const defaultConfig: RuntimeConfig = {
  backendApiUrl: process.env.NEXT_PUBLIC_BACKEND_API_URL || '',
  dashboardsApiUrl: process.env.NEXT_PUBLIC_DASHBOARDS_API_URL || '',
  ragApiUrl: process.env.NEXT_PUBLIC_RAG_API_URL || '',
  mindsdbServerUrl: process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL || '',
  environment: process.env.NODE_ENV || 'development',
};

let cachedConfig: RuntimeConfig | null = null;
let fetchPromise: Promise<RuntimeConfig> | null = null;

export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  if (cachedConfig) return cachedConfig;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/config')
    .then((res) => (res.ok ? res.json() : defaultConfig))
    .then((data) => {
      cachedConfig = data;
      return data;
    })
    .catch(() => defaultConfig);

  return fetchPromise;
}
