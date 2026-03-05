import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateTokens } from '@/lib/auth';
import { Pool } from 'pg';

export async function POST(request: NextRequest) {
  try {
    let refreshToken: string | undefined;
    let cookieRefreshToken: string | undefined;

    try {
      const body = await request.json();
      refreshToken = body?.refreshToken;
    } catch {}

    cookieRefreshToken = request.cookies.get('refresh-token')?.value;
    if (!refreshToken && cookieRefreshToken) {
      refreshToken = cookieRefreshToken;
    }

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token requerido' },
        { status: 400 }
      );
    }

    // Verificar refresh token (stateless)
    let tokenData = verifyRefreshToken(refreshToken);
    if (!tokenData && cookieRefreshToken && cookieRefreshToken !== refreshToken) {
      tokenData = verifyRefreshToken(cookieRefreshToken);
    }
    if (!tokenData) {
      return NextResponse.json(
        { success: false, message: 'Refresh token inválido' },
        { status: 401 }
      );
    }

    // Intentar obtener datos del usuario; si falla, usar datos del token
    let user: any = null;
    try {
      if (process.env.DATABASE_URL) {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });
        const userQuery = `
          SELECT 
            u.id,
            u.username,
            u.email,
            u.iam_role,
            u.client_id,
            u.is_active,
            u.primary_chatbot_id,
            u.can_manage_users,
            e.nombre as client_nombre
          FROM usuarios u
          JOIN client e ON u.client_id = e.id
          WHERE u.id = $1 AND u.is_active = true
        `;
        const userResult = await pool.query(userQuery, [tokenData.userId]);
        user = userResult.rows[0] || null;
      }
    } catch (dbError) {
      // Fallback a datos del token
      user = null;
    }

    const tokenPayload = user ? {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.iam_role,
      isAdmin: user.iam_role === 'super_admin',
      clientId: user.client_id,
      primaryChatbotId: user.primary_chatbot_id,
      canManageUsers: user.can_manage_users || false
    } : {
      userId: tokenData.userId,
      username: tokenData.username,
      email: tokenData.email,
      role: tokenData.role,
      isAdmin: tokenData.isAdmin,
      clientId: tokenData.clientId,
      primaryChatbotId: tokenData.primaryChatbotId,
    } as any;

    const newTokens = generateTokens(tokenPayload as any, tokenData.sessionId);

    const response = NextResponse.json({
      success: true,
      message: 'Tokens renovados exitosamente',
      tokens: newTokens,
      user: user ? {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.iam_role,
        isAdmin: user.iam_role === 'super_admin',
        clientId: user.client_id,
        primaryChatbotId: user.primary_chatbot_id,
        canManageUsers: user.can_manage_users || false
      } : undefined
    });

    response.cookies.set('access-token', newTokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60
    });

    response.cookies.set('refresh-token', newTokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60
    });

    return response;

  } catch (error) {
    console.error('Error en refresh:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}