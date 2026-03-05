import { cookies } from 'next/headers';
import { verifyAccessToken, JWTPayload } from './auth';

/**
 * Obtiene el usuario actual desde las cookies del servidor
 * Para usar en Server Components y API Routes
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access-token')?.value;
    
    if (!accessToken) {
      return null;
    }
    
    const decoded = verifyAccessToken(accessToken);
    return decoded;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Verifica si el usuario está autenticado
 * Para usar en Server Components
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Obtiene solo el userId del usuario actual
 * Función de conveniencia para casos simples
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.userId || null;
}