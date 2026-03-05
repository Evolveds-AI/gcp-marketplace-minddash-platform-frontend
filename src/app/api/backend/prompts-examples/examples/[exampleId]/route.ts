import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * PUT /api/backend/prompts-examples/examples/[exampleId]
 * Actualiza un ejemplo existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { exampleId: string } }
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
        { success: false, message: 'No tienes permisos para actualizar ejemplos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      product_id,
      name,
      description,
      data_query
    } = body;

    // Validaciones
    if (!params.exampleId) {
      return NextResponse.json(
        { success: false, message: 'ID de ejemplo requerido' },
        { status: 400 }
      );
    }

    if (name && name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre no puede estar vacío' },
        { status: 400 }
      );
    }

    if (data_query && data_query.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El data_query no puede estar vacío' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.updateExample({
      id: params.exampleId,
      product_id,
      name: name?.trim(),
      description: description?.trim(),
      data_query: data_query?.trim()
    });

    return NextResponse.json({
      success: true,
      message: 'Ejemplo actualizado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando ejemplo:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al actualizar ejemplo',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backend/prompts-examples/examples/[exampleId]
 * Elimina un ejemplo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { exampleId: string } }
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
        { success: false, message: 'No tienes permisos para eliminar ejemplos' },
        { status: 403 }
      );
    }

    if (!params.exampleId) {
      return NextResponse.json(
        { success: false, message: 'ID de ejemplo requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.deleteExample(params.exampleId);

    return NextResponse.json({
      success: true,
      message: 'Ejemplo eliminado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error eliminando ejemplo:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al eliminar ejemplo',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
