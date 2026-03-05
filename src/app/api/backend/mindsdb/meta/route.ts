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
    console.error('Error obteniendo metadatos MindsDB:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener metadatos',
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
    console.error('Error obteniendo metadatos MindsDB (POST):', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener metadatos',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
