import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * PUT /api/backend/deploys/[deployId]
 * Actualiza una configuración de despliegue existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { deployId: string } }
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
        { success: false, message: 'No tienes permisos para actualizar configuraciones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      environment,
      deploy_url,
      api_endpoint,
      config_json,
      version,
      is_active
    } = body;

    // Llamar al backend Python
    const result = await backendClient.updateDeployConfig({
      id: params.deployId,
      environment,
      deploy_url,
      api_endpoint,
      config_json,
      version,
      is_active
    });


    return NextResponse.json({
      success: true,
      message: 'Configuración de despliegue actualizada exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando configuración:', error);
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
 * DELETE /api/backend/deploys/[deployId]
 * Elimina una configuración de despliegue
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { deployId: string } }
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
        { success: false, message: 'No tienes permisos para eliminar configuraciones' },
        { status: 403 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.deleteDeployConfig(params.deployId);


    return NextResponse.json({
      success: true,
      message: 'Configuración de despliegue eliminada exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error eliminando configuración:', error);
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
