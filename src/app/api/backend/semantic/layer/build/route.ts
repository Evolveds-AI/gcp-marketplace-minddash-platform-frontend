import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/semantic/layer/build
 * Construye capa semántica basada en selecciones de tablas/columnas
 * Endpoint backend: POST /semantic/layer/build
 */
export async function POST(request: NextRequest) {
  try {
    // Validar token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token no proporcionado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    // Parsear body
    const body = await request.json();
    console.log('[Build Route] Request body:', JSON.stringify(body, null, 2));

    // Inject server_url if missing
    const serverUrl = process.env.MINDSDB_SERVER_URL || process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL;
    if (!body.server_url) {
      if (!serverUrl) {
        return NextResponse.json(
          { success: false, message: 'Config faltante: MINDSDB_SERVER_URL' },
          { status: 500 }
        );
      }
      body.server_url = serverUrl;
    }

    // Validar campos requeridos
    if (!body.database || !body.selections) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Campos requeridos: database, selections' 
        },
        { status: 400 }
      );
    }

    console.log('[Build Route] Llamando a backendClient.buildSemanticLayer...');
    // Llamar al backend Python
    const result = await backendClient.buildSemanticLayer(body);
    console.log('[Build Route] Resultado del backend:', result);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error en semantic layer build:', error);
    if (error?.errorData) {
      console.error('[Build Route] backend error data:', JSON.stringify(error.errorData, null, 2));
    }

    const errorMessage = error.message || 'Error al construir capa semántica';
    const statusCode = error.status || 500;

    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
        error: error.toString(),
        backendErrorData: error?.errorData ?? null,
      },
      { status: statusCode }
    );
  }
}
