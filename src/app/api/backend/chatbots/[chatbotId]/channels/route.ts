import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';
import prisma from '@/lib/database';

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
    const defaultMeta = getDefaultChannelMeta(type);

    const channelName = String(body.name ?? defaultMeta.name).trim();
    const channelDescription = String(body.description ?? defaultMeta.description).trim();

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
        channel_id: true,
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
          channel_id: existing.channel_id ?? null,
          name: existing.channels?.name ?? null,
          description: existing.channels?.description ?? null,
          configuration: existing.configuration ?? null,
        },
      });
    }

    let baseChannel = await prisma.channels.findFirst({
      where: {
        name: channelName,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    if (!baseChannel) {
      const created = await backendClient.createChannel({
        name: channelName,
        description: channelDescription,
      });

      const createdId: string | undefined = created?.id_channel;

      if (createdId) {
        baseChannel = await prisma.channels.findUnique({
          where: { id: createdId },
          select: {
            id: true,
            name: true,
            description: true,
          },
        });
      }

      if (!baseChannel) {
        baseChannel = await prisma.channels.findFirst({
          where: {
            name: channelName,
          },
          select: {
            id: true,
            name: true,
            description: true,
          },
        });
      }
    }

    if (!baseChannel?.id) {
      return NextResponse.json(
        { success: false, message: 'No se pudo resolver el canal base' },
        { status: 500 }
      );
    }

    const initialConfiguration: Record<string, any> = {
      type,
      is_active: true,
      webhook_url: null,
      phone_number: null,
      email: null,
      channel_id: null,
      notes: null,
    };

    if (type === 'whatsapp') {
      initialConfiguration.version = 'v20.0';
    }

    const createdChannelProduct = await backendClient.createChannelProduct({
      channel_id: baseChannel.id,
      product_id: chatbotId,
      channel_product_type: type,
      configuration: initialConfiguration,
    });

    const createdId: string | undefined =
      createdChannelProduct?.id_channel_product ||
      createdChannelProduct?.channel_product_id ||
      createdChannelProduct?.id;

    if (!createdId) {
      return NextResponse.json(
        { success: false, message: 'No se pudo resolver el ID del vínculo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vínculo creado exitosamente',
      channel: {
        id: createdId,
        channel_id: baseChannel.id,
        name: baseChannel.name ?? channelName,
        description: baseChannel.description ?? channelDescription,
        configuration: initialConfiguration,
      },
    });
  } catch (error: any) {
    console.error('Error creando vínculo de canal (backend proxy):', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Error al crear vínculo de canal',
      },
      { status: 500 }
    );
  }
}
