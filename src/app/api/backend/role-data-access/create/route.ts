import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/role-data-access/create
 * Crea un nuevo rol de acceso a datos (RLS/CLS por rol)
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
      metrics_access
    } = body;

    // Validaciones
    if (!product_id) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

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
    const result = await backendClient.createRoleDataAccess({
      product_id,
      name,
      table_names: Array.isArray(table_names) ? table_names : [],
      data_access: hasDataAccess ? data_access : null,
      metrics_access: metrics_access || null
    });


    return NextResponse.json({
      success: true,
      message: 'Rol de acceso creado exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creando rol de acceso:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear rol de acceso',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
