import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/metrics/create
 * Registra una nueva métrica de negocio
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

    // Verificar rol (case-insensitive)
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para crear métricas' },
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
    if (!product_id) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre de la métrica es requerido' },
        { status: 400 }
      );
    }

    if (!data_query || (typeof data_query === 'string' && data_query.trim() === '')) {
      return NextResponse.json(
        { success: false, message: 'El query de la métrica es requerido y no puede estar vacío' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.createMetric({
      product_id,
      name: name.trim(),
      description: description?.trim() || '',
      data_query: typeof data_query === 'string' ? data_query : String(data_query),
      required_params,
      optional_params,
      unit,
      target_value,
      threshold_warning,
      threshold_critical,
      category,
      is_active: is_active ?? true
    });


    return NextResponse.json({
      success: true,
      message: 'Métrica creada exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear métrica',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
