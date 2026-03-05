import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * PUT /api/backend/prompts/[promptId]
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
    const userRole = decoded.role.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'admin-client') {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para actualizar prompts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Log para debugging en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('Body recibido en PUT /api/backend/prompts/[promptId]:', JSON.stringify(body, null, 2));
    }
    
    const { 
      product_id,
      name,
      prompt_type,
      content,
      prompt_content,
      version,
      existing_config,
      config_prompt: body_config_prompt
    } = body;

    // Validaciones
    if (!params.promptId) {
      return NextResponse.json(
        { success: false, message: 'promptId es requerido' },
        { status: 400 }
      );
    }

    // Usar prompt_content o content, priorizando prompt_content (que es lo que envía el frontend)
    const promptContentValue = prompt_content || content;
    
    if (!promptContentValue || (typeof promptContentValue === 'string' && promptContentValue.trim() === '')) {
      return NextResponse.json(
        { success: false, message: 'El contenido del prompt es requerido (prompt_content o content)' },
        { status: 400 }
      );
    }

    // Construir config_prompt preservando campos existentes y actualizando system_prompt
    const config_prompt = {
      ...(existing_config || body_config_prompt || {}), // Preservar todos los campos existentes
      system_prompt: promptContentValue,     // Actualizar el system_prompt
      prompt_type: prompt_type || existing_config?.prompt_type || body_config_prompt?.prompt_type || 'system',
      version: version || existing_config?.version || body_config_prompt?.version || '1.0'
    };

    // El backend Python requiere prompt_content en el body, no solo en config_prompt
    const updateData: any = {
      id: params.promptId,
      product_id,
      name: name?.trim(),
      prompt_content: promptContentValue, // Campo requerido por el backend Python
      config_prompt
    };

    console.log('Updating prompt with data:', updateData);
    console.log('Config prompt being sent:', config_prompt);

    // Llamar al backend Python
    const result = await backendClient.updatePrompt(updateData);
    
    console.log('Backend Python response:', result);

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
 * DELETE /api/backend/prompts/[promptId]
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
    const userRole = decoded.role.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'admin-client') {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para eliminar prompts' },
        { status: 403 }
      );
    }

    if (!params.promptId) {
      return NextResponse.json(
        { success: false, message: 'promptId es requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.deletePrompt({ id: params.promptId });

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
