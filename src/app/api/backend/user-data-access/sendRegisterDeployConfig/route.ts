import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/user-data-access/sendRegisterDeployConfig
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
    const result = await backendClient.registerDeployConfig(body);

    return NextResponse.json({ success: true, data: result }, { status: 201 });

  } catch (error: any) {
    console.error('Error registrando deploy config:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al registrar configuración de deploy',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      { status: 500 }
    );
  }
}
