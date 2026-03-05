import prisma from '@/lib/database';
import { Prisma } from '@prisma/client';

export interface MessageStats {
  totalMessages: number;
  messagesThisMonth: number;
  messagesLastMonth: number;
  dailyAverage: number;
  weeklyAverage: number;
  growth: number; // Porcentaje de crecimiento vs mes anterior
}

export async function getMessageStatsForProduct(productId: string): Promise<MessageStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

  try {
    // Obtener usuarios asignados al producto
    const productUsers = await prisma.access_user_product.findMany({
      where: { product_id: productId },
      select: { user_id: true },
    });

    const userIds = productUsers.map((pu: any) => pu.user_id);

    if (userIds.length === 0) {
      return {
        totalMessages: 0,
        messagesThisMonth: 0,
        messagesLastMonth: 0,
        dailyAverage: 0,
        weeklyAverage: 0,
        growth: 0
      };
    }

    const userIdArray = Prisma.sql`ARRAY[${Prisma.join(userIds)}]::uuid[]`;

    const countFor = async (range?: { gte?: Date; lte?: Date }) => {
      const rows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count
        FROM sessions_events
        WHERE usuario_id = ANY(${userIdArray})
          AND role = 'user'
          ${range?.gte ? Prisma.sql`AND timestamp >= ${range.gte}` : Prisma.empty}
          ${range?.lte ? Prisma.sql`AND timestamp <= ${range.lte}` : Prisma.empty}
      `;
      const raw = rows?.[0]?.count ?? BigInt(0);
      return Number(raw);
    };

    const messagesThisMonth = await countFor({ gte: startOfMonth });

    const messagesLastMonth = await countFor({ gte: startOfLastMonth, lte: endOfLastMonth });

    const messagesThisWeek = await countFor({ gte: startOfWeek });

    const totalMessages = await countFor();

    // Calcular promedios
    const daysInMonth = now.getDate();
    const dailyAverage = daysInMonth > 0 ? Math.round(messagesThisMonth / daysInMonth) : 0;
    const weeklyAverage = Math.round(messagesThisWeek);

    // Calcular crecimiento
    const growth = messagesLastMonth > 0 
      ? Math.round(((messagesThisMonth - messagesLastMonth) / messagesLastMonth) * 100)
      : messagesThisMonth > 0 ? 100 : 0;

    return {
      totalMessages,
      messagesThisMonth,
      messagesLastMonth,
      dailyAverage,
      weeklyAverage,
      growth
    };
  } catch (error) {
    console.error('Error calculating message stats for product:', productId, error);
    return {
      totalMessages: 0,
      messagesThisMonth: 0,
      messagesLastMonth: 0,
      dailyAverage: 0,
      weeklyAverage: 0,
      growth: 0
    };
  }
}

export async function getMessageStatsForClient(clientId: string): Promise<MessageStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

  try {
    const clientUsers = await prisma.access_user_client.findMany({
      where: { client_id: clientId },
      select: { user_id: true },
    });

    const userIds = clientUsers.map((u) => u.user_id).filter(Boolean) as string[];

    if (userIds.length === 0) {
      return {
        totalMessages: 0,
        messagesThisMonth: 0,
        messagesLastMonth: 0,
        dailyAverage: 0,
        weeklyAverage: 0,
        growth: 0
      };
    }

    const userIdArray = Prisma.sql`ARRAY[${Prisma.join(userIds)}]::uuid[]`;

    const countFor = async (range?: { gte?: Date; lte?: Date }) => {
      const rows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count
        FROM sessions_events
        WHERE usuario_id = ANY(${userIdArray})
          AND role = 'user'
          ${range?.gte ? Prisma.sql`AND timestamp >= ${range.gte}` : Prisma.empty}
          ${range?.lte ? Prisma.sql`AND timestamp <= ${range.lte}` : Prisma.empty}
      `;
      const raw = rows?.[0]?.count ?? BigInt(0);
      return Number(raw);
    };

    const messagesThisMonth = await countFor({ gte: startOfMonth });

    const messagesLastMonth = await countFor({ gte: startOfLastMonth, lte: endOfLastMonth });

    const messagesThisWeek = await countFor({ gte: startOfWeek });

    const totalMessages = await countFor();

    const daysInMonth = now.getDate();
    const dailyAverage = daysInMonth > 0 ? Math.round(messagesThisMonth / daysInMonth) : 0;
    const weeklyAverage = Math.round(messagesThisWeek);

    const growth = messagesLastMonth > 0 
      ? Math.round(((messagesThisMonth - messagesLastMonth) / messagesLastMonth) * 100)
      : messagesThisMonth > 0 ? 100 : 0;

    return {
      totalMessages,
      messagesThisMonth,
      messagesLastMonth,
      dailyAverage,
      weeklyAverage,
      growth
    };
  } catch (error) {
    console.error('Error calculating message stats for client:', clientId, error);
    return {
      totalMessages: 0,
      messagesThisMonth: 0,
      messagesLastMonth: 0,
      dailyAverage: 0,
      weeklyAverage: 0,
      growth: 0
    };
  }
}

// Función para obtener estadísticas de productos más activos
export async function getTopProductsByMessages(clientId: string, limit: number = 5) {
  try {
    void clientId;
    void limit;
    return [];
  } catch (error) {
    console.error('Error getting top products by messages:', error);
    return [];
  }
}

// Función para verificar la salud de las métricas
export async function verifyMessageAnalytics() {
  try {
    const totalRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM sessions_events
    `;
    const userRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM sessions_events WHERE role = 'user'
    `;
    const botRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM sessions_events WHERE role = 'assistant'
    `;

    const totalEvents = Number(totalRows?.[0]?.count ?? BigInt(0));
    const userEvents = Number(userRows?.[0]?.count ?? BigInt(0));
    const botEvents = Number(botRows?.[0]?.count ?? BigInt(0));

    console.log('📊 Verificación de Analíticas de Mensajes:');
    console.log(`   Total eventos: ${totalEvents}`);
    console.log(`   Eventos de usuario: ${userEvents}`);
    console.log(`   Eventos de bot: ${botEvents}`);
    console.log(`   Ratio usuario/bot: ${totalEvents > 0 ? (userEvents / totalEvents * 100).toFixed(1) : 0}%`);

    return {
      totalEvents,
      userEvents,
      botEvents,
      isHealthy: totalEvents > 0 && userEvents > 0
    };
  } catch (error) {
    console.error('Error verifying message analytics:', error);
    return {
      totalEvents: 0,
      userEvents: 0,
      botEvents: 0,
      isHealthy: false
    };
  }
}