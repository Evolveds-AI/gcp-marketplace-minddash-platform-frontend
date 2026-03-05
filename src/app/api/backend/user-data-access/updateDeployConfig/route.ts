import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/backend/user-data-access/updateDeployConfig
 * Actualiza una configuración de despliegue existente (incluyendo gs_profiling_agent para capa semántica)
 */
export async function PUT(request: NextRequest) {
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

    // Verificar permisos
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para actualizar configuraciones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, product_id, ...updateFields } = body;

    if (!id || !product_id) {
      return NextResponse.json(
        { success: false, message: 'Se requieren id y product_id' },
        { status: 400 }
      );
    }

    const result = await backendClient.updateDeployConfig({
      id,
      product_id,
      ...updateFields
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración de despliegue actualizada exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('[Proxy] Error actualizando configuración de despliegue:', error);
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
