import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * PUT /api/backend/prompts/[promptId]/direct
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
    const { 
      product_id,
      name,
      config_prompt
    } = body;

    // Validaciones
    if (!params.promptId) {
      return NextResponse.json(
        { success: false, message: 'promptId es requerido' },
        { status: 400 }
      );
    }

    // extraer prompt_content de config_prompt si existe
    const prompt_content =
      config_prompt?.system_prompt ||
      config_prompt?.prompt_content ||
      null;

    const updateData: any = {
      id: params.promptId,
      product_id,
      name: typeof name === 'string' ? name.trim() : name,
      prompt_content,
      config_prompt,
    };

    // llamar al backend python
    const result = await backendClient.updatePrompt(updateData);

    return NextResponse.json({
      success: true,
      message: 'Prompt actualizado exitosamente',
      data: result,
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
 * GET /api/backend/prompts/[promptId]/direct
 * Obtiene un prompt existente
 */
export async function GET(
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
        { success: false, message: 'No tienes permisos para obtener prompts' },
        { status: 403 }
      );
    }

    if (!params.promptId) {
      return NextResponse.json(
        { success: false, message: 'promptId es requerido' },
        { status: 400 }
      );
    }

    // obtener product_id de query params
    const { searchParams } = new URL(request.url);
    const product_id = searchParams.get('product_id');

    if (!product_id) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido como query parameter' },
        { status: 400 }
      );
    }

    // llamar al backend python para obtener prompts del producto
    const promptsResult = await backendClient.getPromptsByProduct(product_id);

    // buscar el prompt por id en la lista
    // getPromptsByProduct devuelve un array de objetos con prompt_id
    const prompts = Array.isArray(promptsResult) ? promptsResult : [];
    const prompt = prompts.find((p: any) => 
      p.prompt_id === params.promptId || 
      p.id === params.promptId ||
      p.id_prompt === params.promptId
    );

    if (!prompt) {
      return NextResponse.json(
        { success: false, message: 'Prompt no encontrado' },
        { status: 404 }
      );
    }

    // formatear la respuesta para mantener compatibilidad con el formato esperado
    return NextResponse.json({
      success: true,
      message: 'Prompt obtenido exitosamente',
      data: {
        id_prompt: prompt.prompt_id,
        message: 'Prompt obtenido exitosamente.',
        prompt: {
          id: prompt.prompt_id,
          product_id: prompt.product_id,
          name: prompt.prompt_name,
          prompt_content: prompt.prompt_content,
          config_prompt: prompt.config_prompt,
          updated_at: prompt.updated_at,
        },
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo prompt:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al obtener prompt',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
