import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * PUT /api/backend/connections/[connectionId]
 * Actualiza una conexión existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
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

    // Verificar permisos (solo admin o admin-client)
    // Verificar rol (case-insensitive)
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para actualizar conexiones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      organization_id,
      name,
      type,
      host,
      port,
      database,
      username,
      password,
      additional_params,
      description,
      is_active
    } = body;

    // Validaciones
    if (name && name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre no puede estar vacío' },
        { status: 400 }
      );
    }

    if (!organization_id) {
      return NextResponse.json(
        { success: false, message: 'organization_id es requerido' },
        { status: 400 }
      );
    }

    const normalizedType = type ? String(type).toLowerCase() : undefined;
    const params = (additional_params && typeof additional_params === 'object') ? additional_params : {};

    if (normalizedType === 'bigquery') {
      if (!params.project_id || !params.dataset) {
        return NextResponse.json(
          { success: false, message: 'project_id y dataset son requeridos para BigQuery' },
          { status: 400 }
        );
      }
    }

    if (normalizedType === 'redshift') {
      if (!params.schema) {
        return NextResponse.json(
          { success: false, message: 'schema es requerido para Redshift' },
          { status: 400 }
        );
      }
      const sslMode = (params.ssl_mode || params.sslmode || '').toString().toLowerCase();
      if (sslMode) {
        if (sslMode !== 'require' && sslMode !== 'verify-full') {
          return NextResponse.json(
            { success: false, message: 'ssl_mode debe ser require o verify-full para Redshift' },
            { status: 400 }
          );
        }
        (params as any).ssl_mode = sslMode;
        delete (params as any).sslmode;
      }
    }

    if (normalizedType === 'snowflake') {
      if (!params.server || !params.schema || !params.warehouse) {
        return NextResponse.json(
          { success: false, message: 'server, schema y warehouse son requeridos para Snowflake' },
          { status: 400 }
        );
      }
    }

    if (normalizedType === 'clickhouse') {
      const protocol = (params.protocol || '').toString().toLowerCase();
      if (protocol && protocol !== 'native' && protocol !== 'http') {
        return NextResponse.json(
          { success: false, message: 'protocol debe ser native o http para ClickHouse' },
          { status: 400 }
        );
      }
    }

    // Llamar al backend Python
    const result = await backendClient.updateConnection({
      id: params.connectionId,
      organization_id,
      name: name?.trim(),
      type: normalizedType,
      host,
      port,
      database,
      username,
      password,
      additional_params: Object.keys(params).length ? params : additional_params,
      description: description?.trim(),
      is_active
    });


    return NextResponse.json({
      success: true,
      message: 'Conexión actualizada exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando conexión:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al actualizar conexión',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backend/connections/[connectionId]
 * Elimina una conexión existente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
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

    // Verificar permisos (solo admin o admin-client)
    // Verificar rol (case-insensitive)
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para eliminar conexiones' },
        { status: 403 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.deleteConnection(params.connectionId);


    return NextResponse.json({
      success: true,
      message: 'Conexión eliminada exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error eliminando conexión:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al eliminar conexión',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
