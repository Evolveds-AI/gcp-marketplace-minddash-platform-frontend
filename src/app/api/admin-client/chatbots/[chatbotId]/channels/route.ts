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

type ChannelType = 'web' | 'whatsapp' | 'teams' | 'email' | 'slack' | 'other';

interface CreateChannelRequest {
  type?: ChannelType;
  name?: string | null;
  description?: string | null;
}

const ALLOWED_ROLES = ['admin', 'admin-client', 'super_admin'];

const getDefaultChannelMeta = (type: ChannelType) => {
  switch (type) {
    case 'whatsapp':
      return {
        name: 'WhatsApp',
        description: 'Canal de mensajería WhatsApp',
      };
    case 'email':
      return {
        name: 'Correo',
        description: 'Consultas y respuestas por correo electrónico',
      };
    case 'slack':
      return {
        name: 'Slack',
        description: 'Canal de conversación en Slack',
      };
    case 'teams':
      return {
        name: 'Microsoft Teams',
        description: 'Canal de conversación en Microsoft Teams',
      };
    case 'web':
      return {
        name: 'Web',
        description: 'Canal web del chatbot',
      };
    default:
      return {
        name: 'Otro',
        description: 'Canal genérico del chatbot',
      };
  }
};

export async function POST(
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
        { success: false, message: 'No tienes permisos para crear vínculos' },
        { status: 403 }
      );
    }

    const { chatbotId } = params;
    const body = (await request.json()) as CreateChannelRequest;

    const type: ChannelType = body.type || 'other';

    // Para el canal Web no es obligatorio crear un registro en BD, pero permitimos hacerlo
    const defaultMeta = getDefaultChannelMeta(type);

    const channelName = (body.name || defaultMeta.name).trim();
    const channelDescription = (body.description || defaultMeta.description).trim();

    // Verificar si ya existe un vínculo de este tipo para este chatbot
    // Para evitar duplicados innecesarios
    const existing = await prisma.channel_product.findFirst({
      where: {
        product_id: chatbotId,
        channels: {
          name: channelName,
        },
      },
      select: {
        id: true,
        configuration: true,
        channels: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'El vínculo ya existe para este chatbot',
        channel: {
          id: existing.id,
          name: existing.channels?.name ?? null,
          description: existing.channels?.description ?? null,
          configuration: existing.configuration ?? null,
        },
      });
    }

    // Buscar o crear el registro base en `channels`
    let baseChannel = await prisma.channels.findFirst({
      where: {
        name: channelName,
      },
    });

    if (!baseChannel) {
      const created = await backendClient.createChannel({
        name: channelName,
        description: channelDescription,
      });

      const createdId = created?.id_channel as string | undefined;
      if (!createdId) {
        return NextResponse.json(
          { success: false, message: 'No se pudo crear el canal base' },
          { status: 500 }
        );
      }

      baseChannel = await prisma.channels.findFirst({
        where: {
          id: createdId,
        },
      });

      if (!baseChannel) {
        return NextResponse.json(
          { success: false, message: 'No se pudo resolver el canal base creado' },
          { status: 500 }
        );
      }
    }

    const initialConfiguration = {
      type,
      is_active: true,
      webhook_url: null,
      phone_number: null,
      email: null,
      channel_id: null,
      notes: null,
    };

    const channelProductCreation = await backendClient.createChannelProduct({
      channel_id: baseChannel.id,
      product_id: chatbotId,
      channel_product_type: type,
      configuration: initialConfiguration,
    });

    const createdChannelProductId = channelProductCreation?.id_channel_product as string | undefined;
    if (!createdChannelProductId) {
      return NextResponse.json(
        { success: false, message: 'No se pudo crear el vínculo canal-producto' },
        { status: 500 }
      );
    }

    const created = await prisma.channel_product.findFirst({
      where: {
        id: createdChannelProductId,
        product_id: chatbotId,
      },
      select: {
        id: true,
        configuration: true,
        channels: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    });

    if (!created) {
      return NextResponse.json(
        { success: false, message: 'No se pudo leer el vínculo creado' },
        { status: 500 }
      );
    }

    const sanitizedConfiguration = (created.configuration as any) ?? null;
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
      message: 'Vínculo creado exitosamente',
      channel: {
        id: created.id,
        name: created.channels?.name ?? null,
        description: created.channels?.description ?? null,
        configuration: sanitizedConfiguration,
      },
    });
  } catch (error: any) {
    console.error('Error creando vínculo de canal:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Error al crear vínculo de canal',
      },
      { status: 500 }
    );
  }
}
