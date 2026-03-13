export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

const RAG_BASE_URL =
  process.env.NEXT_PUBLIC_RAG_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  'http://localhost:8000';

export async function GET(request: NextRequest) {
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

    const productId = request.nextUrl.searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

    const backendUrl = `${RAG_BASE_URL}/documents?product_id=${encodeURIComponent(productId)}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? null, { status: response.status });
  } catch (error: any) {
    console.error('[RAG] Error listando documentos RAG:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Error al listar documentos',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
