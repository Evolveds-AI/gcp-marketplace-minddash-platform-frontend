import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { getAdminContext } from '@/lib/utils/admin-context';
import { isAdminClientReadRole } from '@/lib/utils/admin-client-role';
import { backendClient } from '@/lib/api/backend-client';

// GET - Obtener detalle de un proyecto específico
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
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

    if (!isAdminClientReadRole(decoded.role)) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    const { projectId } = params;

    const adminContext = await getAdminContext(decoded.userId);

    if (!adminContext.projectIds.includes(projectId)) {
      const projectExists = await prisma.projects.findFirst({
        where: { id: projectId }
      });

      if (!projectExists) {
        return NextResponse.json(
          { success: false, message: 'Proyecto no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, message: 'No tienes acceso a este proyecto' },
        { status: 403 }
      );
    }

    const project = await prisma.projects.findFirst({
      where: { id: projectId },
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
            name: true,
            description: true,
            tipo: true,
            mensajes_mes: true,
            created_at: true,
            updated_at: true,
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
      }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

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

    const totalMessages = project.products.reduce((sum, product) =>
      sum + (product.mensajes_mes ?? 0),
      0
    );

    const projectResponse = {
      id: project.id,
      name: project.name,
      description: project.description,
      label: project.label,
      organization_id: project.organization_id,
      created_at: project.created_at,
      updated_at: project.updated_at,
      stats: {
        total_chatbots: project.products.length,
        total_users: uniqueUserIds.size,
        total_messages: totalMessages,
      },
      products: project.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        tipo: product.tipo,
        mensajes_mes: product.mensajes_mes ?? 0,
        created_at: product.created_at,
        updated_at: product.updated_at,
      }))
    };

    return NextResponse.json({
      success: true,
      project: projectResponse
    });

  } catch (error) {
    console.error('Error obteniendo proyecto:', error);
    return NextResponse.json(
      { success: false, message: 'Error al obtener proyecto' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar proyecto
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
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

    const { projectId } = params;
    const body = await request.json();
    const { name, description, label, label_color } = body;

    // Verificar que el proyecto existe
    const existingProject = await prisma.projects.findFirst({
      where: {
        id: projectId,
      }
    });

    if (!existingProject) {
      return NextResponse.json(
        { success: false, message: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar proyecto
    const updatedProject = await prisma.projects.update({
      where: {
        id: projectId
      },
      data: {
        name: name?.trim() || existingProject.name,
        description: description !== undefined ? (description?.trim() || null) : existingProject.description,
        label: label !== undefined ? (label?.trim() || null) : existingProject.label,
        label_color: label_color !== undefined ? (label_color?.trim() || null) : existingProject.label_color,
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

    try {
      await backendClient.updateProject({
        id: projectId,
        name: updatedProject.name,
        description: updatedProject.description ?? undefined,
      });
    } catch (syncError) {
      console.warn('No se pudo sincronizar proyecto con backend Python:', syncError);
    }

    return NextResponse.json({
      success: true,
      message: 'Proyecto actualizado exitosamente',
      project: updatedProject
    });

  } catch (error) {
    console.error('Error actualizando proyecto:', error);
    return NextResponse.json(
      { success: false, message: 'Error al actualizar proyecto' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar proyecto (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
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

    const { projectId } = params;

    // WORKAROUND: El stored procedure del backend tiene un bug que no borra los accesos
    // antes de borrar el proyecto. Usamos SQL directo para evitar constraint violation.
    try {
      // Borrar accesos del proyecto primero (SQL directo al backend)
      await prisma.$executeRawUnsafe(
        `DELETE FROM access_user_project WHERE project_id = $1::uuid`,
        projectId
      );
      
      // Borrar el proyecto (SQL directo al backend)
      await prisma.$executeRawUnsafe(
        `DELETE FROM projects WHERE id = $1::uuid`,
        projectId
      );
    } catch (sqlError: any) {
      console.error('Error al eliminar con SQL directo:', sqlError);
      throw new Error('Error al eliminar proyecto: ' + sqlError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Proyecto eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('Error eliminando proyecto:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al eliminar proyecto',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
