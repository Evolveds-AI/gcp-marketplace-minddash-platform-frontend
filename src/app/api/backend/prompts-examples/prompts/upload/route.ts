import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/prompts-examples/prompts/upload
 * Sube prompts para un chatbot
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

    const body = await request.json();

    // Validaciones
    if (!body.product_id || !body.prompts) {
      return NextResponse.json(
        { success: false, message: 'product_id y prompts son requeridos' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.uploadPrompts(body);

    return NextResponse.json({
      success: true,
      message: 'Prompts subidos exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error subiendo prompts:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al subir prompts',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
