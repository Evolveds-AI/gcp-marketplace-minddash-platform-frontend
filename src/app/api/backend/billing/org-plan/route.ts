export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

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
    const id_plan = body?.id_plan;
    const id_organization = body?.id_organization;

    if (!id_plan || typeof id_plan !== 'string') {
      return NextResponse.json({ success: false, message: 'id_plan es requerido' }, { status: 400 });
    }

    if (!id_organization || typeof id_organization !== 'string') {
      return NextResponse.json({ success: false, message: 'id_organization es requerido' }, { status: 400 });
    }

    const result = await backendClient.assignOrgPlan({ id_plan, id_organization });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error asignando plan a org:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al asignar plan a organización' },
      { status: error.statusCode || 500 }
    );
  }
}

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
    const id = body?.id;
    const id_plan = body?.id_plan;
    const id_organization = body?.id_organization;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, message: 'id es requerido' }, { status: 400 });
    }

    if (!id_plan || typeof id_plan !== 'string') {
      return NextResponse.json({ success: false, message: 'id_plan es requerido' }, { status: 400 });
    }

    if (!id_organization || typeof id_organization !== 'string') {
      return NextResponse.json({ success: false, message: 'id_organization es requerido' }, { status: 400 });
    }

    const result = await backendClient.updateOrgPlan({ id, id_plan, id_organization });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error actualizando plan de org:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al actualizar plan de organización' },
      { status: error.statusCode || 500 }
    );
  }
}

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
    const id = body?.id;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, message: 'id es requerido' }, { status: 400 });
    }

    const result = await backendClient.deleteOrgPlan({ id });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error eliminando org-plan:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al eliminar asignación de plan' },
      { status: error.statusCode || 500 }
    );
  }
}
