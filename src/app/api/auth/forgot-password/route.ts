import { NextRequest, NextResponse } from 'next/server';
import { generatePasswordResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import prisma from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email es requerido' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    // Buscar usuario
    const user = await prisma.users.findUnique({
      where: { email, is_active: true }
    });

    // Siempre devolver success para evitar enumeración de emails
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.'
      });
    }

    // Generar token de reset
    const resetToken = await generatePasswordResetToken(email);
    
    if (resetToken) {
      // Enviar email de reset
      try {
        await sendPasswordResetEmail(email, user.username, resetToken);
      } catch (emailError) {
        console.error('Error enviando email de reset:', emailError);
        return NextResponse.json(
          { success: false, message: 'Error enviando email. Intenta más tarde.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.'
    });

  } catch (error) {
    console.error('Error en forgot-password:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}