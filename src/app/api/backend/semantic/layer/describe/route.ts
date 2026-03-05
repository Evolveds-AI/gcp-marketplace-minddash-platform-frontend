import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * GET /api/backend/semantic/layer/describe
 * Describe la estructura de una capa semántica desde GCS
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

    // Obtener gs_uri del query param
    const { searchParams } = new URL(request.url);
    const gsUri = searchParams.get('gs_uri');

    if (!gsUri) {
      return NextResponse.json(
        { success: false, message: 'gs_uri es requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.describeSemanticLayerFromGCS(gsUri);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error describiendo capa semántica:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al describir capa semántica',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backend/semantic/layer/describe
 * Describe la estructura de una capa semántica
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

    // Llamar al backend Python
    const result = await backendClient.describeSemanticLayer(body);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error describiendo capa semántica:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al describir capa semántica',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
