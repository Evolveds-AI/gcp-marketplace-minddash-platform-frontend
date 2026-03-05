import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/connections
 * Obtiene todas las conexiones o una específica por ID
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
    const { connection_id } = body;

    // Llamar al backend Python
    const result = await backendClient.getConnections(connection_id);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error obteniendo conexiones:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener conexiones',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
