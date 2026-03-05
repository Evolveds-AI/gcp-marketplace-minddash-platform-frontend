import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/semantic/query/build-advanced
 * Construye queries SQL avanzadas desde preguntas en lenguaje natural
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
    if (!body.question || typeof body.question !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Se requiere una pregunta (question)' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.buildAdvancedQuery(body);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error construyendo query avanzada:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al construir query',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
