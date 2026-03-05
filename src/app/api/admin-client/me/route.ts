import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { isAdminClientReadRole } from '@/lib/utils/admin-client-role';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    if (!isAdminClientReadRole(decoded.role)) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar_data: true,
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarData: user.avatar_data,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching me profile:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    if (!isAdminClientReadRole(decoded.role)) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const username: string | undefined = typeof body?.username === 'string' ? body.username.trim() : undefined;
    const email: string | undefined = typeof body?.email === 'string' ? body.email.trim() : undefined;
    const avatarData: string | null | undefined = Object.prototype.hasOwnProperty.call(body ?? {}, 'avatarData')
      ? (body?.avatarData ?? null)
      : undefined;
    const currentPassword: string | undefined = typeof body?.currentPassword === 'string' ? body.currentPassword : undefined;
    const password: string | undefined = typeof body?.password === 'string' ? body.password : undefined;

    const existing = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true, password_hash: true }
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    if (username || email) {
      const conflict = await prisma.users.findFirst({
        where: {
          AND: [
            { id: { not: decoded.userId } },
            {
              OR: [
                username ? { username } : undefined,
                email ? { email } : undefined,
              ].filter(Boolean) as any
            }
          ]
        },
        select: { id: true }
      });

      if (conflict) {
        return NextResponse.json(
          { success: false, message: 'Username o email ya están en uso' },
          { status: 400 }
        );
      }
    }

    const updateData: any = { updated_at: new Date() };
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (avatarData !== undefined) updateData.avatar_data = avatarData;

    if (password && password.trim().length > 0) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: 'Debes ingresar tu contraseña actual para cambiarla' },
          { status: 400 }
        );
      }

      if (!existing.password_hash) {
        return NextResponse.json({ success: false, message: 'No se puede cambiar la contraseña' }, { status: 400 });
      }

      const ok = await bcrypt.compare(currentPassword, existing.password_hash);
      if (!ok) {
        return NextResponse.json({ success: false, message: 'Contraseña actual incorrecta' }, { status: 400 });
      }

      updateData.password_hash = await bcrypt.hash(password, 12);
    }

    const updated = await prisma.users.update({
      where: { id: decoded.userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        avatar_data: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        profile: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
          avatarData: updated.avatar_data,
        }
      }
    });
  } catch (error) {
    console.error('Error updating me profile:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
