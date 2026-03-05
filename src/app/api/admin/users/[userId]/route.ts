import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { verifyAccessToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
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

    // Solo super_admin puede actualizar usuarios desde este endpoint
    const userRole = (decoded.role || '').toLowerCase();
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo super administradores.' },
        { status: 403 }
      );
    }

    const { userId } = params;
    const { username, email, password, iam_role, is_active, client_id } = await request.json();

    // Verificar que el usuario existe
    const existingUser = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Preparar datos para actualizar
    const updateData: any = {
      updated_at: new Date()
    };

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;

    // Si se proporciona contraseña, hashearla
    if (password && password.trim()) {
      updateData.password_hash = await bcrypt.hash(password, 12);
    }

    // Si se proporciona rol, buscar el role_id
    if (iam_role) {
      const roleName = iam_role.toLowerCase();
      const roleRecord = await prisma.roles.findFirst({
        where: {
          name: {
            equals: roleName,
            mode: 'insensitive'
          }
        }
      });
      if (roleRecord) {
        updateData.role_id = roleRecord.id;
      }
    }

    // Actualizar usuario
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        is_active: true,
        updated_at: true,
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Si se especificó client_id, actualizar la relación
    if (client_id !== undefined) {
      // Eliminar relaciones existentes
      await prisma.access_user_client.deleteMany({
        where: { user_id: userId }
      });

      // Crear nueva relación si se proporcionó client_id
      if (client_id) {
        await prisma.access_user_client.create({
          data: {
            user_id: userId,
            client_id: client_id,
            role_id: updatedUser.role?.id || undefined,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        iam_role: updatedUser.role?.name?.toUpperCase() || 'USER',
        is_active: updatedUser.is_active
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Error actualizando usuario', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
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

    // Solo super_admin puede eliminar usuarios
    const userRole = (decoded.role || '').toLowerCase();
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo super administradores.' },
        { status: 403 }
      );
    }

    const { userId } = params;

    // Verificar que el usuario existe
    const existingUser = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar relaciones primero
    await prisma.$transaction([
      prisma.access_user_client.deleteMany({
        where: { user_id: userId }
      }),
      prisma.access_user_organization.deleteMany({
        where: { user_id: userId }
      }),
      prisma.access_user_project.deleteMany({
        where: { user_id: userId }
      }),
      prisma.access_user_product.deleteMany({
        where: { user_id: userId }
      }),
      prisma.user_data_access.deleteMany({
        where: { user_id: userId }
      }),
      prisma.users.delete({
        where: { id: userId }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
      data: { id: userId }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Error eliminando usuario', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { userId: string } }) {
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

    // Solo super_admin puede cambiar estado de usuarios
    const userRole = (decoded.role || '').toLowerCase();
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo super administradores.' },
        { status: 403 }
      );
    }

    const { userId } = params;
    const body = await request.json().catch(() => ({}));
    const status = body?.status || 'active';
    const is_active = status === 'active';

    // Actualizar estado del usuario
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        is_active: is_active,
        updated_at: new Date()
      },
      select: {
        id: true,
        username: true,
        is_active: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Usuario ${is_active ? 'activado' : 'desactivado'} exitosamente`,
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        status: updatedUser.is_active ? 'active' : 'inactive'
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { success: false, error: 'Error actualizando estado', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
