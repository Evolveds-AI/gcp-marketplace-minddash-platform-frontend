import { NextRequest, NextResponse } from 'next/server';

function normalizeRole(role?: string | null): string {
  if (!role) return '';
  const sanitized = role.trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (sanitized === 'superadmin') {
    return 'super_admin';
  }
  return sanitized;
}

function redirectToLoginWithCallback(request: NextRequest): NextResponse {
  const fullPath = request.nextUrl.pathname + request.nextUrl.search;
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('callbackUrl', fullPath);

  const response = NextResponse.redirect(loginUrl);
  response.cookies.set('post-login-redirect', encodeURIComponent(fullPath), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}

/**
 * Middleware para manejar redirects basados en roles
 * Verifica que los usuarios accedan a los paneles correctos según su rol
 */
export function handleRoleBasedRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  
  // Rutas que requieren autenticación (no solo admin)
  const isProtectedRoute = 
    pathname.startsWith('/admin') || 
    pathname.startsWith('/dashboard/admin') ||
    pathname.startsWith('/chatbot/') ||
    pathname.startsWith('/selector');
  
  if (!isProtectedRoute) {
    return null;
  }

  // Obtener el token desde las cookies (si existe)
  const token = request.cookies.get('access-token')?.value;
  
  if (!token) {
    // Si no hay token, redirigir a login con callbackUrl
    return redirectToLoginWithCallback(request);
  }

  try {
    // Intentar decodificar el token para obtener información del rol
    // Nota: En un entorno real, deberías verificar el token adecuadamente
    const base64Payload = token.split('.')[1];
    if (!base64Payload) {
      return redirectToLoginWithCallback(request);
    }
    
    const payload = JSON.parse(atob(base64Payload));
    const userRole = normalizeRole(payload.role || payload.iam_role);

    // Verificar acceso a /admin (solo super_admin)
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-client')) {
      if (userRole !== 'super_admin') {
        // Redirigir admins normales a su panel limitado
        if (userRole === 'admin') {
          return NextResponse.redirect(new URL('/dashboard/admin', request.url));
        }
        // Otros usuarios al dashboard de usuario
        return NextResponse.redirect(new URL('/dashboard/user', request.url));
      }
    }

    const isAdminPanel = pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/');
    if (isAdminPanel) {
      const normalizedUserRole = normalizeRole(userRole);
      if (normalizedUserRole !== 'admin' && normalizedUserRole !== 'super_admin' && normalizedUserRole !== 'editor') {
        return NextResponse.redirect(new URL('/not-found', request.url));
      }
      return null;
    }

    return null; // Permitir acceso
  } catch (error) {
    console.error('Error parsing token for role verification:', error);
    // En caso de error, redirigir a login por seguridad con callbackUrl
    return redirectToLoginWithCallback(request);
  }
}

/**
 * Rutas que requieren verificación de roles
 */
export const ROLE_PROTECTED_ROUTES = [
  '/admin',
  '/admin/*',
  '/dashboard/admin',
  '/dashboard/admin/*',
];