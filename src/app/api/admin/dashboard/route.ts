export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';

interface DailyMetric {
  date: string;
  users: number;
  messages: number;
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    // Verificar rol super_admin
    const userRole = (decoded.role || '').toLowerCase();
    if (userRole !== 'super_admin' && userRole !== 'superadmin') {
      return NextResponse.json({ success: false, message: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener estadísticas reales de la base de datos
    const [
      totalUsers,
      activeUsers,
      totalClients,
      totalConversations,
      recentUsers,
      recentClients,
      roleDistribution
    ] = await Promise.all([
      // Total de usuarios
      prisma.users.count(),
      
      // Usuarios activos
      prisma.users.count({
        where: { is_active: true }
      }),
      
      // Total de clientes
      prisma.clients.count(),
      
      // Total de conversaciones (mensajes únicos por sesión)
      prisma.message_whatsapp.count().catch(() => 0),
      
      // Usuarios recientes (últimos 10)
      prisma.users.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          is_active: true,
          created_at: true,
          role: {
            select: { name: true }
          }
        }
      }),
      
      // Clientes recientes (últimos 10)
      prisma.clients.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          nombre: true,
          description: true,
          created_at: true
        }
      }),
      
      // Distribución de roles
      prisma.$queryRaw`
        SELECT r.name as role, COUNT(u.id)::int as count
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        GROUP BY r.name
        ORDER BY count DESC
      `.catch(() => [])
    ]);

    // Calcular métricas adicionales
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const [newUsersThisWeek, newClientsThisWeek] = await Promise.all([
      prisma.users.count({
        where: {
          created_at: { gte: lastWeek }
        }
      }),
      prisma.clients.count({
        where: {
          created_at: { gte: lastWeek }
        }
      })
    ]);

    // Generar datos de gráfico de métricas diarias (últimos 7 días)
    const dailyMetrics: DailyMetric[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const usersCount = await prisma.users.count({
        where: {
          created_at: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      dailyMetrics.push({
        date: startOfDay.toISOString().split('T')[0],
        users: usersCount,
        messages: 0 // Placeholder - ajustar si hay tabla de mensajes
      });
    }

    // Formatear usuarios recientes para el frontend
    const formattedRecentUsers = recentUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.is_active,
      created_at: user.created_at,
      role: user.role?.name || 'user'
    }));

    // Formatear clientes recientes
    const formattedRecentClients = recentClients.map(client => ({
      id: client.id,
      nombre: client.nombre,
      descripcion: client.description || '',
      created_at: client.created_at
    }));

    // Calcular tasas de crecimiento
    const previousWeekUsers = totalUsers - newUsersThisWeek;
    const userGrowthRate = previousWeekUsers > 0 
      ? ((newUsersThisWeek / previousWeekUsers) * 100).toFixed(1)
      : '0';

    return NextResponse.json({
      success: true,
      data: {
        // Estadísticas principales
        totalUsers,
        activeUsers,
        totalClients,
        totalConversations,
        
        // Usuarios y clientes recientes
        recentUsers: formattedRecentUsers,
        recentClients: formattedRecentClients,
        
        // Distribución de roles
        roleDistribution: Array.isArray(roleDistribution) ? roleDistribution : [],
        
        // Métricas de crecimiento
        userGrowthRate: `+${userGrowthRate}%`,
        newUsersThisWeek,
        newClientsThisWeek,
        
        // Datos para gráficos
        dailyMetrics,
        
        // Estadísticas adicionales
        stats: {
          totalUsers,
          activeUsers,
          totalClients,
          totalConversations,
          userGrowth: `+${userGrowthRate}%`
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching dashboard data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
