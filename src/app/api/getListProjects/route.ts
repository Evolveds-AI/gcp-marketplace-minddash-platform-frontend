import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/getListProjects?organizationId={id}
 * Obtiene la lista de proyectos de una organización
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

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: 'organizationId es requerido' },
        { status: 400 }
      );
    }

    // Obtener proyectos desde el backend Python
    const projects = await backendClient.getProjectsByOrganization(organizationId);

    return NextResponse.json({
      success: true,
      projects: projects || []
    });

  } catch (error: any) {
    console.error('[GetListProjects] Error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener proyectos',
        projects: [],
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
