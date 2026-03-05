import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
  'https://backend-service-dev-minddash-294493969622.us-central1.run.app';

const parseBackendResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text().catch(() => '');

  if (contentType.toLowerCase().includes('application/json')) {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { detail: text || response.statusText };
    }
  }

  try {
    return text ? JSON.parse(text) : { detail: response.statusText };
  } catch {
    return { detail: text || response.statusText };
  }
};

/**
 * POST /api/backend/mindsdb/connections
 * Crea una conexión (database) en MindsDB
 * Soporta PostgreSQL y BigQuery con parámetros específicos para cada engine
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const authHeader = request.headers.get('Authorization') || undefined;
    
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

    // Verificar permisos
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para crear conexiones' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // Usar server_url del body o variable de entorno
    const mindsdbServerUrl =
      process.env.MINDSDB_SERVER_URL || process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL;

    let response: Response;

    if (contentType.toLowerCase().includes('multipart/form-data')) {
      const incomingForm = await request.formData();
      const forwarded = new FormData();

      incomingForm.forEach((value, key) => {
        if (value === null || value === undefined) return;
        forwarded.append(key, value as any);
      });

      // Fallback server_url si no se envía explícitamente
      if (!forwarded.get('server_url') && mindsdbServerUrl) {
        forwarded.set('server_url', mindsdbServerUrl);
      }

      const name = forwarded.get('name');
      const engine = forwarded.get('engine');
      if (!name || !engine) {
        return NextResponse.json(
          { success: false, message: 'name y engine son requeridos' },
          { status: 400 }
        );
      }

      if (!forwarded.get('server_url')) {
        return NextResponse.json(
          { success: false, message: 'server_url es requerido' },
          { status: 400 }
        );
      }

      response = await fetch(`${BACKEND_URL}/mindsdb/connections`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: forwarded,
      });
    } else {
      const body = await request.json();
      const { name, engine, parameters, server_url } = body;

      // Validaciones básicas
      if (!name || !engine) {
        return NextResponse.json(
          { success: false, message: 'name y engine son requeridos' },
          { status: 400 }
        );
      }

      // Usar server_url del body o variable de entorno
      const resolvedServerUrl =
        server_url || mindsdbServerUrl;

      if (!resolvedServerUrl) {
        return NextResponse.json(
          { success: false, message: 'server_url es requerido' },
          { status: 400 }
        );
      }

      let payload: any;

      // Construir payload según el tipo de engine
      if (engine === 'bigquery') {
        // BigQuery requiere: project_id, dataset, service_account_json
        if (!parameters?.project_id || !parameters?.dataset) {
          return NextResponse.json(
            { success: false, message: 'Para BigQuery se requiere project_id y dataset' },
            { status: 400 }
          );
        }

        payload = {
          server_url: resolvedServerUrl,
          name,
          engine: 'bigquery',
          parameters: {
            project_id: parameters.project_id,
            dataset: parameters.dataset,
            service_account_json: parameters.service_account_json || undefined,
          },
        };
      } else if (engine === 'postgres' || engine === 'postgresql') {
        // PostgreSQL requiere: host, port, database, user, password
        // Si no se proporcionan, usar variables de entorno
        const dbHost = parameters?.host || process.env.DB_HOST || process.env.MINDDASH_DB_HOST;
        const dbPort = parameters?.port || process.env.DB_PORT || process.env.MINDDASH_DB_PORT || 5432;
        const dbName = parameters?.database || process.env.DB_NAME || process.env.MINDDASH_DB_NAME;
        const dbUser = parameters?.user || process.env.DB_USER || process.env.MINDDASH_DB_USER;
        const dbPassword = parameters?.password || process.env.DB_PASSWORD || process.env.MINDDASH_DB_PASSWORD;

        if (!dbHost || !dbName || !dbUser || !dbPassword) {
          return NextResponse.json(
            { success: false, message: 'Para PostgreSQL se requiere host, database, user y password' },
            { status: 400 }
          );
        }

        payload = {
          server_url: resolvedServerUrl,
          name,
          engine: 'postgres',
          parameters: {
            host: dbHost,
            port: typeof dbPort === 'string' ? parseInt(dbPort) : dbPort,
            database: dbName,
            user: dbUser,
            password: dbPassword,
          },
        };
      } else {
        // Otros engines: pasar parámetros tal cual
        payload = {
          server_url: resolvedServerUrl,
          name,
          engine,
          parameters: parameters || {},
        };
      }

      // Llamar al backend Python
      const forwarded = new FormData();
      forwarded.set('server_url', payload.server_url);
      forwarded.set('name', payload.name);
      forwarded.set('engine', payload.engine);
      forwarded.set('parameters', JSON.stringify(payload.parameters || {}));

      response = await fetch(`${BACKEND_URL}/mindsdb/connections`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: forwarded,
      });
    }

    const parsed = await parseBackendResponse(response);

    if (!response.ok) {
      console.error('[mindsdb/connections] Upstream error', {
        status: response.status,
        statusText: response.statusText,
        parsed,
      });
    }

    if (!response.ok) {
      const errorMessage =
        parsed?.detail || parsed?.message || parsed?.error || response.statusText || 'Error al crear conexión';

      const errorText =
        (typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)).toLowerCase();

      if (
        errorText.includes("can't connect to db") ||
        errorText.includes('name or service not known') ||
        errorText.includes('could not translate host name') ||
        errorText.includes('temporary failure in name resolution')
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Conexión creada, pero no se pudo validar la conexión a la base de datos. Revisa host/red/VPC y credenciales.',
            error: parsed,
          },
          { status: 200 }
        );
      }

      if (
        typeof errorMessage === 'string' &&
        errorMessage.toLowerCase().includes('database already exists')
      ) {
        return NextResponse.json(
          {
            success: true,
            message: 'Conexión ya existía en MindsDB, usando conexión existente',
            data: parsed,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: typeof errorMessage === 'string' ? errorMessage : 'Error al crear conexión',
          error: parsed,
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Conexión MindsDB creada exitosamente',
        data: parsed,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creando conexión MindsDB:', error);
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
