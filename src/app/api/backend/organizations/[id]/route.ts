import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * PUT /api/backend/organizations/[id]
 * Actualiza una organización existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const body = await request.json();
    const { name, company_name, description, country } = body;

    // Validaciones
    if (!params.id) {
      return NextResponse.json(
        { success: false, message: 'ID de organización requerido' },
        { status: 400 }
      );
    }

    if (!name || !company_name || !description || !country) {
      return NextResponse.json(
        { success: false, message: 'Todos los campos son requeridos: name, company_name, description, country' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.updateOrganization({
      id: params.id,
      name,
      company_name,
      description,
      country
    });

    return NextResponse.json({
      success: true,
      message: 'Organización actualizada exitosamente',
      data: result
    });

  } catch (error: unknown) {
    console.error('Error actualizando organización:', error);

    const anyError = error as any;
    const statusCode =
      typeof anyError?.statusCode === 'number' && anyError.statusCode > 0
        ? anyError.statusCode
        : 500;

    const errorMessage =
      error instanceof Error ? error.message : 'Error al actualizar organización';

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error:
          process.env.NODE_ENV === 'development'
            ? {
                name: anyError?.name,
                message: errorMessage,
                statusCode,
                errorData: anyError?.errorData ?? anyError,
              }
            : undefined,
      },
      { status: statusCode }
    );
  }
}

/**
 * DELETE /api/backend/organizations/[id]
 * Elimina una organización
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    if (!params.id) {
      return NextResponse.json(
        { success: false, message: 'ID de organización requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.deleteOrganization(params.id);

    return NextResponse.json({
      success: true,
      message: 'Organización eliminada exitosamente',
      data: result
    });

  } catch (error: unknown) {
    console.error('Error eliminando organización:', error);

    const anyError = error as any;
    const statusCode =
      typeof anyError?.statusCode === 'number' && anyError.statusCode > 0
        ? anyError.statusCode
        : 500;

    const errorMessage =
      error instanceof Error ? error.message : 'Error al eliminar organización';

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error:
          process.env.NODE_ENV === 'development'
            ? {
                name: anyError?.name,
                message: errorMessage,
                statusCode,
                errorData: anyError?.errorData ?? anyError,
              }
            : undefined,
      },
      { status: statusCode }
    );
  }
}
