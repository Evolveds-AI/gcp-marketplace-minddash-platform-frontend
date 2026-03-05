import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/database';
import { getAdminContext } from '@/lib/utils/admin-context';
import { isAdminClientReadRole } from '@/lib/utils/admin-client-role';

export const dynamic = 'force-dynamic';

/**
 * Calcula el crecimiento de usuarios
 */
async function calculateUserGrowth(): Promise<number> {
  try {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usersLastMonth = await prisma.users.count({
      where: {
        created_at: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      }
    });

    const usersCurrentMonth = await prisma.users.count({
      where: {
        created_at: { gte: currentMonthStart }
      }
    });

    if (usersLastMonth === 0) {
      return usersCurrentMonth > 0 ? 100 : 0;
    }

    const growth = Math.round(((usersCurrentMonth - usersLastMonth) / usersLastMonth) * 100);
    return growth;
  } catch (error) {
    console.error('Error calculando crecimiento de usuarios:', error);
    return 0;
  }
}

// GET /api/admin-client/products/stats - Obtener estadísticas de productos
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorización requerido' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    if (!isAdminClientReadRole((decoded as any).role)) {
      return NextResponse.json({ error: 'Acceso denegado. Solo administradores de cliente.' }, { status: 403 });
    }

    // Obtener contexto del admin
    const adminContext = await getAdminContext(decoded.userId);

    // Si el admin no tiene productos, retornar estadísticas vacías
    if (adminContext.productIds.length === 0) {
      return NextResponse.json({
        message: 'Estadísticas obtenidas exitosamente',
        stats: {
          overview: {
            total: 0,
            active: 0,
            inactive: 0,
            totalUsersAssigned: 0,
            totalMessagesPerMonth: 0
          },
          topProducts: [],
          trends: {
            userGrowth: 0,
            messageGrowth: 0,
            totalMessages: 0,
            messagesLastMonth: 0,
            dailyAverage: 0,
            weeklyAverage: 0
          }
        }
      });
    }

    // Obtener estadísticas de productos del admin
    const totalProducts = await prisma.products.count({
      where: { id: { in: adminContext.productIds } }
    });

    const activeProducts = await prisma.products.count({
      where: {
        id: { in: adminContext.productIds },
        is_active: true
      }
    });

    // Obtener total de usuarios asignados a productos del admin
    const totalUsersAssigned = await prisma.access_user_product.count({
      where: { product_id: { in: adminContext.productIds } }
    });

    // Obtener productos con información básica y usuarios asignados
    const products = await prisma.products.findMany({
      where: {
        id: { in: adminContext.productIds },
      },
      include: {
        access_user_product: {
          select: { user_id: true }
        },
        channel_product: {
          select: {
            id: true,
            configuration: true,
            channels: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            organizations: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Formatear productos con estadísticas básicas
    const formattedTopProducts = products.map((product) => {
      type ChannelSummary = {
        id: string;
        name: string | null;
        description: string | null;
        configuration: unknown;
      };

      const rawChannels: ChannelSummary[] = (product.channel_product || [])
        .map((cp) => ({
          id: cp.id,
          name: cp.channels?.name ?? null,
          description: cp.channels?.description ?? null,
          configuration: cp.configuration ?? null,
        }))
        .filter((channel) => Boolean(channel.name));

      const deduped = new Map<string, ChannelSummary>();

      for (const channel of rawChannels) {
        const key = (channel.name || '').trim().toLowerCase();
        if (!key) continue;

        const current = deduped.get(key);
        if (!current) {
          deduped.set(key, channel);
          continue;
        }

        const currentConfig = current.configuration;
        const nextConfig = channel.configuration;

        const currentPhone =
          currentConfig && typeof currentConfig === 'object' && 'phone_number' in currentConfig
            ? String((currentConfig as Record<string, unknown>).phone_number || '')
            : '';
        const nextPhone =
          nextConfig && typeof nextConfig === 'object' && 'phone_number' in nextConfig
            ? String((nextConfig as Record<string, unknown>).phone_number || '')
            : '';

        if (!currentPhone && nextPhone) {
          deduped.set(key, channel);
        }
      }

      return {
        id: product.id,
        nombre: product.name || 'Chatbot sin nombre',
        descripcion: product.description,
        description: product.description,
        tipo: product.tipo,
        label: product.label,
        label_color: product.label_color,
        created_at: product.created_at,
        updated_at: product.updated_at,
        channels: Array.from(deduped.values()),
        usuarios_asignados: product.access_user_product.length,
        mensajes_mes: product.mensajes_mes || 0,
        total_mensajes: 0, // No disponible sin tabla de mensajes
        crecimiento_mensual: 0, // No disponible sin historial
        promedio_diario: product.mensajes_mes ? Math.round(product.mensajes_mes / 30) : 0,
        is_active: product.is_active,
        max_users: product.max_users,
        is_active_rag: product.is_active_rag,
        is_active_alerts: product.is_active_alerts,
        is_active_insight: product.is_active_insight,
        organization_id: product.projects?.organizations?.id || null,
        organization_name: product.projects?.organizations?.name || '',
        project_id: product.project_id || null,
        project_name: product.projects?.name || ''
      };
    });

    const userGrowth = await calculateUserGrowth();

    const stats = {
      overview: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
        totalUsersAssigned,
        totalMessagesPerMonth: 0 // No disponible sin tabla de mensajes
      },
      topProducts: formattedTopProducts,
      trends: {
        userGrowth,
        messageGrowth: 0, // No disponible sin tabla de mensajes
        totalMessages: 0,
        messagesLastMonth: 0,
        dailyAverage: 0,
        weeklyAverage: 0
      }
    };

    return NextResponse.json({
      message: 'Estadísticas obtenidas exitosamente',
      stats
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de productos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}