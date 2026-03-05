import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/alert
 * Configura alertas para un chatbot/producto
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

    // Validaciones básicas
    if (!body.product_id) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.configureAlert(body);

    return NextResponse.json({
      success: true,
      message: 'Alerta configurada exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error configurando alerta:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al configurar alerta',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
