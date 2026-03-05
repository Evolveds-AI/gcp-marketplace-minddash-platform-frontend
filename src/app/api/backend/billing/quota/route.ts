export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

// POST /billing/sendRegistroQuota
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { id_plan, metric_name, level, quota } = body;

    if (!id_plan || typeof id_plan !== 'string') {
      return NextResponse.json({ success: false, message: 'id_plan es requerido' }, { status: 400 });
    }

    if (!metric_name || typeof metric_name !== 'string') {
      return NextResponse.json({ success: false, message: 'metric_name es requerido' }, { status: 400 });
    }

    if (typeof quota !== 'number') {
      return NextResponse.json({ success: false, message: 'quota es requerido (número)' }, { status: 400 });
    }

    const result = await backendClient.createQuota({ id_plan, metric_name, level, quota });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error creando quota:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al crear quota' },
      { status: error.statusCode || 500 }
    );
  }
}

// PUT /billing/updateQuota
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { id, id_plan, metric_name, level, quota } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, message: 'id es requerido' }, { status: 400 });
    }

    if (!id_plan || typeof id_plan !== 'string') {
      return NextResponse.json({ success: false, message: 'id_plan es requerido' }, { status: 400 });
    }

    if (!metric_name || typeof metric_name !== 'string') {
      return NextResponse.json({ success: false, message: 'metric_name es requerido' }, { status: 400 });
    }

    if (typeof quota !== 'number') {
      return NextResponse.json({ success: false, message: 'quota es requerido (número)' }, { status: 400 });
    }

    const result = await backendClient.updateQuota({ id, id_plan, metric_name, level, quota });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error actualizando quota:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al actualizar quota' },
      { status: error.statusCode || 500 }
    );
  }
}

// DELETE /billing/deleteQuota
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, message: 'id es requerido' }, { status: 400 });
    }

    const result = await backendClient.deleteQuota({ id });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error eliminando quota:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al eliminar quota' },
      { status: error.statusCode || 500 }
    );
  }
}
