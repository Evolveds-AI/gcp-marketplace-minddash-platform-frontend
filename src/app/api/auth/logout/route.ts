import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    // En un sistema stateless, el logout es simplemente limpiar cookies
    // El token se invalida en el frontend al eliminarlo del localStorage
    
    const response = NextResponse.json({
      success: true,
      message: 'Logout exitoso'
    });

    // Limpiar cookies de tokens si existen
    response.cookies.set('access-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0 // Expira inmediatamente
    });

    response.cookies.set('refresh-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0 // Expira inmediatamente
    });

    return response;

  } catch (error) {
    console.error('Error en API logout:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 