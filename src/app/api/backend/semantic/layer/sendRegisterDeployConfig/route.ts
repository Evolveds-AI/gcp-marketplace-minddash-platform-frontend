import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';

/**
 * POST /api/backend/semantic/layer/sendRegisterDeployConfig
 * Proxy para registrar configuración de deploy en el backend Python
 */
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

    const body = await request.json();

    // Hacer request al backend Python
    const response = await fetch(`${BACKEND_URL}/semantic/layer/sendRegisterDeployConfig`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('[Proxy] Error en sendRegisterDeployConfig:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al registrar configuración de deploy',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
