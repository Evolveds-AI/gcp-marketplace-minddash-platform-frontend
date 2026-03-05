/**
 * When running in the browser, route through our own Next.js proxy
 * (/api/dashboards-proxy/*) to avoid CORS issues.
 * On the server side, call the upstream dashboards API directly.
 */
const SERVER_SIDE_URL =
  process.env.NEXT_PUBLIC_DASHBOARDS_API_URL ||
  'https://minddash-dashboards-api-dev-294493969622.us-central1.run.app';

function getDashboardsApiBase(): string {
  if (typeof window === 'undefined') return SERVER_SIDE_URL;
  // In the browser, proxy through our own origin to avoid CORS
  return '/api/dashboards-proxy';
}

function getClientAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('evolve-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.accessToken || null;
  } catch {
    return null;
  }
}

async function dashboardsRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getDashboardsApiBase();
  const url = `${base}${path}`;
  const token = getClientAccessToken();
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body,
  });

  let data: any = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const raw = data && (data.detail || data.message || data.error);
    const msg = typeof raw === 'string' ? raw : raw ? JSON.stringify(raw) : text || `Error ${response.status}`;
    console.error('dashboardsRequest error:', { status: response.status, statusText: response.statusText, data, text });
    throw new Error(msg);
  }

  return data as T;
}

export const dashboardsClient = {
  listDashboards(userId: string, productId: string) {
    const params = new URLSearchParams({ user_id: userId, product_id: productId });
    return dashboardsRequest<any[]>(`/dashboards?${params.toString()}`);
  },
  createDashboard(body: any) {
    return dashboardsRequest<any>(`/dashboards`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  getDashboard(dashboardId: string) {
    return dashboardsRequest<any>(`/dashboards/${dashboardId}`);
  },
  deleteDashboard(dashboardId: string) {
    return dashboardsRequest<any>(`/dashboards/${dashboardId}`, { method: 'DELETE' });
  },
  renderDashboard(dashboardId: string, format: 'json' | 'image' = 'json', values?: Record<string, unknown>) {
    const params = new URLSearchParams({ format });
    const body = values ? JSON.stringify(values) : undefined;
    return dashboardsRequest<any>(`/dashboards/${dashboardId}/render?${params.toString()}`, {
      method: 'POST',
      body,
    });
  },
};
