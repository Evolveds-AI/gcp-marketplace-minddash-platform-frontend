import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/metrics/product
 * Obtiene todas las métricas de un producto específico
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
    const { product_id } = body;

    if (!product_id) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.getMetricsByProduct({ product_id });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error obteniendo métricas por producto:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener métricas',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
