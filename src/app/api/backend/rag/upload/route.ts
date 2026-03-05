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

    const productId = request.nextUrl.searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      return NextResponse.json(
        { success: false, message: 'product_id debe ser un UUID válido' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'El archivo (file) es requerido' },
        { status: 400 }
      );
    }

    const backendUrl = `${RAG_BASE_URL}/upload?product_id=${encodeURIComponent(productId)}`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData as any,
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? null, { status: response.status });
  } catch (error: any) {
    console.error('[RAG] Error subiendo documento:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Error al subir documento',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
