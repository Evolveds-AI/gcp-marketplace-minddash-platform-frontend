import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/metrics/upload
 * Sube métricas a GCS en formato YAML (con estructura completa en el body)
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
    const { version, product, metrics_name, description, metrics_content, bucket_name, object_path } = body;

    // Validar campos requeridos
    if (!version || !product || !metrics_name || !description || !metrics_content || !bucket_name || !object_path) {
      return NextResponse.json(
        { success: false, message: 'Faltan campos requeridos: version, product, metrics_name, description, metrics_content, bucket_name, object_path' },
        { status: 400 }
      );
    }

    // Validar que metrics_content sea un array
    if (!Array.isArray(metrics_content) || metrics_content.length === 0) {
      return NextResponse.json(
        { success: false, message: 'metrics_content debe ser un array no vacío' },
        { status: 400 }
      );
    }

    // Validar estructura de cada métrica
    for (const metric of metrics_content) {
      if (!metric.name_metrics || !metric.sql_template) {
        return NextResponse.json(
          { success: false, message: 'Cada métrica debe tener name_metrics y sql_template' },
          { status: 400 }
        );
      }
    }

    // Llamar al backend Python
    const result = await backendClient.uploadMetricsYaml({
      version,
      product,
      metrics_name,
      description,
      metrics_content,
      bucket_name,
      object_path
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error subiendo métricas YAML:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al subir métricas YAML',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
