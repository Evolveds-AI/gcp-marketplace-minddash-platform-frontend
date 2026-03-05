import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { username, password } = await request.json();

    // Obtener información de IP y User-Agent
    const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    logger.info('Login attempt received', {
      username,
      ip: ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });

    if (!username || !password) {
      logger.warn('Login failed: missing credentials', {
        username,
        ip: ipAddress,
        userAgent
      });
      return NextResponse.json(
        { success: false, message: 'Username y password son requeridos' },
        { status: 400 }
      );
    }

    const result = await loginUser(username, password, ipAddress, userAgent);
    const responseTime = Date.now() - startTime;

    if (!result.success) {
      logger.warn('Login failed: invalid credentials', {
        username,
        ip: ipAddress,
        userAgent,
        responseTime,
        reason: result.message
      });
      const status = result.internalError ? 500 : 401;
      return NextResponse.json(result, { status });
    }

    logger.info('Login successful', {
      username,
      ip: ipAddress,
      userAgent,
      responseTime,
      userId: result.user?.id,
      isAdmin: result.user?.isAdmin || false
    });

    // Configurar cookies con tokens (opcional, alternativa a localStorage)
    const response = NextResponse.json(result);
    
    if (result.tokens) {
      // Configurar cookies seguras
      response.cookies.set('access-token', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 // 1 hora
      });

      response.cookies.set('refresh-token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 // 7 días
      });
    }

    return response;

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime,
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}