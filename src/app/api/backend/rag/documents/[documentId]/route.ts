import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

const RAG_BASE_URL =
  process.env.NEXT_PUBLIC_RAG_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  'http://localhost:8000';

interface RouteParams {
  params: {
    documentId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { documentId } = params;

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: 'documentId es requerido' },
        { status: 400 }
      );
    }

    const backendUrl = `${RAG_BASE_URL}/documents/${encodeURIComponent(documentId)}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? null, { status: response.status });
  } catch (error: any) {
    console.error('[RAG] Error obteniendo detalle de documento:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Error al obtener detalle de documento',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { documentId } = params;

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: 'documentId es requerido' },
        { status: 400 }
      );
    }

    const backendUrl = `${RAG_BASE_URL}/documents/${encodeURIComponent(documentId)}`;

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? null, { status: response.status });
  } catch (error: any) {
    console.error('[RAG] Error eliminando documento:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Error al eliminar documento',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
