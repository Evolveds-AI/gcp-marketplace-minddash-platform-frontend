import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

async function getSuperAdminScope() {
  const [organizations, projects, products] = await Promise.all([
    prisma.organizations.findMany({ select: { id: true, name: true } }),
    prisma.projects.findMany({ select: { id: true, name: true, organization_id: true } }),
    prisma.products.findMany({ where: { is_active: true }, select: { id: true, name: true, project_id: true } }),
  ]);

  return {
    organizationIds: organizations.map((o) => o.id),
    projectIds: projects.map((p) => p.id),
    productIds: products.map((p) => p.id),
    organizations,
    projects,
    products,
  };
}

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const actorRole = (decoded.role || '').toLowerCase();
    if (actorRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo super administradores.' },
        { status: 403 }
      );
    }

    const targetUserId = params.userId;

    if (decoded.userId === targetUserId) {
      return NextResponse.json(
        { success: false, message: 'No puedes modificar tus propios accesos desde aquí.' },
        { status: 403 }
      );
    }

    const targetUser = await prisma.users.findUnique({
      where: { id: targetUserId },
      select: { role: { select: { name: true } } },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    const targetRole = targetUser.role?.name?.toLowerCase() || '';
    if (targetRole === 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'No puedes gestionar accesos de otros super administradores.' },
        { status: 403 }
      );
    }

    const scope = await getSuperAdminScope();

    const [orgAccess, projectAccess, productAccess] = await Promise.all([
      prisma.access_user_organization.findMany({
        where: { user_id: targetUserId, organization_id: { in: scope.organizationIds } },
        select: { organization_id: true },
      }),
      prisma.access_user_project.findMany({
        where: { user_id: targetUserId, project_id: { in: scope.projectIds } },
        select: { project_id: true },
      }),
      prisma.access_user_product.findMany({
        where: { user_id: targetUserId, product_id: { in: scope.productIds } },
        select: { product_id: true },
      }),
    ]);

    const orgAssigned = new Set(orgAccess.map((a) => a.organization_id).filter(Boolean) as string[]);
    const projectAssigned = new Set(projectAccess.map((a) => a.project_id).filter(Boolean) as string[]);
    const productAssigned = new Set(productAccess.map((a) => a.product_id).filter(Boolean) as string[]);

    return NextResponse.json({
      success: true,
      data: {
        organizations: scope.organizations.map((o) => ({
          id: o.id,
          name: o.name,
          is_assigned: orgAssigned.has(o.id),
        })),
        projects: scope.projects.map((p) => ({
          id: p.id,
          name: p.name,
          organization_id: p.organization_id,
          is_assigned: projectAssigned.has(p.id),
        })),
        products: scope.products.map((p) => ({
          id: p.id,
          name: p.name,
          project_id: p.project_id,
          is_assigned: productAssigned.has(p.id),
        })),
        counts: {
          organizations: orgAssigned.size,
          projects: projectAssigned.size,
          products: productAssigned.size,
        },
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo accesos del usuario (super_admin):', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const actorRole = (decoded.role || '').toLowerCase();
    if (actorRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo super administradores.' },
        { status: 403 }
      );
    }

    const targetUserId = params.userId;

    if (decoded.userId === targetUserId) {
      return NextResponse.json(
        { success: false, message: 'No puedes modificar tus propios accesos desde aquí.' },
        { status: 403 }
      );
    }

    const scope = await getSuperAdminScope();

    const body = await request.json();
    const requestedOrganizationIds = Array.isArray(body.organizationIds) ? body.organizationIds : [];
    const requestedProjectIds = Array.isArray(body.projectIds) ? body.projectIds : [];
    const requestedProductIds = Array.isArray(body.productIds) ? body.productIds : [];

    const allowedOrgIds = new Set(scope.organizationIds);
    const allowedProjectIds = new Set(scope.projectIds);
    const allowedProductIds = new Set(scope.productIds);

    const invalidOrgs = requestedOrganizationIds.filter((id: string) => !allowedOrgIds.has(id));
    const invalidProjects = requestedProjectIds.filter((id: string) => !allowedProjectIds.has(id));
    const invalidProducts = requestedProductIds.filter((id: string) => !allowedProductIds.has(id));

    if (invalidOrgs.length || invalidProjects.length || invalidProducts.length) {
      return NextResponse.json(
        {
          success: false,
          message: 'Se intentó asignar acceso fuera del alcance del super_admin',
          details: {
            invalidOrganizationIds: invalidOrgs,
            invalidProjectIds: invalidProjects,
            invalidProductIds: invalidProducts,
          },
        },
        { status: 403 }
      );
    }

    const [projects, products, targetUser] = await Promise.all([
      prisma.projects.findMany({
        where: { id: { in: scope.projectIds } },
        select: { id: true, organization_id: true },
      }),
      prisma.products.findMany({
        where: { id: { in: scope.productIds } },
        select: { id: true, project_id: true },
      }),
      prisma.users.findUnique({
        where: { id: targetUserId },
        select: { id: true, role_id: true, role: { select: { name: true } } },
      }),
    ]);

    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    const targetRole = targetUser.role?.name?.toLowerCase() || '';
    if (targetRole === 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'No puedes gestionar accesos de otros super administradores.' },
        { status: 403 }
      );
    }

    const projectToOrg = new Map<string, string>();
    projects.forEach((p) => {
      if (p.organization_id) {
        projectToOrg.set(p.id, p.organization_id);
      }
    });

    const productToProject = new Map<string, string>();
    products.forEach((p) => {
      productToProject.set(p.id, p.project_id);
    });

    const requiredProjectIds = uniqueStrings([
      ...requestedProjectIds,
      ...requestedProductIds
        .map((productId: string) => productToProject.get(productId))
        .filter(Boolean) as string[],
    ]);

    const requiredOrganizationIds = uniqueStrings([
      ...requestedOrganizationIds,
      ...requiredProjectIds
        .map((projectId) => projectToOrg.get(projectId))
        .filter(Boolean) as string[],
    ]);

    const [currentOrgAccess, currentProjectAccess, currentProductAccess] = await Promise.all([
      prisma.access_user_organization.findMany({
        where: { user_id: targetUserId, organization_id: { in: scope.organizationIds } },
        select: { organization_id: true },
      }),
      prisma.access_user_project.findMany({
        where: { user_id: targetUserId, project_id: { in: scope.projectIds } },
        select: { project_id: true },
      }),
      prisma.access_user_product.findMany({
        where: { user_id: targetUserId, product_id: { in: scope.productIds } },
        select: { product_id: true },
      }),
    ]);

    const currentOrgIds = uniqueStrings(
      currentOrgAccess.map((a) => a.organization_id).filter(Boolean) as string[]
    );
    const currentProjectIds = uniqueStrings(
      currentProjectAccess.map((a) => a.project_id).filter(Boolean) as string[]
    );
    const currentProductIds = uniqueStrings(
      currentProductAccess.map((a) => a.product_id).filter(Boolean) as string[]
    );

    const desiredOrgIds = uniqueStrings(requiredOrganizationIds);
    const desiredProjectIds = uniqueStrings(requiredProjectIds);
    const desiredProductIds = uniqueStrings(requestedProductIds);

    const orgToRemove = currentOrgIds.filter((id) => !desiredOrgIds.includes(id));
    const orgToAdd = desiredOrgIds.filter((id) => !currentOrgIds.includes(id));

    const projectToRemove = currentProjectIds.filter((id) => !desiredProjectIds.includes(id));
    const projectToAdd = desiredProjectIds.filter((id) => !currentProjectIds.includes(id));

    const productToRemove = currentProductIds.filter((id) => !desiredProductIds.includes(id));
    const productToAdd = desiredProductIds.filter((id) => !currentProductIds.includes(id));

    const roleId = targetUser.role_id ?? null;

    await prisma.$transaction(async (tx) => {
      const txAny = tx as any;

      if (orgToRemove.length) {
        const projectsUnderRemovedOrgs = await tx.projects.findMany({
          where: { organization_id: { in: orgToRemove } },
          select: { id: true },
        });
        const projectIdsUnderRemovedOrgs = projectsUnderRemovedOrgs.map((p) => p.id);

        const productsUnderRemovedOrgs = projectIdsUnderRemovedOrgs.length
          ? await tx.products.findMany({
              where: { project_id: { in: projectIdsUnderRemovedOrgs } },
              select: { id: true },
            })
          : [];

        const productIdsUnderRemovedOrgs = productsUnderRemovedOrgs.map((p) => p.id);

        if (productIdsUnderRemovedOrgs.length) {
          await tx.access_user_product.deleteMany({
            where: { user_id: targetUserId, product_id: { in: productIdsUnderRemovedOrgs } },
          });
        }

        if (projectIdsUnderRemovedOrgs.length) {
          await txAny.access_user_project.deleteMany({
            where: { user_id: targetUserId, project_id: { in: projectIdsUnderRemovedOrgs } },
          });
        }

        await txAny.access_user_organization.deleteMany({
          where: { user_id: targetUserId, organization_id: { in: orgToRemove } },
        });
      }

      if (projectToRemove.length) {
        const productsUnderRemovedProjects = await tx.products.findMany({
          where: { project_id: { in: projectToRemove } },
          select: { id: true },
        });
        const productIdsUnderRemovedProjects = productsUnderRemovedProjects.map((p) => p.id);

        if (productIdsUnderRemovedProjects.length) {
          await tx.access_user_product.deleteMany({
            where: { user_id: targetUserId, product_id: { in: productIdsUnderRemovedProjects } },
          });
        }

        await txAny.access_user_project.deleteMany({
          where: { user_id: targetUserId, project_id: { in: projectToRemove } },
        });
      }

      if (productToRemove.length) {
        await tx.access_user_product.deleteMany({
          where: { user_id: targetUserId, product_id: { in: productToRemove } },
        });
      }

      if (orgToAdd.length) {
        await txAny.access_user_organization.createMany({
          data: orgToAdd.map((organizationId) => ({
            user_id: targetUserId,
            organization_id: organizationId,
            role_id: roleId,
            created_at: new Date(),
            updated_at: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      if (projectToAdd.length) {
        await txAny.access_user_project.createMany({
          data: projectToAdd.map((projectId) => ({
            user_id: targetUserId,
            project_id: projectId,
            role_id: roleId,
            created_at: new Date(),
            updated_at: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      if (productToAdd.length) {
        await tx.access_user_product.createMany({
          data: productToAdd.map((productId) => ({
            user_id: targetUserId,
            product_id: productId,
            role_id: roleId,
            created_at: new Date(),
            updated_at: new Date(),
          })),
          skipDuplicates: true,
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Accesos actualizados exitosamente',
      data: {
        user: { id: targetUserId },
        organizationIds: desiredOrgIds,
        projectIds: desiredProjectIds,
        productIds: desiredProductIds,
      },
    });
  } catch (error: any) {
    console.error('Error actualizando accesos del usuario (super_admin):', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
