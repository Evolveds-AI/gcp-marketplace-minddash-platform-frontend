import { NextRequest, NextResponse } from 'next/server';
import { handleUrlRedirects } from './src/middleware/urlRedirects';
import { handleRoleBasedRedirect } from './src/middleware/roleBasedRedirect';

export function middleware(request: NextRequest) {
  // Hardening: no permitir credenciales en query params en /login
  // Esto evita exposición en URL/history/Referer/logs.
  if (request.nextUrl.pathname === '/login') {
    const nextUrl = request.nextUrl.clone();
    const hasSensitive = nextUrl.searchParams.has('password') || nextUrl.searchParams.has('username');
    if (hasSensitive) {
      nextUrl.searchParams.delete('password');
      nextUrl.searchParams.delete('username');
      return NextResponse.redirect(nextUrl);
    }
  }

  // Manejar redirects de URLs optimizadas
  const redirectResponse = handleUrlRedirects(request);
  if (redirectResponse) {
    return redirectResponse;
  }

  // Manejar redirects basados en roles
  const roleRedirectResponse = handleRoleBasedRedirect(request);
  if (roleRedirectResponse) {
    return roleRedirectResponse;
  }

  // Continuar con el procesamiento normal
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};