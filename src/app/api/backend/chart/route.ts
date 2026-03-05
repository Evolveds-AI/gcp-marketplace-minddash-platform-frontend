import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/chart
 * Genera datos para gráficos/charts
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
    if (!body.product_id || !body.chart_type) {
      return NextResponse.json(
        { success: false, message: 'product_id y chart_type son requeridos' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.generateChart(body);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error generando gráfico:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al generar gráfico',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
