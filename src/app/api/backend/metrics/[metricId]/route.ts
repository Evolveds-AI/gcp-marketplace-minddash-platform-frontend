import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * PUT /api/backend/metrics/[metricId]
 * Actualiza una métrica existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { metricId: string } }
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

    // Verificar rol (case-insensitive)
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para actualizar métricas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      product_id,
      name,
      description,
      data_query,
      required_params,
      optional_params,
      unit,
      target_value,
      threshold_warning,
      threshold_critical,
      category,
      is_active
    } = body;

    // Validaciones
    if (name && name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre no puede estar vacío' },
        { status: 400 }
      );
    }

    // Validar data_query si se proporciona
    if (data_query !== undefined) {
      if (typeof data_query === 'string' && data_query.trim() === '') {
        return NextResponse.json(
          { success: false, message: 'El query de la métrica no puede estar vacío' },
          { status: 400 }
        );
      }
    }

    // Validar que product_id esté presente
    if (!product_id) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

    // Preparar payload para el backend Python
    const updatePayload = {
      id: params.metricId,
      product_id,
      name: name?.trim(),
      description: description?.trim(),
      data_query: data_query ? (typeof data_query === 'string' ? data_query : String(data_query)) : undefined,
      required_params,
      optional_params,
      unit,
      target_value,
      threshold_warning,
      threshold_critical,
      category,
      is_active
    };

    console.log('[Metrics Update] Payload que se enviará al backend:', JSON.stringify(updatePayload, null, 2));

    // Llamar al backend Python
    const result = await backendClient.updateMetric(updatePayload);


    return NextResponse.json({
      success: true,
      message: 'Métrica actualizada exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando métrica:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al actualizar métrica',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backend/metrics/[metricId]
 * Elimina una métrica existente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { metricId: string } }
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

    // Verificar rol (case-insensitive)
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para eliminar métricas' },
        { status: 403 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.deleteMetric({ id: params.metricId });


    return NextResponse.json({
      success: true,
      message: 'Métrica eliminada exitosamente',
      data: result
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al eliminar métrica',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
