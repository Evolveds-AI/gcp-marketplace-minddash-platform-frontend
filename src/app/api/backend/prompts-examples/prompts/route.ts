import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/backend/prompts-examples/prompts
 * Obtiene todos los prompts
 */
export async function GET(request: NextRequest) {
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

    // Llamar al backend Python
    const result = await backendClient.getPrompts();

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error obteniendo prompts:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener prompts',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
