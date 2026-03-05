import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/database';
import { Prisma } from '@prisma/client';

/**
 * POST /api/user/agent-data
 * Obtiene los datos del usuario desde la vista vw_body_agent_minddash
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener el token del header Authorization
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
    const { userId, productId } = body;
    console.log('userId', userId);
    console.log('productId', productId);

    const debugEnabled = process.env.NODE_ENV === 'development' && request.nextUrl.searchParams.get('debug') === '1';
    const dbNameFromEnv = (() => {
      try {
        const raw = process.env.DATABASE_URL;
        if (!raw) return null;
        const url = new URL(raw);
        return url.pathname?.replace('/', '') || null;
      } catch {
        return null;
      }
    })();

    if (process.env.NODE_ENV === 'development') {
      try {
        const currentDbRows = await prisma.$queryRaw<any[]>(
          Prisma.sql`SELECT current_database() as current_database`
        );
        const currentDatabase = currentDbRows?.[0]?.current_database ?? null;
        console.log('[agent-data] Prisma current_database():', currentDatabase);
        console.log('[agent-data] DATABASE_URL db name:', dbNameFromEnv);
      } catch (e) {
        console.warn('[agent-data] No se pudo consultar current_database()', e);
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId es requerido' },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'productId es requerido' },
        { status: 400 }
      );
    }

    // Consultar la vista vw_body_agent_minddash
    const tableIdent = Prisma.raw(`"vw_body_agent_minddash"`);

    let rows = await prisma.$queryRaw<any[]>(
      Prisma.sql`
        SELECT *
        FROM ${tableIdent}
        WHERE "id_user" = CAST(${userId} AS uuid)
        AND "product_id" = CAST(${productId} AS uuid)
        ORDER BY
          CASE WHEN config_connection->>'username' IS NOT NULL
                AND config_connection->>'username' != ''
                AND config_connection->>'password' IS NOT NULL
                AND config_connection->>'password' != ''
          THEN 0 ELSE 1 END,
          CASE WHEN array_length(table_names, 1) > 0 THEN 0 ELSE 1 END
        LIMIT 1
      `
    );

    // Fallback: if no exact user+product match, try any row for this product
    // The product-level config (table_names, bucket_config, gs_*, config_connection) is shared
    // Prefer rows where config_connection has non-empty username/password
    let usedFallback = false;
    if (!rows || rows.length === 0) {
      console.log('[agent-data] No exact match for userId+productId, trying product-only fallback');
      rows = await prisma.$queryRaw<any[]>(
        Prisma.sql`
          SELECT *
          FROM ${tableIdent}
          WHERE "product_id" = CAST(${productId} AS uuid)
          ORDER BY
            CASE WHEN config_connection->>'username' IS NOT NULL
                  AND config_connection->>'username' != ''
                  AND config_connection->>'password' IS NOT NULL
                  AND config_connection->>'password' != ''
            THEN 0 ELSE 1 END,
            CASE WHEN array_length(table_names, 1) > 0 THEN 0 ELSE 1 END
          LIMIT 1
        `
      );
      usedFallback = true;
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No se encontraron datos de configuración para este producto' },
        { status: 404 }
      );
    }

    // Serializar posibles BigInt para evitar errores de JSON
    const serializeBigInt = (data: any) =>
      JSON.parse(
        JSON.stringify(data, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      );

    const serializedRow = serializeBigInt(rows[0]);

    // Fallback: if table_names is empty, try to get them from roles_data_access for this product
    const tableNames = serializedRow.table_names;
    if (!tableNames || (Array.isArray(tableNames) && tableNames.length === 0)) {
      try {
        const roleTableNames = await prisma.$queryRaw<any[]>(
          Prisma.sql`
            SELECT table_names
            FROM roles_data_access
            WHERE product_id = CAST(${productId} AS uuid)
              AND array_length(table_names, 1) > 0
            ORDER BY array_length(table_names, 1) DESC
            LIMIT 1
          `
        );
        if (roleTableNames && roleTableNames.length > 0 && roleTableNames[0].table_names?.length > 0) {
          serializedRow.table_names = roleTableNames[0].table_names;
          console.log('[agent-data] table_names was empty, filled from roles_data_access:', serializedRow.table_names);
        }
      } catch (e: any) {
        console.warn('[agent-data] Could not fetch fallback table_names:', e.message);
      }
    }

    console.log('rows', serializedRow);

    // Retornar el primer resultado
    return NextResponse.json({
      success: true,
      data: serializedRow,
      ...(debugEnabled ? { debug: { database_url_db: dbNameFromEnv } } : {})
    });

  } catch (error: any) {
    console.error('Error obteniendo datos del agente:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al obtener datos del agente',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

