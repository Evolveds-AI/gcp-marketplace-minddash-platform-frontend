import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/database';
import { getAdminContext } from '@/lib/utils/admin-context';

const prismaAny = prisma as any;

/**
 * Verifica si un admin puede gestionar a un usuario específico
 * basándose en las relaciones de access_user_client
 */
async function adminCanManageUser(adminUserId: string, targetUserId: string): Promise<boolean> {
  const adminContext = await getAdminContext(adminUserId);
  if (adminContext.userIds.length > 0 && adminContext.userIds.includes(targetUserId)) {
    return true;
  }

  const [adminClientAccess, targetClientAccess] = await Promise.all([
    prisma.access_user_client.findMany({
      where: { user_id: adminUserId },
      select: { client_id: true },
    }),
    prisma.access_user_client.findMany({
      where: { user_id: targetUserId },
      select: { client_id: true },
    }),
  ]);

  const adminClientIds = adminClientAccess
    .map((a) => a.client_id)
    .filter(Boolean) as string[];
  const targetClientIds = targetClientAccess
    .map((a) => a.client_id)
    .filter(Boolean) as string[];

  if (adminClientIds.length === 0) {
    return false;
  }

  return targetClientIds.some((id) => adminClientIds.includes(id));
}

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT - Actualizar usuario
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = params;
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

    // LIMITACIÓN 1: Solo admin o super_admin del cliente puede modificar usuarios
    const userRole = (decoded.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    // LIMITACIÓN 3: Prevenir auto-modificación
    if (decoded.userId === userId) {
      return NextResponse.json(
        { success: false, message: 'No puedes modificar tu propia cuenta.' },
        { status: 403 }
      );
    }

    // Verificar que el admin puede gestionar este usuario (usando access_user_client)
    const canManage = await adminCanManageUser(decoded.userId, userId);
    if (!canManage) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para modificar este usuario.' },
        { status: 403 }
      );
    }

    // Obtener información del usuario objetivo incluyendo su rol
    const targetUser = await prismaAny.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: {
          select: { name: true }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // LIMITACIÓN 2: No puede modificar otros admins (excepto super_admin puede modificar admins)
    const targetRoleName = targetUser.role?.name?.toLowerCase() || '';
    if (targetRoleName === 'super_admin' || targetRoleName === 'admin') {
      return NextResponse.json(
        { success: false, message: 'No puedes modificar usuarios administradores desde esta sección.' },
        { status: 403 }
      );
    }

    const { username, email, password, is_active } = await request.json();

    // Verificar unicidad de username y email (excluyendo el usuario actual)
    if (username || email) {
      const existingUser = await prisma.users.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                username ? { username: username } : {},
                email ? { email: email } : {}
              ].filter(condition => Object.keys(condition).length > 0)
            }
          ]
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: 'Username o email ya están en uso' },
          { status: 400 }
        );
      }
    }

    // Preparar datos de actualización
    const updateData: any = {
      updated_at: new Date()
    };

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) updateData.password_hash = await bcrypt.hash(password, 12);
    if (typeof is_active === 'boolean') updateData.is_active = is_active;

    const updatedUser = await prismaAny.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        iam_role: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        email_verified: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario (soft delete o hard delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = params;
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    // Obtener el parámetro action de la query string
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'deactivate'; // default: soft delete
    
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

    // LIMITACIÓN 1: Solo admin o super_admin del cliente puede eliminar usuarios
    const userRole = (decoded.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    // LIMITACIÓN 3: Prevenir auto-eliminación
    if (decoded.userId === userId) {
      return NextResponse.json(
        { success: false, message: 'No puedes eliminar tu propia cuenta.' },
        { status: 403 }
      );
    }

    // Verificar que el admin puede gestionar este usuario (usando access_user_client)
    const canManage = await adminCanManageUser(decoded.userId, userId);
    if (!canManage) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para eliminar este usuario.' },
        { status: 403 }
      );
    }

    // Obtener información del usuario objetivo incluyendo su rol
    const targetUser = await prismaAny.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: {
          select: { name: true }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // LIMITACIÓN 2: No puede eliminar otros admins (excepto super_admin puede eliminar admins)
    const targetRoleName = targetUser.role?.name?.toLowerCase() || '';
    if (targetRoleName === 'super_admin' || targetRoleName === 'admin') {
      return NextResponse.json(
        { success: false, message: 'No puedes eliminar usuarios administradores desde esta sección.' },
        { status: 403 }
      );
    }

    if (action === 'permanent') {
      // HARD DELETE: Eliminar completamente de la base de datos
      
      // Eliminar registros relacionados primero para mantener integridad referencial
      // 1. Intentar eliminar UserAccessCode asociados (CUITs) si el modelo existe
      try {
        if (prismaAny.userAccessCode) {
          await prismaAny.userAccessCode.deleteMany({
            where: { usuario_id: userId }
          });
        }
      } catch (e) {
        // El modelo UserAccessCode puede no existir en este schema
        console.log('UserAccessCode model not available, skipping...');
      }

      // 2. Eliminar TODAS las relaciones de acceso (hay múltiples tablas con FK a users)
      await Promise.all([
        // Tablas access_user_*
        prismaAny.access_user_client.deleteMany({ where: { user_id: userId } }).catch(() => {}),
        prismaAny.access_user_organization.deleteMany({ where: { user_id: userId } }).catch(() => {}),
        prismaAny.access_user_project.deleteMany({ where: { user_id: userId } }).catch(() => {}),
        prismaAny.access_user_product.deleteMany({ where: { user_id: userId } }).catch(() => {}),
        // Tablas access_users_* (variantes)
        prismaAny.access_users_clients?.deleteMany({ where: { user_id: userId } }).catch(() => {}),
        prismaAny.access_users_data?.deleteMany({ where: { user_id: userId } }).catch(() => {}),
        prismaAny.access_users_product?.deleteMany({ where: { user_id: userId } }).catch(() => {}),
        // Otras tablas con FK a users
        prismaAny.user_data_access?.deleteMany({ where: { user_id: userId } }).catch(() => {}),
        prismaAny.message_whatsapp?.deleteMany({ where: { user_id: userId } }).catch(() => {}),
        prismaAny.user_states?.deleteMany({ where: { user_id: userId } }).catch(() => {}),
      ]);

      // 3. Eliminar el usuario completamente
      await prismaAny.users.delete({
        where: { id: userId }
      });

      return NextResponse.json({
        success: true,
        message: 'Usuario eliminado permanentemente de la base de datos'
      });

    } else {
      // SOFT DELETE: Marcar como inactivo (comportamiento por defecto)
      await prismaAny.users.update({
        where: { id: userId },
        data: {
          is_active: false,
          updated_at: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Usuario desactivado exitosamente'
      });
    }

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';