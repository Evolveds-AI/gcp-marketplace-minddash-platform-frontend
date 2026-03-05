import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';
import prisma from '@/lib/database';

const ALLOWED_ROLES = ['admin', 'admin-client', 'super_admin'];

export async function PUT(
  request: NextRequest,
  { params }: { params: { chatbotId: string; channelProductId: string } }
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
        { success: false, message: 'No tienes permisos para actualizar vínculos' },
        { status: 403 }
      );
    }

    const { chatbotId, channelProductId } = params;
    const body = await request.json();
    const { configuration } = body ?? {};

    const existing = await prisma.channel_product.findFirst({
      where: {
        id: channelProductId,
        product_id: chatbotId,
      },
      select: {
        id: true,
        channel_id: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Canal no encontrado para este chatbot' },
        { status: 404 }
      );
    }

    if (!existing.channel_id) {
      return NextResponse.json(
        { success: false, message: 'No se pudo resolver el channel_id del vínculo' },
        { status: 500 }
      );
    }

    const channelProductType: string | null | undefined = configuration?.type ?? null;

    await backendClient.updateChannelProduct({
      id: channelProductId,
      channel_id: existing.channel_id,
      product_id: chatbotId,
      channel_product_type: channelProductType,
      configuration: configuration ?? {},
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración de canal actualizada exitosamente',
      channel: {
        id: channelProductId,
        configuration: configuration ?? {},
      },
    });
  } catch (error: any) {
    console.error('Error actualizando configuración de canal (backend proxy):', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Error al actualizar configuración de canal',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatbotId: string; channelProductId: string } }
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
        { success: false, message: 'No tienes permisos para eliminar vínculos' },
        { status: 403 }
      );
    }

    const { chatbotId, channelProductId } = params;

    const existing = await prisma.channel_product.findFirst({
      where: {
        id: channelProductId,
        product_id: chatbotId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Canal no encontrado para este chatbot' },
        { status: 404 }
      );
    }

    await backendClient.deleteChannelProduct({ id: channelProductId });

    return NextResponse.json({
      success: true,
      message: 'Vínculo eliminado correctamente',
    });
  } catch (error: any) {
    console.error('Error eliminando vínculo de canal (backend proxy):', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Error al eliminar vínculo de canal',
      },
      { status: 500 }
    );
  }
}
