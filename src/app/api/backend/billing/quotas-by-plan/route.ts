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
    const plan_id = body?.plan_id;

    if (!plan_id || typeof plan_id !== 'string') {
      return NextResponse.json({ success: false, message: 'plan_id es requerido' }, { status: 400 });
    }

    const quotas = await backendClient.getQuotasByPlan(plan_id);

    return NextResponse.json({ success: true, data: quotas });
  } catch (error: any) {
    console.error('Error obteniendo cuotas por plan:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al obtener cuotas por plan' },
      { status: error.statusCode || 500 }
    );
  }
}
