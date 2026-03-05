import prisma from '@/lib/database';

/**
 * Contexto del administrador con sus organizaciones, proyectos, productos y usuarios
 */
export interface AdminContext {
  userId: string;
  organizationIds: string[];
  projectIds: string[];
  productIds: string[];
  userIds: string[];
}

/**
 * Obtiene el contexto completo de un administrador:
 * - Organizaciones a las que tiene acceso
 * - Proyectos de esas organizaciones
 * - Productos de esos proyectos
 * - Usuarios con acceso a cualquiera de esos niveles
 */
export async function getAdminContext(adminUserId: string): Promise<AdminContext> {
  try {
    // 1. Obtener organizaciones del admin
    const adminOrganizations = await prisma.access_user_organization.findMany({
      where: { user_id: adminUserId },
      select: { organization_id: true }
    });

    const organizationIds = adminOrganizations
      .map(ao => ao.organization_id)
      .filter(Boolean) as string[];

    if (organizationIds.length === 0) {
      return {
        userId: adminUserId,
        organizationIds: [],
        projectIds: [],
        productIds: [],
        userIds: []
      };
    }

    // 2. Obtener proyectos de esas organizaciones
    const projects = await prisma.projects.findMany({
      where: { organization_id: { in: organizationIds } },
      select: { id: true }
    });

    const projectIds = projects.map(p => p.id);

    // 3. Obtener productos de esos proyectos
    const products = await prisma.products.findMany({
      where: { project_id: { in: projectIds } },
      select: { id: true }
    });

    const productIds = products.map(p => p.id);

    // 4. Obtener usuarios con acceso a organizaciones, proyectos o productos
    const userIdsFromOrg = await prisma.access_user_organization.findMany({
      where: { organization_id: { in: organizationIds } },
      select: { user_id: true },
      distinct: ['user_id']
    });

    const userIdsFromProject = await prisma.access_user_project.findMany({
      where: { project_id: { in: projectIds } },
      select: { user_id: true },
      distinct: ['user_id']
    });

    const userIdsFromProduct = await prisma.access_user_product.findMany({
      where: { product_id: { in: productIds } },
      select: { user_id: true },
      distinct: ['user_id']
    });

    // Combinar todos los IDs de usuarios (sin duplicados)
    const allUserIds = new Set<string>();
    userIdsFromOrg.forEach(u => u.user_id && allUserIds.add(u.user_id));
    userIdsFromProject.forEach(u => u.user_id && allUserIds.add(u.user_id));
    userIdsFromProduct.forEach(u => u.user_id && allUserIds.add(u.user_id));

    return {
      userId: adminUserId,
      organizationIds,
      projectIds,
      productIds,
      userIds: Array.from(allUserIds)
    };
  } catch (error) {
    console.error('Error obteniendo contexto del admin:', error);
    return {
      userId: adminUserId,
      organizationIds: [],
      projectIds: [],
      productIds: [],
      userIds: []
    };
  }
}
