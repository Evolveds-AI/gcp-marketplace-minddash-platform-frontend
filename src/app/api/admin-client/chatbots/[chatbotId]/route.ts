import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { getAdminContext } from '@/lib/utils/admin-context';

const maskSecretValue = (value?: string | null) => {
  if (!value) return null;
  const trimmed = String(value);
  if (trimmed.length <= 8) return '********';
  return `${trimmed.slice(0, 4)}********${trimmed.slice(-4)}`;
};

// GET - Obtener detalle de un chatbot específico
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

    const userRole = (decoded.role || '').toLowerCase();
    const allowedRoles = new Set(['admin', 'admin-client', 'admin_client', 'super_admin', 'superadmin', 'editor']);
    if (!allowedRoles.has(userRole)) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado.' },
        { status: 403 }
      );
    }

    const { chatbotId } = params;

    const adminContext = await getAdminContext(decoded.userId);

    if (!adminContext.productIds.includes(chatbotId)) {
      return NextResponse.json(
        { success: false, message: 'No tienes acceso a este chatbot' },
        { status: 403 }
      );
    }

    // Obtener chatbot con información relacionada
    const chatbot = await prisma.products.findFirst({
      where: {
        id: chatbotId,
        is_active: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        tipo: true,
        language: true,
        label: true,
        label_color: true,
        welcome_message: true,
        max_users: true,
        mensajes_mes: true,
        is_active_rag: true,
        is_active_alerts: true,
        is_active_insight: true,
        config: true,
        created_at: true,
        updated_at: true,
        project_id: true,
        projects: {
          select: {
            id: true,
            name: true,
            organization_id: true,
          }
        },
        channel_product: {
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
        },
        access_user_product: {
          select: {
            user_id: true
          }
        }
      }
    });

    if (!chatbot) {
      return NextResponse.json(
        { success: false, message: 'Chatbot no encontrado' },
        { status: 404 }
      );
    }

    const organizationId = chatbot.projects?.organization_id ?? null;

    const totalConnections = organizationId && adminContext.organizationIds.includes(organizationId)
      ? await prisma.data_connections.count({
          where: {
            organization_id: organizationId
          }
        })
      : 0;

    const usersAssigned = chatbot.access_user_product
      .map((item) => item.user_id)
      .filter((userId): userId is string => Boolean(userId) && adminContext.userIds.includes(userId));

    const totalUsersAssigned = new Set(usersAssigned).size;

    const totalMessages = chatbot.mensajes_mes ?? 0;

    const channelCount = chatbot.channel_product?.length ?? 0;

    const channels = (chatbot.channel_product || []).map((item) => {
      const configuration = (item.configuration as any) ?? null;

      if (configuration && typeof configuration === 'object') {
        if (configuration.app_pswd_slack) {
          configuration.app_pswd_slack = maskSecretValue(configuration.app_pswd_slack);
        }
        if (configuration.secret_pasword_id) {
          configuration.secret_pasword_id = maskSecretValue(configuration.secret_pasword_id);
        }
        if (configuration.jwtToken) {
          configuration.jwtToken = maskSecretValue(configuration.jwtToken);
        }
        if (configuration.verifyToken) {
          configuration.verifyToken = maskSecretValue(configuration.verifyToken);
        }
      }

      return {
        id: item.id,
        channel_id: item.channel_id ?? null,
        name: item.channels?.name ?? null,
        description: item.channels?.description ?? null,
        configuration,
      };
    });

    return NextResponse.json({
      success: true,
      chatbot: {
        id: chatbot.id,
        name: chatbot.name,
        description: chatbot.description,
        tipo: chatbot.tipo,
        language: chatbot.language,
        label: chatbot.label,
        label_color: chatbot.label_color,
        welcome_message: chatbot.welcome_message,
        max_users: chatbot.max_users,
        mensajes_mes: chatbot.mensajes_mes,
        is_active_rag: chatbot.is_active_rag,
        is_active_alerts: chatbot.is_active_alerts,
        is_active_insight: chatbot.is_active_insight,
        config: chatbot.config,
        created_at: chatbot.created_at,
        updated_at: chatbot.updated_at,
        project_id: chatbot.project_id,
        project_name: chatbot.projects?.name ?? null,
        organization_id: organizationId,
        stats: {
          total_connections: totalConnections,
          users_assigned: totalUsersAssigned,
          messages_per_month: totalMessages,
          channel_count: channelCount,
        },
        channels
      }
    });

  } catch (error) {
    console.error('Error obteniendo chatbot:', error);
    return NextResponse.json(
      { success: false, message: 'Error al obtener chatbot' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar chatbot
export async function PUT(
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

    // Aceptar 'admin' o 'Admin' para compatibilidad
    if (decoded.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado.' },
        { status: 403 }
      );
    }

    const { chatbotId } = params;
    const body = await request.json();
    const { 
      name, 
      description, 
      tipo,
      language,
      label, 
      label_color,
      welcome_message,
      max_users,
      is_active_rag,
      is_active_alerts,
      is_active_insight,
      config
    } = body;

    // Verificar que el chatbot existe
    const existingChatbot = await prisma.products.findFirst({
      where: {
        id: chatbotId,
        is_active: true
      }
    });

    if (!existingChatbot) {
      return NextResponse.json(
        { success: false, message: 'Chatbot no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar chatbot
    const updatedChatbot = await prisma.products.update({
      where: {
        id: chatbotId
      },
      data: {
        name: name?.trim() || existingChatbot.name,
        description: description !== undefined ? (description?.trim() || null) : existingChatbot.description,
        tipo: tipo !== undefined ? tipo : existingChatbot.tipo,
        language: language !== undefined ? language : existingChatbot.language,
        label: label !== undefined ? (label?.trim() || null) : existingChatbot.label,
        label_color: label_color !== undefined ? (label_color?.trim() || null) : existingChatbot.label_color,
        welcome_message: welcome_message !== undefined ? welcome_message : existingChatbot.welcome_message,
        max_users: max_users !== undefined ? max_users : existingChatbot.max_users,
        is_active_rag: is_active_rag !== undefined ? is_active_rag : existingChatbot.is_active_rag,
        is_active_alerts: is_active_alerts !== undefined ? is_active_alerts : existingChatbot.is_active_alerts,
        is_active_insight: is_active_insight !== undefined ? is_active_insight : existingChatbot.is_active_insight,
        config: config !== undefined ? config : existingChatbot.config,
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        tipo: true,
        language: true,
        label: true,
        label_color: true,
        welcome_message: true,
        max_users: true,
        is_active_rag: true,
        is_active_alerts: true,
        is_active_insight: true,
        config: true,
        created_at: true,
        updated_at: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Chatbot actualizado exitosamente',
      chatbot: updatedChatbot
    });

  } catch (error) {
    console.error('Error actualizando chatbot:', error);
    return NextResponse.json(
      { success: false, message: 'Error al actualizar chatbot' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar chatbot (soft delete)
export async function DELETE(
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

    // Aceptar 'admin' o 'Admin' para compatibilidad
    if (decoded.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado.' },
        { status: 403 }
      );
    }

    const { chatbotId } = params;

    // Verificar que el chatbot existe
    const existingChatbot = await prisma.products.findFirst({
      where: {
        id: chatbotId,
        is_active: true
      }
    });

    if (!existingChatbot) {
      return NextResponse.json(
        { success: false, message: 'Chatbot no encontrado' },
        { status: 404 }
      );
    }

    // Soft delete: marcar como inactivo
    await prisma.products.update({
      where: {
        id: chatbotId
      },
      data: {
        is_active: false,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Chatbot eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando chatbot:', error);
    return NextResponse.json(
      { success: false, message: 'Error al eliminar chatbot' },
      { status: 500 }
    );
  }
}
