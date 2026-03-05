import { NextRequest, NextResponse } from 'next/server';
import { resendVerificationEmail } from '@/lib/utils/email-verification';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ 
        error: 'Email requerido' 
      }, { status: 400 });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Formato de email inválido' 
      }, { status: 400 });
    }

    const result = await resendVerificationEmail(email);

    if (result.success) {
      return NextResponse.json({
        message: 'Email de verificación reenviado exitosamente'
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error reenviando email de verificación:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
} 