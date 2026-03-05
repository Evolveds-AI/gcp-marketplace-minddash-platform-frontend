export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const DASHBOARDS_API_URL =
  process.env.NEXT_PUBLIC_DASHBOARDS_API_URL ||
  'https://minddash-dashboards-api-dev-294493969622.us-central1.run.app';

/**
 * Proxy for the external dashboards API.
 * All requests to /api/dashboards-proxy/* are forwarded server-side
 * to the actual dashboards service, avoiding CORS issues when the
 * frontend runs on a different origin (e.g. localhost).
 */
async function proxyRequest(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = new URL(req.url);
  const search = url.search; // preserve query string
  const target = `${DASHBOARDS_API_URL}/${path}${search}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    accept: 'application/json',
  };

  // Forward Authorization header if present
  const auth = req.headers.get('authorization');
  if (auth) {
    headers['Authorization'] = auth;
  }

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      body = await req.text();
    } catch {
      // no body
    }
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: body || undefined,
    });

    const responseText = await upstream.text();

    return new NextResponse(responseText, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[dashboards-proxy] upstream error:', error?.message || error);
    return NextResponse.json(
      { error: 'Dashboards API unavailable', detail: error?.message },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
