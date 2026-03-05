import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { isAdminClientReadRole } from '@/lib/utils/admin-client-role';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin-client/roles
 * Obtiene todos los roles disponibles
 */
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

    if (!isAdminClientReadRole(decoded.role)) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    // Obtener todos los roles
    const roles = await prisma.roles.findMany({
      select: {
        id: true,
        name: true,
        type_role: true,
        description: true,
        created_at: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      roles
    });

  } catch (error: any) {
    console.error('Error obteniendo roles:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener roles',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
