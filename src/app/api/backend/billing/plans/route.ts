export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const plans = await backendClient.getBillingPlans();

    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    console.error('Error obteniendo planes de billing:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al obtener planes de billing' },
      { status: error.statusCode || 500 }
    );
  }
}
