import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/prompts-examples/examples/create
 * Registra un nuevo ejemplo de conversación para un chatbot
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

    // Verificar permisos (solo admin o admin-client)
    // Verificar rol (case-insensitive)
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para crear ejemplos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      product_id,
      name,
      description,
      data_query
    } = body;

    // Validaciones
    if (!product_id) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre del ejemplo es requerido' },
        { status: 400 }
      );
    }

    if (!data_query || data_query.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El data_query es requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.createExample({
      product_id,
      name: name.trim(),
      description: description?.trim(),
      data_query: data_query.trim()
    });

    return NextResponse.json({
      success: true,
      message: 'Ejemplo creado exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creando ejemplo:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear ejemplo',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
