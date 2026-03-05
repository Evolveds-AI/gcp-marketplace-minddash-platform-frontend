import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * PUT /api/backend/role-data-access/[roleAccessId]
 * Actualiza un rol de acceso a datos existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { roleAccessId: string } }
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

    // Verificar permisos (solo admin)
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para gestionar roles de acceso' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      product_id,
      name,
      table_names,
      data_access,
      metrics_access,
      priority_level
    } = body;

    // Validaciones
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'name es requerido' },
        { status: 400 }
      );
    }

    if (table_names !== undefined && table_names !== null && !Array.isArray(table_names)) {
      return NextResponse.json(
        { success: false, message: 'table_names debe ser un array de tablas si se envía' },
        { status: 400 }
      );
    }

    // Verificar si data_access tiene contenido (no es null, undefined, ni objeto vacío)
    const hasDataAccess = data_access && 
      typeof data_access === 'object' && 
      Object.keys(data_access).length > 0;

    // Llamar al backend Python
    const result = await backendClient.updateRoleDataAccess({
      id: params.roleAccessId,
      product_id: product_id || null,
      name,
      table_names: Array.isArray(table_names) ? table_names : [],
      data_access: hasDataAccess ? data_access : null,
      metrics_access: metrics_access || null,
      priority_level: priority_level || null
    });


    return NextResponse.json({
      success: true,
      message: 'Rol de acceso actualizado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando rol de acceso:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al actualizar rol de acceso',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backend/role-data-access/[roleAccessId]
 * Elimina un rol de acceso a datos
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roleAccessId: string } }
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

    // Verificar permisos (solo admin)
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para gestionar roles de acceso' },
        { status: 403 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.deleteRoleDataAccess(params.roleAccessId);


    return NextResponse.json({
      success: true,
      message: 'Rol de acceso eliminado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error eliminando rol de acceso:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al eliminar rol de acceso',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
