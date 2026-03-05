import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * PUT /api/backend/projects/[id]
 * Actualiza un proyecto existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const body = await request.json();
    const { name, description, config, is_active } = body;

    // Validaciones
    if (!params.id) {
      return NextResponse.json(
        { success: false, message: 'ID de proyecto requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.updateProject({
      id: params.id,
      name,
      description,
      config,
      is_active
    });

    return NextResponse.json({
      success: true,
      message: 'Proyecto actualizado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando proyecto:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al actualizar proyecto',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backend/projects/[id]
 * Elimina un proyecto
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    if (!params.id) {
      return NextResponse.json(
        { success: false, message: 'ID de proyecto requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.deleteProject(params.id);

    return NextResponse.json({
      success: true,
      message: 'Proyecto eliminado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error eliminando proyecto:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al eliminar proyecto',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
