import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * PUT /api/backend/user-data-access/[accessId]
 * Actualiza un registro de acceso a datos de usuario existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { accessId: string } }
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

    console.log('🔐 Usuario autenticado:', decoded.username, 'Rol:', decoded.role);

    // Verificar permisos (solo admin) - case insensitive
    const userRole = decoded.role.toLowerCase();
    if (userRole !== 'admin') {
      console.error('❌ Permiso denegado. Rol del usuario:', decoded.role);
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para gestionar acceso a datos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      role_data_id,
      user_id,
      table_names,
      data_access,
      metrics_access
    } = body;

    // Validaciones
    if (!role_data_id) {
      return NextResponse.json(
        { success: false, message: 'role_data_id es requerido' },
        { status: 400 }
      );
    }

    console.log('📝 Actualizando User Data Access:', { id: params.accessId, role_data_id, user_id, table_names });

    // Verificar si data_access tiene contenido (no es null, undefined, ni objeto vacío)
    const hasDataAccess = data_access && 
      typeof data_access === 'object' && 
      Object.keys(data_access).length > 0;

    const payload = {
      id: params.accessId,
      role_data_id,
      user_id: user_id || null,
      table_names: table_names || null,
      data_access: hasDataAccess ? data_access : null,
      metrics_access: metrics_access || null
    };
    
    console.log('📤 Enviando payload a backend:', JSON.stringify(payload, null, 2));

    // Llamar al backend Python
    const result = await backendClient.updateUserDataAccess(payload);


    return NextResponse.json({
      success: true,
      message: 'Acceso de usuario actualizado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando acceso de usuario:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al actualizar acceso de usuario',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backend/user-data-access/[accessId]
 * Elimina un registro de acceso a datos de usuario
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { accessId: string } }
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

    console.log('🔐 Usuario autenticado:', decoded.username, 'Rol:', decoded.role);

    // Verificar permisos (solo admin) - case insensitive
    const userRole = decoded.role.toLowerCase();
    if (userRole !== 'admin') {
      console.error('❌ Permiso denegado. Rol del usuario:', decoded.role);
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para gestionar acceso a datos' },
        { status: 403 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.deleteUserDataAccess(params.accessId);


    return NextResponse.json({
      success: true,
      message: 'Acceso de usuario eliminado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error eliminando acceso de usuario:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al eliminar acceso de usuario',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
