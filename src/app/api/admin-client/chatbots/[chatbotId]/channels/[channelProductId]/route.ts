'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

const maskSecretValue = (value?: string | null) => {
  if (!value) return null;
  const trimmed = String(value);
  if (trimmed.length <= 8) return '********';
  return `${trimmed.slice(0, 4)}********${trimmed.slice(-4)}`;
};

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
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];

    if (!userRole || !allowedRoles.includes(userRole)) {
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

    const updated = await prisma.channel_product.findFirst({
      where: {
        id: channelProductId,
        product_id: chatbotId,
      },
      select: {
        id: true,
        configuration: true,
      },
    });

    const sanitizedConfiguration = (updated?.configuration as any) ?? (configuration ?? {});
    if (sanitizedConfiguration && typeof sanitizedConfiguration === 'object') {
      if (sanitizedConfiguration.app_pswd_slack) {
        sanitizedConfiguration.app_pswd_slack = maskSecretValue(sanitizedConfiguration.app_pswd_slack);
      }
      if (sanitizedConfiguration.secret_pasword_id) {
        sanitizedConfiguration.secret_pasword_id = maskSecretValue(sanitizedConfiguration.secret_pasword_id);
      }
      if (sanitizedConfiguration.jwtToken) {
        sanitizedConfiguration.jwtToken = maskSecretValue(sanitizedConfiguration.jwtToken);
      }
      if (sanitizedConfiguration.verifyToken) {
        sanitizedConfiguration.verifyToken = maskSecretValue(sanitizedConfiguration.verifyToken);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración de canal actualizada exitosamente',
      channel: updated ?? {
        id: channelProductId,
        configuration: sanitizedConfiguration,
      },
    });
  } catch (error: any) {
    console.error('Error actualizando configuración de canal:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al actualizar configuración de canal',
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
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];

    if (!userRole || !allowedRoles.includes(userRole)) {
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
    console.error('Error eliminando vínculo de canal:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al eliminar vínculo de canal',
      },
      { status: 500 }
    );
  }
}
