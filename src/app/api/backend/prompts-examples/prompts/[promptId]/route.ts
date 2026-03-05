import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * PUT /api/backend/prompts-examples/prompts/[promptId]
 * Actualiza un prompt existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { promptId: string } }
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
        { success: false, message: 'No tienes permisos para actualizar prompts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      product_id,
      name,
      config_prompt,
      path_config_file
    } = body;

    // Validaciones
    if (!params.promptId) {
      return NextResponse.json(
        { success: false, message: 'ID de prompt requerido' },
        { status: 400 }
      );
    }

    if (name && name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre no puede estar vacío' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.updatePrompt({
      id: params.promptId,
      product_id,
      name: name?.trim(),
      config_prompt,
      path_config_file
    });

    return NextResponse.json({
      success: true,
      message: 'Prompt actualizado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando prompt:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al actualizar prompt',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backend/prompts-examples/prompts/[promptId]
 * Elimina un prompt
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { promptId: string } }
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
        { success: false, message: 'No tienes permisos para eliminar prompts' },
        { status: 403 }
      );
    }

    if (!params.promptId) {
      return NextResponse.json(
        { success: false, message: 'ID de prompt requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.deletePrompt(params.promptId);

    return NextResponse.json({
      success: true,
      message: 'Prompt eliminado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error eliminando prompt:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al eliminar prompt',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
