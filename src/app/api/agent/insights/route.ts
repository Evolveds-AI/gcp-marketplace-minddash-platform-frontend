import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { agentInsightsUrl } from '@/lib/utils/endpoints';

export const maxDuration = 300;

const fetchWithRetry = async (url: string, init: RequestInit, maxAttempts = 2) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[insights-proxy] Attempt ${attempt}/${maxAttempts} → ${url}`);
      const res = await fetch(url, init);
      console.log(`[insights-proxy] Attempt ${attempt} response: ${res.status} ${res.statusText}`);
      if (res.status >= 500 && res.status <= 599 && attempt < maxAttempts) {
        const delayMs = 5000;
        console.log(`[insights-proxy] 5xx, retrying in ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return res;
    } catch (e) {
      lastError = e;
      console.error(`[insights-proxy] Attempt ${attempt} error:`, (e as Error)?.message);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 5000));
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

    console.log('[insights-proxy] Request body keys:', Object.keys(body));
    console.log('[insights-proxy] client:', body.client, '| product_id:', body.product_id, '| user_id:', body.user_id);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    const upstreamRes = await fetchWithRetry(agentInsightsUrl, {
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

    const errorSnippet =
      typeof upstreamData === 'string'
        ? upstreamData.slice(0, 1200)
        : JSON.stringify(upstreamData).slice(0, 1200);

    console.error('[insights-proxy] Upstream error:', upstreamRes.status, errorSnippet);

    // Extract detail from upstream error if available (FastAPI returns {detail: "..."})
    const upstreamDetail = typeof upstreamData === 'object' && upstreamData?.detail
      ? String(upstreamData.detail)
      : '';

    let userMessage: string;
    if (upstreamRes.status === 500) {
      userMessage = 'El servicio de análisis no está disponible en este momento. Por favor intenta de nuevo en unos minutos.';
    } else if (upstreamRes.status === 422) {
      userMessage = 'Hubo un problema con los datos de configuración del producto. Contacta al administrador.';
    } else if (upstreamRes.status === 502 || upstreamRes.status === 503) {
      userMessage = 'El servicio de análisis está en mantenimiento. Por favor intenta de nuevo en unos minutos.';
    } else {
      userMessage = 'No fue posible completar el análisis. Por favor intenta de nuevo.';
    }

    return NextResponse.json({
      isError: true,
      reply: userMessage,
      error: `Upstream ${upstreamRes.status} ${upstreamRes.statusText}: ${errorSnippet}`,
      upstreamStatus: upstreamRes.status,
      upstreamStatusText: upstreamRes.statusText,
      upstreamDetail,
    });
  } catch (error: any) {
    const message =
      error?.name === 'AbortError'
        ? 'Timeout al llamar al servicio externo'
        : error?.message || 'Error interno del proxy de insights';

    return NextResponse.json({
      isError: true,
      reply: 'El servicio está temporalmente no disponible debido a mantenimiento o alta carga. Por favor, intenta de nuevo en unos momentos.',
      error: message,
    });
  }
}
