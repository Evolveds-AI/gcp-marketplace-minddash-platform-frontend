import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/user
 * Obtiene proyectos del usuario autenticado desde el backend Python
 * Necesario para mostrar selector de proyectos al crear productos
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token requerido' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    // WORKAROUND: Usar getListProject que trae TODOS los proyectos sin filtrar por acceso
    // Esto es temporal hasta que se asigne acceso a todos los proyectos existentes en BD
    // TODO: Asignar acceso a proyectos existentes y revertir a backendClient.getProjectsByUser()
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
      'https://backend-service-dev-minddash-294493969622.us-central1.run.app';
    
    // Agregar timestamp para evitar caché
    const timestamp = Date.now();
    const response = await fetch(`${backendUrl}/projects/getListProject?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    const projects = await response.json();

    return NextResponse.json({
      success: true,
      projects
    });

  } catch (error: any) {
    console.error('Error obteniendo proyectos:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener proyectos',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
