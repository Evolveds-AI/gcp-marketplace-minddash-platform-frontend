import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/semantic/[configId]
 * Obtiene una configuración de semantic layer por ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { configId: string } }
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

    const result = await backendClient.getSemanticLayerConfigById({ config_id: params.configId });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error obteniendo configuración de semantic layer:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener configuración',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/backend/semantic/[configId]
 * Actualiza una configuración de semantic layer
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { configId: string } }
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
        { success: false, message: 'No tienes permisos para actualizar configuraciones de semantic layer' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      product_id,
      object_path_saved,
      bucket_name_saved,
      object_path_deployed,
      bucket_name_deployed
    } = body;

    if (!params.configId) {
      return NextResponse.json(
        { success: false, message: 'ID de configuración requerido' },
        { status: 400 }
      );
    }

    const result = await backendClient.updateSemanticLayerConfig({
      id: params.configId,
      product_id,
      object_path_saved: object_path_saved?.trim(),
      bucket_name_saved: bucket_name_saved?.trim(),
      object_path_deployed: object_path_deployed || null,
      bucket_name_deployed: bucket_name_deployed || null
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración de semantic layer actualizada exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando configuración de semantic layer:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al actualizar configuración',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backend/semantic/[configId]
 * Elimina una configuración de semantic layer
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { configId: string } }
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
        { success: false, message: 'No tienes permisos para eliminar configuraciones de semantic layer' },
        { status: 403 }
      );
    }

    if (!params.configId) {
      return NextResponse.json(
        { success: false, message: 'ID de configuración requerido' },
        { status: 400 }
      );
    }

    const result = await backendClient.deleteSemanticLayerConfig({ id: params.configId });

    return NextResponse.json({
      success: true,
      message: 'Configuración de semantic layer eliminada exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error eliminando configuración de semantic layer:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al eliminar configuración',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

