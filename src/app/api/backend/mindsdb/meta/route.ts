import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/backend/mindsdb/meta
 * Explora metadatos de conexiones DB vía MindsDB
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

    // Parsear body (aunque es GET, algunos clientes pueden enviar body)
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Si no hay body o no es JSON, continuar
    }

    // Inject server_url if missing
    const serverUrl = process.env.MINDSDB_SERVER_URL || process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL;
    if (!serverUrl) {
      return NextResponse.json(
        { success: false, message: 'Config faltante: MINDSDB_SERVER_URL' },
        { status: 500 }
      );
    }
    if (!body.server_url) {
      body.server_url = serverUrl;
    }

    // Inject client_name if missing (required by backend for listar_conexiones)
    if (!body.client_name) {
      body.client_name = process.env.MINDSDB_CLIENT_NAME || 'default';
    }

    // Llamar al backend Python
    const result = await backendClient.getMindsDBMeta(body);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    const msg: string = error.message || '';
    const isMindsDBQueryError =
      msg.includes("Can't select from") ||
      msg.includes('Error ejecutando consulta en MindsDB') ||
      msg.includes('unknown') ||
      msg.includes('not found') ||
      msg.includes('does not exist');

    if (isMindsDBQueryError) {
      console.warn('[mindsdb/meta] MindsDB query error (returning empty):', msg);
      return NextResponse.json({
        success: true,
        data: { status: 'success', esquemas: [], tablas: [], columnas: [], conexiones: [] }
      });
    }

    console.error('Error obteniendo metadatos MindsDB:', error);
    return NextResponse.json(
      {
        success: false,
        message: msg || 'Error al obtener metadatos',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

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

    const body: any = await request.json();

    // Inject server_url if missing
    const serverUrl = process.env.MINDSDB_SERVER_URL || process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL;
    if (!serverUrl) {
      return NextResponse.json(
        { success: false, message: 'Config faltante: MINDSDB_SERVER_URL' },
        { status: 500 }
      );
    }
    if (!body.server_url) {
      body.server_url = serverUrl;
    }

    // Inject client_name if missing (required by backend for listar_conexiones)
    if (!body.client_name) {
      body.client_name = process.env.MINDSDB_CLIENT_NAME || 'default';
    }

    const result = await backendClient.getMindsDBMeta(body);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    const msg: string = error.message || '';
    // MindsDB query errors (connection not registered in MindsDB, engine not found, etc.)
    // are not system failures — return empty result so the UI degrades gracefully.
    const isMindsDBQueryError =
      msg.includes("Can't select from") ||
      msg.includes('Error ejecutando consulta en MindsDB') ||
      msg.includes('unknown') ||
      msg.includes('not found') ||
      msg.includes('does not exist');

    if (isMindsDBQueryError) {
      console.warn('[mindsdb/meta] MindsDB query error (returning empty):', msg);
      return NextResponse.json({
        success: true,
        data: { status: 'success', esquemas: [], tablas: [], columnas: [], conexiones: [] }
      });
    }

    console.error('Error obteniendo metadatos MindsDB (POST):', error);
    return NextResponse.json(
      {
        success: false,
        message: msg || 'Error al obtener metadatos',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
