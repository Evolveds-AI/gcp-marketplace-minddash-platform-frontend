import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/users
 * Obtiene información general de un usuario
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
    const { user_id } = body;

    // Validaciones
    if (!user_id) {
      return NextResponse.json(
        { success: false, message: 'user_id es requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.getUserInfo(user_id);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error obteniendo información de usuario:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener información de usuario',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
