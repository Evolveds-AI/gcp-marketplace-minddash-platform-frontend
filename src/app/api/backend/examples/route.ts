export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  'https://backend-service-dev-minddash-294493969622.us-central1.run.app';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    const userRole = decoded.role?.toLowerCase();
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para listar ejemplos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ success: false, message: 'product_id es requerido' }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/prompts_and_examples/examples/getListExamplesByProduct`, {
      method: 'POST',
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ product_id: productId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      return NextResponse.json(
        {
          success: false,
          message: error?.detail || error?.message || 'Error al obtener ejemplos',
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );

  } catch (error: any) {
    console.error('Error en GET /api/backend/examples:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al obtener ejemplos',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
