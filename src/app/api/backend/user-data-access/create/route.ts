import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/user-data-access/create
 * Crea un nuevo registro de acceso a datos para un usuario (RLS)
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

    // Verificar permisos (solo admin) - case insensitive
    const userRole = decoded.role.toLowerCase();
    if (userRole !== 'admin') {
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

    // Llamar al backend Python
    // Verificar si data_access tiene contenido (no es null, undefined, ni objeto vacío)
    const hasDataAccess = data_access && 
      typeof data_access === 'object' && 
      Object.keys(data_access).length > 0;
    
    const payload = {
      role_data_id,
      user_id: user_id || null,
      table_names: table_names || null,
      data_access: hasDataAccess ? data_access : null,
      metrics_access: metrics_access || null
    };
    
    console.log('📤 Enviando payload a backend:', JSON.stringify(payload, null, 2));
    
    const result = await backendClient.createUserDataAccess(payload);


    return NextResponse.json({
      success: true,
      message: 'Acceso de usuario creado exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creando acceso de usuario:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear acceso de usuario',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
