import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/metrics/upload-by-product
 * Sube métricas a GCS en formato YAML (cargadas desde BD por product_id)
 * Solo admin y admin-client
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
        { success: false, message: 'No tienes permisos para subir métricas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { product_id, bucket_name, object_path } = body;

    // Validar campos requeridos
    if (!product_id || !bucket_name || !object_path) {
      return NextResponse.json(
        { success: false, message: 'Faltan campos requeridos: product_id, bucket_name, object_path' },
        { status: 400 }
      );
    }

    // Validar formato UUID del product_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(product_id)) {
      return NextResponse.json(
        { success: false, message: 'product_id debe ser un UUID válido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.uploadMetricsByProduct({
      product_id,
      bucket_name,
      object_path
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error subiendo métricas por producto:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al subir métricas por producto',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
