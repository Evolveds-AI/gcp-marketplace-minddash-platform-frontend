import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { getAdminContext } from '@/lib/utils/admin-context';
import { isAdminClientReadRole } from '@/lib/utils/admin-client-role';

// GET - Obtener estadísticas del dashboard para el cliente
export async function GET(request: NextRequest) {
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

    if (!isAdminClientReadRole(decoded.role)) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    // Obtener contexto del admin (organizaciones, proyectos, productos, usuarios)
    const adminContext = await getAdminContext(decoded.userId);

    // Si el admin no tiene organizaciones asignadas, retornar estadísticas vacías
    if (adminContext.organizationIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalUsers: 0,
            activeUsers: 0,
            totalProducts: 0,
            growth: '+0%',
            userGrowth: '+0%',
            productGrowth: '+0%',
            metadata: {
              usersLastMonth: 0,
              productsLastMonth: 0,
              usersCurrentMonth: 0,
              productsCurrentMonth: 0,
              calculatedAt: new Date().toISOString(),
              filteredByAdmin: decoded.userId,
              organizationsCount: 0
            }
          }
        }
      });
    }

    // Obtener estadísticas reales filtradas por el contexto del admin
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Total de usuarios del admin (solo los que tienen acceso a sus org/proyectos/productos)
    const totalUsers = adminContext.userIds.length;

    // 2. Usuarios activos (con actividad en los últimos 30 días)
    const activeUsers = await prisma.users.count({
      where: {
        id: { in: adminContext.userIds },
        OR: [
          { created_at: { gte: thirtyDaysAgo } },
          { 
            access_user_product: {
              some: {
                created_at: { gte: thirtyDaysAgo },
                product_id: { in: adminContext.productIds }
              }
            }
          }
        ]
      }
    });

    // 3. Total de productos (chatbots) del admin
    const totalProducts = await prisma.products.count({
      where: {
        id: { in: adminContext.productIds },
        is_active: true
      }
    });

    // 4. Calcular crecimiento de usuarios (mes actual vs mes anterior)
    const usersLastMonth = await prisma.users.count({
      where: {
        id: { in: adminContext.userIds },
        created_at: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      }
    });

    const usersCurrentMonth = await prisma.users.count({
      where: {
        id: { in: adminContext.userIds },
        created_at: { gte: currentMonthStart }
      }
    });

    // Calcular porcentaje de crecimiento
    let userGrowth = '+0%';
    if (usersLastMonth > 0) {
      const growthRate = ((usersCurrentMonth - usersLastMonth) / usersLastMonth) * 100;
      const sign = growthRate >= 0 ? '+' : '';
      userGrowth = `${sign}${growthRate.toFixed(1)}%`;
    } else if (usersCurrentMonth > 0) {
      userGrowth = '+100%';
    }

    // 5. Calcular crecimiento de productos del admin
    const productsLastMonth = await prisma.products.count({
      where: {
        id: { in: adminContext.productIds },
        created_at: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      }
    });

    const productsCurrentMonth = await prisma.products.count({
      where: {
        id: { in: adminContext.productIds },
        created_at: { gte: currentMonthStart }
      }
    });

    let productGrowth = '+0%';
    if (productsLastMonth > 0) {
      const growthRate = ((productsCurrentMonth - productsLastMonth) / productsLastMonth) * 100;
      const sign = growthRate >= 0 ? '+' : '';
      productGrowth = `${sign}${growthRate.toFixed(1)}%`;
    } else if (productsCurrentMonth > 0) {
      productGrowth = '+100%';
    }

    const stats = {
      totalUsers,
      activeUsers,
      totalProducts,
      growth: userGrowth,
      userGrowth,
      productGrowth,
      metadata: {
        usersLastMonth,
        productsLastMonth,
        usersCurrentMonth,
        productsCurrentMonth,
        calculatedAt: new Date().toISOString(),
        filteredByAdmin: decoded.userId,
        organizationsCount: adminContext.organizationIds.length,
        projectsCount: adminContext.projectIds.length,
        productsCount: adminContext.productIds.length
      }
    };

    return NextResponse.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';