import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware para manejar redirects de URLs antiguas a nuevas
 * Mantiene compatibilidad con rutas reorganizadas del dashboard y productos
 */
export function handleUrlRedirects(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // Redirects para rutas del dashboard reorganizadas
  const dashboardRedirects = [
    // Comentado: { from: /^\/admin-client(\/.*)?$/, to: '/dashboard/admin$1' },
    { from: /^\/client\/([^/]+)(\/.*)?$/, to: '/dashboard/client/$1$2' },
    { from: /^\/user-dashboard(\/.*)?$/, to: '/dashboard/user$1' }
  ];
  
  for (const redirect of dashboardRedirects) {
    const match = pathname.match(redirect.from);
    if (match) {
      const newPath = pathname.replace(redirect.from, redirect.to);
      const newUrl = new URL(newPath, request.url);
      newUrl.search = request.nextUrl.search;
      
      // Redirect permanente (301) para SEO y cache
      return NextResponse.redirect(newUrl, 301);
    }
  }
  
  return null;
}

/**
 * Lista de rutas que necesitan redirect por reorganización
 */
export const REDIRECT_ROUTES = [
  // Redirects del dashboard
  // Comentado: '/admin-client',
  // Comentado: '/admin-client/*',
  '/client/[clientId]',
  '/client/[clientId]/*',
  '/user-dashboard',
  '/user-dashboard/*',
  // Redirects de productos
  '/api/admin-client/products/[productId]',
  '/api/admin-client/products/[productId]/status',
  '/api/admin-client/products/[productId]/knowledge-files',
  '/api/admin-client/products/[productId]/files',
  '/api/admin-client/products/[productId]/personality'
];