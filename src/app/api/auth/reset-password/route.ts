import { NextRequest, NextResponse } from 'next/server';
import { verifyPasswordResetToken, hashPassword } from '@/lib/auth';
import { sendPasswordChangedNotification } from '@/lib/email';
import prisma from '@/lib/database';
import bcrypt from 'bcryptjs';

const prismaAny = prisma as any;

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Token y nueva contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Validar longitud de password
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Verificar token de reset
    const userId = await verifyPasswordResetToken(token);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Token inválido o expirado' },
        { status: 400 }
      );
    }

    // Obtener usuario
    const user = await prisma.users.findUnique({
      where: { id: userId, is_active: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Hashear nueva contraseña
    const passwordHash = await hashPassword(newPassword);

    // Actualizar contraseña y resetear intentos fallidos
    await prisma.users.update({
      where: { id: userId },
      data: {
        password_hash: passwordHash,
        failed_attempts: 0,
        locked_until: null
      }
    });

    // Marcar token como usado
    await prismaAny.password_resets.update({
      where: { token },
      data: { used: true }
    });

    // En sistema stateless, no necesitamos invalidar sesiones
    // Los JWT tokens existentes expirarán automáticamente

    // Enviar notificación de cambio de contraseña
    try {
      if (user.email) {
        await sendPasswordChangedNotification(user.email, user.username);
      }
    } catch (emailError) {
      console.error('Error enviando notificación de cambio:', emailError);
      // No falla la operación si no se puede enviar el email
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente. Puedes iniciar sesión con tu nueva contraseña.'
    });

  } catch (error) {
    console.error('Error en reset-password:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}