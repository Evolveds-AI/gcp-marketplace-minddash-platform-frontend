import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/user-data-access/by-role
 * Obtiene la lista de accesos de datos de usuario de un rol específico
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
    const { role_id } = body;

    if (!role_id) {
      return NextResponse.json(
        { success: false, message: 'role_id es requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.getUserDataAccessByRole(role_id);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error obteniendo acceso por rol:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener acceso por rol',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
