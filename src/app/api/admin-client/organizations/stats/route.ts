import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { getAdminContext } from '@/lib/utils/admin-context';
import { isAdminClientReadRole } from '@/lib/utils/admin-client-role';

export const dynamic = 'force-dynamic';

// GET /api/admin-client/organizations/stats - Obtener estadísticas de organizaciones
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

    if (!isAdminClientReadRole(decoded.role)) {
      return NextResponse.json({ error: 'Acceso denegado. Solo administradores de cliente.' }, { status: 403 });
    }

    // Obtener contexto del admin
    const adminContext = await getAdminContext(decoded.userId);

    if (adminContext.organizationIds.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          totalOrganizations: 0,
          totalProjects: 0,
          totalChatbots: 0,
          totalUsers: 0
        },
        organizations: []
      });
    }

    // Obtener información básica de las organizaciones
    const organizations = await prisma.organizations.findMany({
      where: {
        id: { in: adminContext.organizationIds }
      },
      select: {
        id: true,
        name: true,
        description: true,
        company_name: true,
        country: true,
        created_at: true,
        updated_at: true,
      }
    });

    // Obtener proyectos para mapearlos con sus organizaciones
    const projects = await prisma.projects.findMany({
      where: { organization_id: { in: adminContext.organizationIds } },
      select: { id: true, organization_id: true }
    });

    const projectCountMap = new Map<string, number>();
    projects.forEach((project) => {
      if (!project.organization_id) return;
      projectCountMap.set(
        project.organization_id,
        (projectCountMap.get(project.organization_id) || 0) + 1
      );
    });

    // Contar usuarios asignados directamente a cada organización
    const usersCounts = await prisma.access_user_organization.groupBy({
      by: ['organization_id'],
      where: { organization_id: { in: adminContext.organizationIds } },
      _count: { user_id: true },
    });

    const userCountMap = new Map<string, number>(
      usersCounts
        .filter((item) => !!item.organization_id)
        .map((item) => [item.organization_id as string, item._count.user_id])
    );

    // Contar chatbots activos agrupados por organización a partir de los proyectos
    const projectIds = projects.map((project) => project.id);
    const productCounts = projectIds.length
      ? await prisma.products.groupBy({
          by: ['project_id'],
          where: {
            project_id: { in: projectIds },
            is_active: true,
          },
          _count: { _all: true },
        })
      : [];

    // Aggregate mensajes_mes per project for message usage tracking
    const productMessageSums = projectIds.length
      ? await prisma.products.groupBy({
          by: ['project_id'],
          where: {
            project_id: { in: projectIds },
            is_active: true,
          },
          _sum: { mensajes_mes: true },
        })
      : [];

    const projectOrgMap = new Map<string, string>();
    projects.forEach((project) => {
      if (project.organization_id) {
        projectOrgMap.set(project.id, project.organization_id);
      }
    });

    const chatbotsCountMap = new Map<string, number>();
    productCounts.forEach((productGroup) => {
      const orgId = projectOrgMap.get(productGroup.project_id);
      if (!orgId) return;
      chatbotsCountMap.set(
        orgId,
        (chatbotsCountMap.get(orgId) || 0) + productGroup._count._all
      );
    });

    const messagesCountMap = new Map<string, number>();
    productMessageSums.forEach((msgGroup) => {
      const orgId = projectOrgMap.get(msgGroup.project_id);
      if (!orgId) return;
      messagesCountMap.set(
        orgId,
        (messagesCountMap.get(orgId) || 0) + (msgGroup._sum.mensajes_mes || 0)
      );
    });

    // Mapear organizaciones con estadísticas agregadas
    const organizationsWithStats = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description,
      company_name: org.company_name,
      country: org.country,
      is_active: true,
      created_at: org.created_at.toISOString(),
      updated_at: org.updated_at.toISOString(),
      projects_count: projectCountMap.get(org.id) || 0,
      chatbots_count: chatbotsCountMap.get(org.id) || 0,
      users_count: userCountMap.get(org.id) || 0,
      messages_this_month: messagesCountMap.get(org.id) || 0,
    }));

    // Calcular totales
    const totalProjects = organizationsWithStats.reduce(
      (total, org) => total + org.projects_count,
      0
    );
    const totalChatbots = organizationsWithStats.reduce(
      (total, org) => total + org.chatbots_count,
      0
    );

    const totalMessagesThisMonth = organizationsWithStats.reduce(
      (total, org) => total + org.messages_this_month,
      0
    );

    const stats = {
      totalOrganizations: organizations.length,
      totalProjects,
      totalChatbots,
      totalUsers: adminContext.userIds.length,
      totalMessagesThisMonth
    };

    return NextResponse.json({
      success: true,
      stats,
      organizations: organizationsWithStats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de organizaciones:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
