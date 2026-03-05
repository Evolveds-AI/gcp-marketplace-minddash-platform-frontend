import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * GET /api/backend/organizations
 * Obtiene todas las organizaciones (requiere permisos de admin)
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

    let organizations;
    if (userId) {
      // Obtener organizaciones específicas del usuario
      organizations = await backendClient.getOrganizationsByUser(userId);
    } else {
      // Obtener todas las organizaciones (admin)
      organizations = await backendClient.getAllOrganizations();
    }

    return NextResponse.json({
      success: true,
      data: organizations
    });

  } catch (error: any) {
    console.error('Error obteniendo organizaciones:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener organizaciones',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backend/organizations
 * Crea una nueva organización
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
    const { name, company_name, description, country } = body;

    // Validaciones - solo 4 campos requeridos según el backend Python
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'El nombre de la organización es requerido' },
        { status: 400 }
      );
    }

    if (!company_name || !company_name.trim()) {
      return NextResponse.json(
        { success: false, message: 'La razón social (company_name) es requerida' },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { success: false, message: 'La descripción es requerida' },
        { status: 400 }
      );
    }

    if (!country || !country.trim()) {
      return NextResponse.json(
        { success: false, message: 'El país es requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.createOrganization({
      name: name.trim(),
      company_name: company_name.trim(),
      description: description.trim(),
      country: country.trim()
    });

    return NextResponse.json({
      success: true,
      message: 'Organización creada exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creando organización:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear organización',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
