import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from './database';
import { logger } from './logger';
import { roleToLegacy } from './utils/role-helpers';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
const SALT_ROUNDS = 12;

const prismaAny = prisma as any;

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: string; // iam_role (super_admin, admin, user)
  isAdmin: boolean;
  sessionId: string;
  primaryChatbotId?: string; // para chatbot_owners
  clientId?: string;
  client_id?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  internalError?: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    role: string; // iam_role (super_admin, admin, user)
    isAdmin: boolean;
    primaryChatbotId?: string; // para chatbot_owners
    clientId?: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

// Hashear password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Verificar password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Generar tokens JWT (stateless)
export function generateTokens(payload: Omit<JWTPayload, 'sessionId'>, sessionId: string): {
  accessToken: string;
  refreshToken: string;
} {
  const tokenPayload = { ...payload, sessionId };
  
  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: '1h',
    issuer: 'evolve-chatbot',
    subject: payload.userId
  });
  
  const refreshToken = jwt.sign(tokenPayload, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    issuer: 'evolve-chatbot',
    subject: payload.userId
  });
  
  return { accessToken, refreshToken };
}

// Verificar token JWT (stateless)
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Verificar refresh token JWT (stateless)
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Error verifying refresh token:', error);
    return null;
  }
}

// Manejar intentos fallidos
export async function incrementFailedAttempts(userId: string): Promise<void> {
  try {
    const userResult = await prisma.$queryRaw`
      SELECT failed_attempts
      FROM users 
      WHERE id = ${userId}::uuid
      LIMIT 1;
    ` as any[];
    
    if (userResult && userResult.length > 0) {
      const user = userResult[0];
      const newFailedAttempts = user.failed_attempts + 1;
      const shouldLock = newFailedAttempts >= 5;
      const lockUntil = shouldLock ? new Date(Date.now() + 10 * 60 * 1000) : null;
      
      await prisma.$executeRaw`
        UPDATE users 
        SET failed_attempts = ${newFailedAttempts}, 
            locked_until = ${lockUntil}
        WHERE id = ${userId}::uuid;
      `;
    }
  } catch (error) {
    console.error('Error incrementing failed attempts:', error);
  }
}

// Resetear intentos fallidos
export async function resetFailedAttempts(userId: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE users 
      SET failed_attempts = 0, 
          locked_until = NULL
      WHERE id = ${userId}::uuid;
    `;
  } catch (error) {
    console.error('Error resetting failed attempts:', error);
  }
}

// Verificar si usuario está bloqueado
export async function isUserLocked(userId: string): Promise<boolean> {
  try {
    const userResult = await prisma.$queryRaw`
      SELECT failed_attempts, locked_until
      FROM users 
      WHERE id = ${userId}::uuid
      LIMIT 1;
    ` as any[];

    if (!userResult || userResult.length === 0) return false;

    const user = userResult[0];
    
    if (user.locked_until) {
      return new Date() < new Date(user.locked_until);
    }

    return false;
  } catch (error) {
    console.error('Error checking if user is locked:', error);
    return false;
  }
}

// Login function (stateless)
export async function loginUser(
  usernameOrEmail: string, 
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResponse> {
  try {
    logger.debug('loginUser: Iniciando login para:', { usernameOrEmail });
    
    // Buscar usuario por username o email con su rol
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail },
          { email: usernameOrEmail }
        ],
        is_active: true
      },
      include: {
        role: true,
        access_user_client: {
          select: {
            client_id: true
          }
        }
      }
    });

    logger.debug('loginUser: Resultado de búsqueda', { found: !!user });

    if (!user) {
      return {
        success: false,
        message: 'Credenciales inválidas'
      };
    }

    const legacyRole = (() => {
      // Priorizar name sobre type_role ya que name es más confiable
      const raw = ((user as any)?.role?.name || (user as any)?.role?.type_role || '') as string;
      const trimmed = String(raw || '').trim();
      if (!trimmed) return 'user';
      const lower = trimmed.toLowerCase();
      if (lower === 'superadmin' || lower === 'super_admin' || lower === 'admin' || lower === 'user' || lower === 'editor' || lower === 'viewer') {
        return lower === 'superadmin' ? 'super_admin' : lower;
      }
      return roleToLegacy(trimmed);
    })();

    // Verificar si está bloqueado
    if (await isUserLocked(user.id)) {
      logger.debug('loginUser: Usuario bloqueado', { userId: user.id });
      return {
        success: false,
        message: 'Cuenta bloqueada temporalmente. Intenta más tarde.'
      };
    }

    // Verificar password
    if (!user.password_hash) {
      return {
        success: false,
        message: 'Credenciales inválidas'
      };
    }
    
    // Verificar que el usuario tenga email
    if (!user.email) {
      return {
        success: false,
        message: 'Credenciales inválidas'
      };
    }
    
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      await incrementFailedAttempts(user.id);
      return {
        success: false,
        message: 'Credenciales inválidas'
      };
    }

    // Resetear intentos fallidos si login exitoso
    await resetFailedAttempts(user.id);
    
    const isAdmin = legacyRole === 'super_admin' || legacyRole === 'admin';
    
    // Generar session ID único
    const sessionId = uuidv4();
    
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: legacyRole,
      isAdmin: isAdmin,
      primaryChatbotId: user.primary_chatbot_id || undefined, // convertir null a undefined
      clientId: (user as any)?.access_user_client?.[0]?.client_id || undefined,
      client_id: (user as any)?.access_user_client?.[0]?.client_id || undefined,
    };

    const tokens = generateTokens(tokenPayload, sessionId);

    return {
      success: true,
      message: 'Login exitoso',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: legacyRole,
        isAdmin: isAdmin,
        primaryChatbotId: user.primary_chatbot_id || undefined, // convertir null a undefined
        clientId: (user as any)?.access_user_client?.[0]?.client_id || undefined,
      },
      tokens
    };

  } catch (error) {
    logger.error('loginUser: internal error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      usernameOrEmail,
      ipAddress,
      userAgent,
    });
    return {
      success: false,
      message: 'Error interno del servidor',
      internalError: true,
    };
  }
}

// Generar token de reset de password
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  const user = await prisma.users.findUnique({
    where: { email, is_active: true }
  });
  
  if (!user) return null;
  
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  
  await prismaAny.password_resets.create({
    data: {
      id: uuidv4(),
      usuario_id: user.id,
      token,
      expires_at: expiresAt
    }
  });
  
  return token;
}

// Verificar token de reset de password
export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const resetRecord = await prismaAny.password_resets.findFirst({
    where: {
      token,
      used: false,
      expires_at: {
        gt: new Date()
      }
    }
  });
  
  return resetRecord?.usuario_id || null;
}

// Cambiar password
export async function changePassword(userId: string, newPassword: string): Promise<boolean> {
  try {
    const hashedPassword = await hashPassword(newPassword);
    
    await prisma.users.update({
    where: { id: userId },
    data: { password_hash: hashedPassword }
  });
    
    return true;
  } catch (error) {
    console.error('Error changing password:', error);
    return false;
  }
}

// Marcar token de reset como usado
export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
  await prismaAny.password_resets.updateMany({
    where: { token },
    data: { used: true }
  });
}

// Configuración de NextAuth
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const result = await loginUser(credentials.username, credentials.password);
        
        if (result.success && result.user) {
          return {
            id: result.user.id,
            name: result.user.username,
            email: result.user.email,
            role: result.user.role,
            isAdmin: result.user.isAdmin,
            primaryChatbotId: result.user.primaryChatbotId
          } as any;
        }
        
        return null;
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.isAdmin = user.isAdmin;
        token.primaryChatbotId = user.primaryChatbotId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.primaryChatbotId = token.primaryChatbotId as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login'
  }
};
