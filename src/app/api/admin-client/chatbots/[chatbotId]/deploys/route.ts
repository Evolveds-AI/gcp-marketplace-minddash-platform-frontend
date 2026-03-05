'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';

const ALLOWED_ROLES = ['admin', 'admin-client', 'super_admin', 'editor'];

export async function GET(
  request: NextRequest,
  { params }: { params: { chatbotId: string } }
) {
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

    const userRole = decoded.role?.toLowerCase();
    if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para ver deploys' },
        { status: 403 }
      );
    }

    const { chatbotId } = params;

    // Verificar que el chatbot existe
    const chatbot = await prisma.products.findUnique({
      where: { id: chatbotId },
      select: { id: true, name: true },
    });

    if (!chatbot) {
      return NextResponse.json(
        { success: false, message: 'Chatbot no encontrado' },
        { status: 404 }
      );
    }

    // Obtener deploys del chatbot
    const deploys = await prisma.clients_products_deploys.findMany({
      where: { product_id: chatbotId },
      orderBy: { updated_at: 'desc' },
      select: {
        id: true,
        product_id: true,
        bucket_config: true,
        gs_examples_agent: true,
        gs_prompt_agent: true,
        gs_prompt_sql: true,
        gs_profiling_agent: true,
        gs_metrics_config_agent: true,
        client: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      deploys,
    });
  } catch (error) {
    console.error('Error fetching deploys:', error);
    return NextResponse.json(
      { success: false, message: 'Error al obtener deploys' },
      { status: 500 }
    );
  }
}
