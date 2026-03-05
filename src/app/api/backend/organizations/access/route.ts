import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/organizations/access
 * Otorga acceso de un usuario a una organización
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
    const { organization_id, user_id, role_id } = body;

    // Validaciones
    if (!organization_id || !user_id) {
      return NextResponse.json(
        { success: false, message: 'organization_id y user_id son requeridos' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const shouldRetry = (err: any) => {
      const msg = typeof err?.message === 'string' ? err.message : '';
      return msg.toLowerCase().includes('no existe');
    };

    let result: any;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        result = await backendClient.grantOrganizationAccess({
          organization_id,
          user_id,
          role_id,
        });
        break;
      } catch (err: any) {
        const lastAttempt = attempt >= 3;
        if (!lastAttempt && shouldRetry(err)) {
          const delayMs = 250 * (attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Acceso otorgado exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error otorgando acceso a organización:', error);
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
 * PUT /api/backend/organizations/access
 * Actualiza el acceso de un usuario a una organización
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
    const { organization_id, user_id, role_id } = body;

    // Validaciones
    if (!organization_id || !user_id) {
      return NextResponse.json(
        { success: false, message: 'organization_id y user_id son requeridos' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.updateOrganizationAccess({
      organization_id,
      user_id,
      role_id
    });

    return NextResponse.json({
      success: true,
      message: 'Acceso actualizado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando acceso a organización:', error);
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
 * DELETE /api/backend/organizations/access
 * Revoca el acceso de un usuario a una organización
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
    const { organization_id, user_id } = body;

    // Validaciones
    if (!organization_id || !user_id) {
      return NextResponse.json(
        { success: false, message: 'organization_id y user_id son requeridos' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.revokeOrganizationAccess({
      organization_id,
      user_id
    });

    return NextResponse.json({
      success: true,
      message: 'Acceso revocado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error revocando acceso a organización:', error);
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
