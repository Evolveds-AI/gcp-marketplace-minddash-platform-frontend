import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/organizations/user
 * Obtiene las organizaciones de un usuario específico
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

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: 'user_id es requerido' },
        { status: 400 }
      );
    }

    // Obtener organizaciones del usuario desde el backend Python
    const organizations = await backendClient.getOrganizationsByUser(user_id);

    return NextResponse.json({
      success: true,
      data: organizations
    });

  } catch (error: any) {
    console.error('[OrganizationsUser] Error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener organizaciones',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
