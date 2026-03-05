import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/role-data-access/by-product
 * Obtiene la lista de roles de acceso a datos de un producto específico
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
    const { product_id } = body;

    if (!product_id) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    let result;
    try {
      result = await backendClient.getRolesDataAccessByProduct(product_id);
    } catch (error: any) {
      const message = error?.message || '';
      if (
        message.includes('RoleDataAccessByProduct') &&
        message.includes('role_metrics_access') &&
        message.includes('list_type')
      ) {
        return NextResponse.json({
          success: true,
          data: []
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error obteniendo roles de acceso por producto:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener roles de acceso',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
