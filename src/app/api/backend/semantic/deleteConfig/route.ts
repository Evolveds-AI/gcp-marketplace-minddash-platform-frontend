import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/backend/semantic/deleteConfig
 * Elimina una configuración de capa semántica
 */
export async function DELETE(request: NextRequest) {
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
        { success: false, message: 'No tienes permisos para eliminar configuraciones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Se requiere el ID de la configuración' },
        { status: 400 }
      );
    }

    const result = await backendClient.deleteSemanticConfig(id);

    return NextResponse.json({
      success: true,
      message: 'Configuración de capa semántica eliminada exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('[Proxy] Error eliminando configuración semántica:', error);
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
