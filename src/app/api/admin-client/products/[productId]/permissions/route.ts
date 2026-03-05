import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { isAdminClientReadRole } from '@/lib/utils/admin-client-role';

/**
 * GET /api/admin-client/products/[productId]/permissions
 * Obtiene todos los permisos de un producto con información de usuarios y roles
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
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

    const { productId } = params;

    // Obtener permisos con información de usuarios y roles
    const permissions = await prisma.access_user_product.findMany({
      where: {
        product_id: productId
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        roles: {
          select: {
            id: true,
            name: true,
            type_role: true,
            description: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Formatear datos
    const formattedPermissions = permissions.map(permission => ({
      id: permission.id,
      user_id: permission.user_id,
      product_id: permission.product_id,
      role_id: permission.role_id || '',
      userName: permission.users?.username || 'Usuario desconocido',
      userEmail: permission.users?.email || '',
      roleName: permission.roles?.name || 'Sin rol',
      roleDescription: permission.roles?.description || '',
      created_at: permission.created_at.toISOString(),
      updated_at: permission.updated_at?.toISOString() || null
    }));

    return NextResponse.json({
      success: true,
      permissions: formattedPermissions
    });

  } catch (error: any) {
    console.error('Error obteniendo permisos:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener permisos',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
