import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { getAdminContext } from '@/lib/utils/admin-context';

async function adminCanManageUser(adminUserId: string, targetUserId: string) {
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

// PUT - Cambiar estado del usuario (activar/desactivar)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const userRole = (decoded.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    const userId = params.id;

    if (decoded.userId === userId) {
      return NextResponse.json(
        { success: false, message: 'No puedes desactivar tu propia cuenta.' },
        { status: 403 }
      );
    }

    const { is_active } = await request.json();

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'is_active debe ser un valor booleano' },
        { status: 400 }
      );
    }

    const canManage = await adminCanManageUser(decoded.userId, userId);
    if (!canManage) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado o no tienes permisos para modificarlo' },
        { status: 404 }
      );
    }

    const targetUser = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        role: { select: { name: true } }
      }
    });

    const targetRoleName = targetUser?.role?.name?.toLowerCase() || '';
    if (targetRoleName === 'admin' || targetRoleName === 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'No puedes cambiar el estado de usuarios administradores desde esta sección.' },
        { status: 403 }
      );
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        is_active,
        updated_at: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        email_verified: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Usuario ${is_active ? 'activado' : 'desactivado'} exitosamente`,
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Error cambiando estado del usuario:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
