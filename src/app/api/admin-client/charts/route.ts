import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/database';
import { getAdminContext } from '@/lib/utils/admin-context';
import { isAdminClientReadRole } from '@/lib/utils/admin-client-role';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verificar token de autenticación
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token de acceso requerido' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 403 }
      );
    }

    if (!isAdminClientReadRole(decoded.role)) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    // Obtener contexto del admin
    const adminContext = await getAdminContext(decoded.userId);

    // Obtener datos reales filtrados por el contexto del admin
    const userGrowth = await getUserGrowthData(adminContext.userIds);
    const projectChatbots = await getChatbotsPerProjectData(adminContext.projectIds, adminContext.productIds);
    const monthlyMetrics = await getMonthlyMetricsData(adminContext.userIds);

    const chartsData = {
      'user-growth': userGrowth,
      'project-chatbots': projectChatbots,
      'monthly-metrics': monthlyMetrics
    };


    return NextResponse.json({
      success: true,
      data: chartsData
    });

  } catch (error) {
    console.error('Error obteniendo datos de gráficos:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función para obtener datos de crecimiento de usuarios
async function getUserGrowthData(userIds: string[]) {
  if (userIds.length === 0) {
    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        usuarios: 0,
        total: 0
      };
    });
  }
  try {
    // Obtener usuarios de los últimos 6 meses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const users = await prisma.users.findMany({
      where: {
        id: { in: userIds },
        created_at: { gte: sixMonthsAgo }
      },
      select: { created_at: true },
      orderBy: { created_at: 'asc' }
    });


    // Agrupar por mes
    const monthlyData = users.reduce((acc, user) => {
      const month = user.created_at.toISOString().substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Construir SIEMPRE los últimos 6 meses (incluido el actual) con ceros donde falten
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1))
        .toISOString()
        .substring(0, 7); // YYYY-MM
      const label = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      months.push({ key, label });
    }

    const chartData = months.map(({ key, label }) => ({
      month: label,
      usuarios: monthlyData[key] || 0,
      total: monthlyData[key] || 0,
    }));

    return chartData;
  } catch (error) {
    console.error('Error in getUserGrowthData:', error);
    return [{
      month: new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
      usuarios: 0,
      total: 0
    }];
  }
}

// Función para obtener cantidad de chatbots por proyecto
async function getChatbotsPerProjectData(projectIds: string[], productIds: string[]) {
  if (projectIds.length === 0) {
    return [];
  }

  try {
    const projects = await prisma.projects.findMany({
      where: {
        id: { in: projectIds }
      },
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
        products: {
          where: {
            id: { in: productIds },
            is_active: true
          },
          select: {
            id: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return projects.map((project) => ({
      proyecto: project.name || 'Proyecto sin nombre',
      chatbots: project.products.length
    }));
  } catch (error) {
    console.error('Error in getChatbotsPerProjectData:', error);
    return [];
  }
}

// Función para obtener métricas mensuales
async function getMonthlyMetricsData(userIds: string[]) {
  if (userIds.length === 0) {
    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        mes: date.toLocaleDateString('es-ES', { month: 'short' }),
        usuarios: 0,
        mensajes: 0,
        engagement: 0
      };
    });
  }
  try {
    const currentDate = new Date();
    const months: Date[] = [];
    
    // Generar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      months.push(date);
    }

    const metricsData = await Promise.all(
      months.map(async (month) => {
        const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
        const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        
        // Contar usuarios nuevos en el mes (filtrados por admin)
        const newUsers = await prisma.users.count({
          where: {
            id: { in: userIds },
            created_at: {
              gte: startOfMonth,
              lt: endOfMonth
            }
          }
        });

        // Contar mensajes en el mes
        const messages = 0; // No hay modelo message disponible

        return {
          mes: month.toLocaleDateString('es-ES', { month: 'short' }),
          usuarios: newUsers,
          mensajes: messages,
          engagement: Math.max(0, Math.floor((messages / Math.max(1, newUsers)) * 100))
        };
      })
    );


    return metricsData;
  } catch (error) {
    console.error('Error in getMonthlyMetricsData:', error);
    // Datos de fallback
    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        mes: date.toLocaleDateString('es-ES', { month: 'short' }),
        usuarios: 0,
        mensajes: 0,
        engagement: 0
      };
    });
  }
}