import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Obtener el token del header Authorization o de las cookies
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.replace('Bearer ', '');
    const cookieToken = request.cookies.get('access-token')?.value;
    const token = bearerToken || cookieToken;

    // Obtener información de IP y User-Agent para logging
    const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    logger.info('Token verification attempt', {
      ip: ipAddress,
      userAgent,
      hasToken: !!token,
      timestamp: new Date().toISOString()
    });

    if (!token) {
      logger.warn('Token verification failed: no token provided', {
        ip: ipAddress,
        userAgent
      });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Token de acceso requerido',
          isAuthenticated: false 
        },
        { status: 401 }
      );
    }

    // Verificar el token
    const decoded = verifyAccessToken(token);
    const responseTime = Date.now() - startTime;

    if (!decoded) {
      logger.warn('Token verification failed: invalid token', {
        ip: ipAddress,
        userAgent,
        responseTime
      });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Token inválido o expirado',
          isAuthenticated: false 
        },
        { status: 401 }
      );
    }

    logger.info('Token verification successful', {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      isAdmin: decoded.isAdmin,
      ip: ipAddress,
      userAgent,
      responseTime
    });

    // Token válido - retornar información del usuario
    return NextResponse.json({
      success: true,
      message: 'Token válido',
      isAuthenticated: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
        isAdmin: decoded.isAdmin,
        clientId: decoded.clientId,
        primaryChatbotId: decoded.primaryChatbotId
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Token verification error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime,
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error interno del servidor',
        isAuthenticated: false 
      },
      { status: 500 }
    );
  }
}

// También soportar POST para compatibilidad
export async function POST(request: NextRequest) {
  return GET(request);
}