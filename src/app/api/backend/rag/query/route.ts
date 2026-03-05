import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const RAG_BASE_URL =
  process.env.NEXT_PUBLIC_RAG_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token requerido' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || !body.product_id || !Array.isArray(body.queries)) {
      return NextResponse.json(
        { success: false, message: 'Body inválido: se requiere product_id y queries (array)' },
        { status: 400 }
      );
    }

    const backendUrl = `${RAG_BASE_URL}/query`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? null, { status: response.status });
  } catch (error: any) {
    console.error('[RAG] Error ejecutando query RAG:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Error al ejecutar query RAG',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
