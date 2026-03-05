import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * PUT /api/backend/semantic/layer/update
 * Actualiza la capa semántica existente
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

    const body = await request.json();

    // Validaciones
    if (!body.layer_id) {
      return NextResponse.json(
        { success: false, message: 'layer_id es requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.updateSemanticLayer(body);

    return NextResponse.json({
      success: true,
      message: 'Capa semántica actualizada exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando capa semántica:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al actualizar capa semántica',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
