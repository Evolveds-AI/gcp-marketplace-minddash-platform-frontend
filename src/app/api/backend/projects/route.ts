import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * GET /api/backend/projects
 * Obtiene proyectos (todos o filtrados por usuario)
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

    // Obtener parámetro opcional user_id para filtrar por usuario
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    let projects;
    if (userId) {
      // Obtener proyectos específicos del usuario
      projects = await backendClient.getProjectsByUser(userId);
    } else {
      // Obtener todos los proyectos (admin)
      projects = await backendClient.getAllProjects();
    }

    return NextResponse.json({
      success: true,
      data: projects
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

/**
 * POST /api/backend/projects
 * Crea un nuevo proyecto
 */
export async function POST(request: NextRequest) {
  let requestBody: any = {};
  
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

    const body = await request.json();
    requestBody = body; // Guardar para logging en catch
    const { organization_id, name, description, label, label_color } = body;

    // Validaciones
    if (!organization_id) {
      return NextResponse.json(
        { success: false, message: 'organization_id es requerido' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre del proyecto es requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.createProject({
      organization_id,
      name: name.trim(),
      description: description?.trim(),
      label: label?.trim(),
      label_color: label_color?.trim()
    });

    // Asignar acceso automático al usuario creador con rol Admin
    try {
      await backendClient.grantProjectAccess({
        project_id: result.id_project,
        user_id: decoded.userId,
        role_id: 'ee7376a8-d934-4936-91fa-2bda2949b5b8'
      });
    } catch (accessError: any) {
      console.error('Error asignando acceso:', accessError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Proyecto creado exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error creando proyecto:', {
      message: error.message,
      statusCode: error.statusCode,
      errorData: error.errorData,
      stack: error.stack,
      requestBody
    });
    
    // El error ya viene procesado del BackendClient
    const errorMessage = error.message || 'Error al crear proyecto';
    const statusCode = error.statusCode || 500;
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          statusCode,
          errorData: error.errorData,
          requestBody
        } : undefined
      },
      { status: statusCode }
    );
  }
}
