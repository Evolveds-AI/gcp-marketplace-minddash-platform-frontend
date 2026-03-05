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
    const organization_id = body?.organization_id;

    if (!organization_id || typeof organization_id !== 'string') {
      return NextResponse.json({ success: false, message: 'organization_id es requerido' }, { status: 400 });
    }

    const status = await backendClient.getBillingStatusByOrg(organization_id);

    return NextResponse.json({ success: true, data: status });
  } catch (error: any) {
    console.error('Error obteniendo estado de billing por org:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al obtener estado de billing por org' },
      { status: error.statusCode || 500 }
    );
  }
}
