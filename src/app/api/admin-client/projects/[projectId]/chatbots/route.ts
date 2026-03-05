import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

// GET - Obtener chatbots de un proyecto específico
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
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

    const userRole = (decoded.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'editor') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado.' },
        { status: 403 }
      );
    }

    const { projectId } = params;

    // Validar acceso al proyecto usando getProjectsByUser
    const userProjects = await backendClient.getProjectsByUser(decoded.userId);
    const hasAccess = userProjects.some((p: any) => p.project_id === projectId);

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Proyecto no encontrado o sin acceso' },
        { status: 403 }
      );
    }

    // Obtener productos del usuario para este proyecto
    const userProducts = await backendClient.getProductsByUser(decoded.userId);
    const projectProducts = userProducts.filter(
      (p: any) => p.project_id === projectId
    );

    // Mapear productos al formato esperado
    const chatbots = projectProducts.map((p: any) => ({
      id: p.product_id,
      name: p.product_name,
      description: p.product_description,
      tipo: null,
      mensajes_mes: 0,
      usuarios_asignados: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      project: {
        id: projectId,
        name: 'Proyecto'
      },
      chatbots
    });

  } catch (error) {
    console.error('Error obteniendo chatbots del proyecto:', error);
    return NextResponse.json(
      { success: false, message: 'Error al obtener chatbots' },
      { status: 500 }
    );
  }
}
