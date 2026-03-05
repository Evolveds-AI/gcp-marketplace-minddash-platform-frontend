import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/utils/email-verification';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ 
        error: 'Token requerido' 
      }, { status: 400 });
    }

    const result = await verifyEmailToken(token);

    if (result.success) {
      return NextResponse.json({
        message: 'Email verificado exitosamente',
        userId: result.userId
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en verificación de email:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
} 