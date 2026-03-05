import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/prompts-examples/examples/upload
 * Sube ejemplos de conversaciones para un chatbot
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
    if (!body.product_id || !body.examples) {
      return NextResponse.json(
        { success: false, message: 'product_id y examples son requeridos' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.uploadExamples(body);

    return NextResponse.json({
      success: true,
      message: 'Ejemplos subidos exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error subiendo ejemplos:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al subir ejemplos',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
