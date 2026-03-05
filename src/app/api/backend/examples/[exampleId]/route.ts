export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
  'https://backend-service-dev-minddash-294493969622.us-central1.run.app';

export async function PUT(
  request: NextRequest,
  { params }: { params: { exampleId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    // Verificar permisos (admin o admin-client) - case insensitive
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para actualizar ejemplos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, data_query, data_query_b64 } = body;

    const decodedDataQuery =
      typeof data_query === 'string'
        ? data_query
        : typeof data_query_b64 === 'string'
          ? Buffer.from(
              data_query_b64
                .replace(/-/g, '+')
                .replace(/_/g, '/')
                .padEnd(data_query_b64.length + ((4 - (data_query_b64.length % 4)) % 4), '='),
              'base64'
            ).toString('utf-8')
          : undefined;

    const hasAnyField =
      (typeof name === 'string' && name.trim().length > 0) ||
      (typeof description === 'string' && description.trim().length > 0) ||
      (typeof decodedDataQuery === 'string' && decodedDataQuery.trim().length > 0);

    if (!hasAnyField) {
      return NextResponse.json(
        { success: false, message: 'Se requiere al menos un campo a actualizar (name, description, data_query)' },
        { status: 400 }
      );
    }

    const requestBody = JSON.stringify({
      id: params.exampleId,
      name,
      description,
      data_query: decodedDataQuery,
    }).split('/').join('\\u002F');

    const response = await fetch(`${BACKEND_URL}/prompts_and_examples/examples/sendUpdateExample`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: requestBody
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { success: false, message: error.detail || 'Error al actualizar ejemplo' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error en PUT /api/backend/examples/[exampleId]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { exampleId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    // Verificar permisos (admin o admin-client) - case insensitive
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para eliminar ejemplos' },
        { status: 403 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/prompts_and_examples/examples/sendDeleteExample`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        id: params.exampleId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { success: false, message: error.detail || 'Error al eliminar ejemplo' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error en DELETE /api/backend/examples/[exampleId]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
