export async function postBackend<T = any>(path: string, body: any): Promise<{ ok: boolean; status: number; data: T | null; error: any | null }>{
  try {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      return { ok: false, status: 401, data: null, error: 'No auth' };
    }
    const token = JSON.parse(authData).accessToken;

    const res = await fetch(`/api/backend${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, status: res.status, data: null, error: json || res.statusText };
    }
    return { ok: true, status: res.status, data: json, error: null };
  } catch (e: any) {
    return { ok: false, status: 0, data: null, error: e?.message || e };
  }
}
