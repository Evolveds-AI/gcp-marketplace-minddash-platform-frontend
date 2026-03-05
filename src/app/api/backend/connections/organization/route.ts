import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/database';

/**
 * POST /api/backend/connections/organization
 * Obtiene todas las conexiones de una organización específica
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
    const { organization_id } = body;

    if (!organization_id) {
      return NextResponse.json(
        { success: false, message: 'organization_id es requerido' },
        { status: 400 }
      );
    }

    const connections = await prisma.data_connections.findMany({
      where: { organization_id },
    });

    // Normalizar al shape esperado por el frontend (ConnectionsView)
    const normalized = connections.map((conn) => {
      const config = (conn.configuration as Record<string, any> | null) ?? {};

      return {
        id: conn.id,
        organization_id: conn.organization_id,
        name: conn.name,
        type: (conn.type || '').toLowerCase(),
        provider: (config.provider || config.subtype || config.type || '')?.toString()?.toLowerCase() || undefined,
        host: config.host,
        port: config.port,
        database: config.database,
        schema: config.schema,
        sslmode: config.sslmode || config.ssl_mode,
        server: config.server,
        warehouse: config.warehouse,
        protocol: config.protocol,
        db_engine: config.db_engine,
        // BigQuery
        project_id: config.project_id,
        dataset: config.dataset,
        has_service_account_json: !!config.has_service_account_json,
        // Descripción/estado
        description: config.description ?? '',
        is_active: config.is_active ?? true,
        // MindsDB (si se guardara en configuration)
        mindsdb_name: config.mindsdb_name || config.mindsdbName,
        server_url: config.server_url || config.serverUrl,
      };
    });

    return NextResponse.json({
      success: true,
      data: normalized,
    });

  } catch (error: any) {
    console.error('Error obteniendo conexiones por organización:', error);
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
