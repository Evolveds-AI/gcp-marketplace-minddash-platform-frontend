import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/connections/create
 * Registra una nueva conexión a una fuente de datos
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

    // Verificar permisos (solo admin o admin-client)
    // Verificar rol (case-insensitive)
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para crear conexiones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      organization_id,
      name,
      type,
      host,
      port,
      database,
      username,
      password,
      additional_params,
      description,
      is_active
    } = body;

    // Validaciones
    if (!organization_id) {
      return NextResponse.json(
        { success: false, message: 'organization_id es requerido' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre de la conexión es requerido' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { success: false, message: 'El tipo de conexión es requerido' },
        { status: 400 }
      );
    }

    const normalizedType = String(type).toLowerCase();
    const params = (additional_params && typeof additional_params === 'object') ? additional_params : {};
    const provider = (params.provider || params.subtype || '').toString().toLowerCase();

    // Validaciones mínimas por engine
    if (normalizedType === 'bigquery') {
      if (!params.project_id || !params.dataset) {
        return NextResponse.json(
          { success: false, message: 'project_id y dataset son requeridos para BigQuery' },
          { status: 400 }
        );
      }
    } else {
      if (!host || !database || !username) {
        return NextResponse.json(
          { success: false, message: 'host, database y username son requeridos' },
          { status: 400 }
        );
      }

      const requiresPassword =
        ['mysql', 'mariadb', 'clickhouse', 'redshift', 'snowflake', 'mssql'].includes(normalizedType) ||
        provider === 'aurora';
      if (requiresPassword && !password) {
        return NextResponse.json(
          { success: false, message: 'password es requerido para este tipo de conexión' },
          { status: 400 }
        );
      }
    }

    if (normalizedType === 'redshift') {
      if (!params.schema) {
        return NextResponse.json(
          { success: false, message: 'schema es requerido para Redshift' },
          { status: 400 }
        );
      }
      const sslMode = (params.ssl_mode || params.sslmode || '').toString().toLowerCase();
      if (!sslMode || (sslMode !== 'require' && sslMode !== 'verify-full')) {
        return NextResponse.json(
          { success: false, message: 'ssl_mode debe ser require o verify-full para Redshift' },
          { status: 400 }
        );
      }
      // Normalizar
      (params as any).ssl_mode = sslMode;
      delete (params as any).sslmode;
    }

    if (normalizedType === 'snowflake') {
      if (!params.server || !params.schema || !params.warehouse) {
        return NextResponse.json(
          { success: false, message: 'server, schema y warehouse son requeridos para Snowflake' },
          { status: 400 }
        );
      }
    }

    if (normalizedType === 'clickhouse') {
      const protocol = (params.protocol || '').toString().toLowerCase();
      if (!protocol || (protocol !== 'native' && protocol !== 'http')) {
        return NextResponse.json(
          { success: false, message: 'protocol debe ser native o http para ClickHouse' },
          { status: 400 }
        );
      }
    }

    if (normalizedType === 'mssql') {
      // provider es opcional: sqlserver/mssqlserver/azuresynapse
      if (provider && !['sqlserver', 'mssqlserver', 'azuresynapse'].includes(provider)) {
        return NextResponse.json(
          { success: false, message: 'provider inválido para MSSQL' },
          { status: 400 }
        );
      }
    }

    if (provider === 'aurora') {
      const dbEngine = (params.db_engine || '').toString().toLowerCase();
      if (!dbEngine || (dbEngine !== 'mysql' && dbEngine !== 'postgresql')) {
        return NextResponse.json(
          { success: false, message: 'db_engine debe ser mysql o postgresql para Aurora' },
          { status: 400 }
        );
      }
    }

    // Llamar al backend Python
    const result = await backendClient.createConnection({
      organization_id,
      name: name.trim(),
      type: normalizedType,
      host,
      port,
      database,
      username,
      password,
      additional_params: Object.keys(params).length ? params : additional_params,
      description: description?.trim(),
      is_active: is_active ?? true
    });


    return NextResponse.json({
      success: true,
      message: 'Conexión creada exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creando conexión:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear conexión',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
