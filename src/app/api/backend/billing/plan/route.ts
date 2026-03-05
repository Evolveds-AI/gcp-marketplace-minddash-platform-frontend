export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

// POST /billing/sendRegistroPlan
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
    const { plan_name, description } = body;

    if (!plan_name || typeof plan_name !== 'string') {
      return NextResponse.json({ success: false, message: 'plan_name es requerido' }, { status: 400 });
    }

    const result = await backendClient.createPlan({ plan_name, description });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error creando plan:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al crear plan' },
      { status: error.statusCode || 500 }
    );
  }
}

// PUT /billing/updatePlan
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
    const { id, plan_name, description } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, message: 'id es requerido' }, { status: 400 });
    }

    if (!plan_name || typeof plan_name !== 'string') {
      return NextResponse.json({ success: false, message: 'plan_name es requerido' }, { status: 400 });
    }

    const result = await backendClient.updatePlan({ id, plan_name, description });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error actualizando plan:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al actualizar plan' },
      { status: error.statusCode || 500 }
    );
  }
}

// DELETE /billing/deletePlan
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

    const result = await backendClient.deletePlan({ id });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error eliminando plan:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al eliminar plan' },
      { status: error.statusCode || 500 }
    );
  }
}
