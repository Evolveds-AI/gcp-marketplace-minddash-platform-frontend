import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/prompts/create
 * Registra un nuevo prompt para un chatbot
 */
export async function POST(request: NextRequest) {
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

    // Verificar permisos (solo admin o admin-client) - case insensitive
    const userRole = decoded.role.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'admin-client') {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para crear prompts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Log para debugging en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('Body recibido en POST /api/backend/prompts/create:', JSON.stringify(body, null, 2));
    }
    
    const { 
      product_id,
      name,
      prompt_type,
      content,
      prompt_content,
      version
    } = body;

    // Validaciones
    if (!product_id) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre del prompt es requerido' },
        { status: 400 }
      );
    }

    // Usar content o prompt_content, priorizando content (formato estándar)
    const promptContentValue = content || prompt_content;
    
    if (!promptContentValue || (typeof promptContentValue === 'string' && promptContentValue.trim() === '')) {
      return NextResponse.json(
        { success: false, message: 'El contenido del prompt es requerido (content o prompt_content)' },
        { status: 400 }
      );
    }

    // Construir config_prompt según el formato esperado por la API
    const config_prompt = {
      system_prompt: promptContentValue,
      prompt_type: prompt_type || 'system',
      version: version || '1.0'
    };

    // El backend Python requiere prompt_content en el body, no solo en config_prompt
    const createData: any = {
      product_id,
      name: name.trim(),
      prompt_content: promptContentValue, // Campo requerido por el backend Python
      config_prompt,
      path_config_file: undefined
    };

    // Log para debugging en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('Payload a enviar al backend:', JSON.stringify(createData, null, 2));
    }

    // Llamar al backend Python
    const result = await backendClient.createPrompt(createData);

    return NextResponse.json({
      success: true,
      message: 'Prompt creado exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creando prompt:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear prompt',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
