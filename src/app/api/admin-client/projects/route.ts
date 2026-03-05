import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { getAdminContext } from '@/lib/utils/admin-context';
import { isAdminClientReadRole } from '@/lib/utils/admin-client-role';

// GET - Obtener proyectos del cliente
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

    // Obtener contexto completo del administrador
    const adminContext = await getAdminContext(decoded.userId);

    if (adminContext.projectIds.length === 0) {
      return NextResponse.json({
        success: true,
        projects: []
      });
    }

    const requestedOrgId = request.nextUrl.searchParams.get('organizationId');
    const organizationFilter = requestedOrgId && adminContext.organizationIds.includes(requestedOrgId)
      ? requestedOrgId
      : undefined;

    const projects = await prisma.projects.findMany({
      where: {
        id: { in: adminContext.projectIds },
        ...(organizationFilter ? { organization_id: organizationFilter } : {})
      },
      select: {
        id: true,
        name: true,
        description: true,
        label: true,
        organization_id: true,
        created_at: true,
        updated_at: true,
        products: {
          where: {
            id: { in: adminContext.productIds },
            is_active: true
          },
          select: {
            id: true,
            access_user_product: {
              where: {
                user_id: {
                  in: adminContext.userIds
                }
              },
              select: {
                user_id: true
              }
            }
          }
        },
        access_user_project: {
          where: {
            user_id: {
              in: adminContext.userIds
            }
          },
          select: {
            user_id: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const projectsWithStats = projects.map((project) => {
      const uniqueUserIds = new Set<string>();

      project.access_user_project.forEach((item) => {
        if (item.user_id) {
          uniqueUserIds.add(item.user_id);
        }
      });

      project.products.forEach((product) => {
        product.access_user_product.forEach((item) => {
          if (item.user_id) {
            uniqueUserIds.add(item.user_id);
          }
        });
      });

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        tag: project.label,
        is_active: true,
        organization_id: project.organization_id,
        created_at: project.created_at,
        updated_at: project.updated_at,
        chatbots_count: project.products.length,
        users_count: uniqueUserIds.size,
      };
    });

    return NextResponse.json({
      success: true,
      projects: projectsWithStats
    });

  } catch (error) {
    console.error('Error obteniendo proyectos:', error);
    return NextResponse.json(
      { success: false, message: 'Error al obtener proyectos' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo proyecto
export async function POST(request: NextRequest) {
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

    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, tag } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre del proyecto es requerido' },
        { status: 400 }
      );
    }

    const organizations = await prisma.organizations.findMany({
      where: {
        access_user_organization: {
          some: {
            user_id: decoded.userId
          }
        }
      },
      select: { id: true }
    });

    const organizationIds = organizations.map((org) => org.id);

    const projectCount = await prisma.projects.count({
      where: {
        organization_id: organizationIds.length > 0 ? { in: organizationIds } : undefined
      }
    });

    if (projectCount >= 5) {
      return NextResponse.json(
        { success: false, message: 'Has alcanzado el límite máximo de 5 proyectos activos' },
        { status: 400 }
      );
    }

    // Crear nuevo proyecto
    const organizationId = organizationIds[0] ?? null;

    const newProject = await prisma.projects.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        label: tag?.trim() || null,
        label_color: null,
        organization_id: organizationId,
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        label: true,
        label_color: true,
        created_at: true,
        updated_at: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Proyecto creado exitosamente',
      project: newProject
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando proyecto:', error);
    return NextResponse.json(
      { success: false, message: 'Error al crear proyecto' },
      { status: 500 }
    );
  }
}
