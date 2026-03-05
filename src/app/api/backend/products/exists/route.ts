export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/database';

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

    const url = new URL(request.url);
    const project_id = url.searchParams.get('project_id');
    const rawName = url.searchParams.get('name');

    const name = rawName?.trim() ?? '';

    if (!project_id || !name) {
      return NextResponse.json(
        { success: false, message: 'project_id y name son requeridos' },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.products.findFirst({
      where: {
        project_id,
        name,
        is_active: true,
      },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      exists: Boolean(existingProduct),
    });
  } catch (error: any) {
    console.error('Error validando nombre de producto:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al validar nombre',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      { status: 500 }
    );
  }
}
