import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
  'https://backend-service-dev-minddash-294493969622.us-central1.run.app';

/**
 * DELETE /api/backend/mindsdb/connections/drop
 * Elimina una conexión de MindsDB
 */
export async function DELETE(request: NextRequest) {
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

    // Verificar permisos
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para eliminar conexiones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { engine, name, server_url } = body;

    // Validaciones básicas
    if (!name || !engine) {
      return NextResponse.json(
        { success: false, message: 'name y engine son requeridos' },
        { status: 400 }
      );
    }

    // Usar server_url del body o variable de entorno
    const mindsdbServerUrl = server_url || 
      process.env.MINDSDB_SERVER_URL || 
      process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL;

    if (!mindsdbServerUrl) {
      return NextResponse.json(
        { success: false, message: 'server_url es requerido' },
        { status: 400 }
      );
    }

    // Construir payload
    const payload = {
      server_url: mindsdbServerUrl,
      name,
      engine
    };

    // Llamar al backend Python
    const response = await fetch(`${BACKEND_URL}/mindsdb/dropConnections`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      const errorMessage = errorData.detail || errorData.message || errorData.error || 'Error al eliminar conexión';
      throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Conexión MindsDB eliminada exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error eliminando conexión MindsDB:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al eliminar conexión',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
