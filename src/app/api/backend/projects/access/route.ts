import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/projects/access
 * Otorga acceso de un usuario a un proyecto
 */
export async function POST(request: NextRequest) {
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
    const { project_id, user_id, role_id } = body;

    // Validaciones
    if (!project_id || !user_id) {
      return NextResponse.json(
        { success: false, message: 'project_id y user_id son requeridos' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.grantProjectAccess({
      project_id,
      user_id,
      role_id
    });

    return NextResponse.json({
      success: true,
      message: 'Acceso otorgado exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error otorgando acceso a proyecto:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al otorgar acceso',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/backend/projects/access
 * Actualiza el acceso de un usuario a un proyecto
 */
export async function PUT(request: NextRequest) {
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
    const { project_id, user_id, role_id } = body;

    // Validaciones
    if (!project_id || !user_id) {
      return NextResponse.json(
        { success: false, message: 'project_id y user_id son requeridos' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.updateProjectAccess({
      project_id,
      user_id,
      role_id
    });

    return NextResponse.json({
      success: true,
      message: 'Acceso actualizado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando acceso a proyecto:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al actualizar acceso',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backend/projects/access
 * Revoca el acceso de un usuario a un proyecto
 */
export async function DELETE(request: NextRequest) {
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
    const { project_id, user_id } = body;

    // Validaciones
    if (!project_id || !user_id) {
      return NextResponse.json(
        { success: false, message: 'project_id y user_id son requeridos' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.revokeProjectAccess({
      project_id,
      user_id
    });

    return NextResponse.json({
      success: true,
      message: 'Acceso revocado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error revocando acceso a proyecto:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al revocar acceso',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
