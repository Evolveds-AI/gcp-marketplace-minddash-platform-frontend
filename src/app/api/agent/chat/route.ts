import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || '';

const fetchWithRetry = async (url: string, init: RequestInit, maxAttempts = 3) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status >= 500 && res.status <= 599 && attempt < maxAttempts) {
        const delayMs = attempt === 1 ? 500 : attempt === 2 ? 1500 : 3000;
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return res;
    } catch (e) {
      lastError = e;
      if (attempt < maxAttempts) {
        const delayMs = attempt === 1 ? 500 : attempt === 2 ? 1500 : 3000;
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
};

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, isError: true, reply: 'Token requerido', error: 'Token requerido' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, isError: true, reply: 'Token inválido', error: 'Token inválido' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const upstreamRes = await fetchWithRetry(AGENT_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const upstreamText = await upstreamRes.text();
    let upstreamData: any = null;

    if (upstreamText) {
      try {
        upstreamData = JSON.parse(upstreamText);
      } catch {
        upstreamData = upstreamText;
      }
    }

    if (upstreamRes.ok) {
      return NextResponse.json(upstreamData ?? {});
    }

    const errorSnippet = typeof upstreamData === 'string' ? upstreamData.slice(0, 1200) : JSON.stringify(upstreamData).slice(0, 1200);

    return NextResponse.json({
      isError: true,
      reply: 'El servicio está temporalmente no disponible debido a mantenimiento o alta carga. Por favor, intenta de nuevo en unos momentos.',
      error: `Upstream ${upstreamRes.status} ${upstreamRes.statusText}: ${errorSnippet}`,
      upstreamStatus: upstreamRes.status,
      upstreamStatusText: upstreamRes.statusText,
    });
  } catch (error: any) {
    const message = error?.name === 'AbortError' ? 'Timeout al llamar al servicio externo' : (error?.message || 'Error interno del proxy de chat');

    return NextResponse.json({
      isError: true,
      reply: 'El servicio está temporalmente no disponible debido a mantenimiento o alta carga. Por favor, intenta de nuevo en unos momentos.',
      error: message,
    });
  }
}
