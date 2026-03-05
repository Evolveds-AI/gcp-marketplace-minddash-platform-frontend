import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/prompts-examples/prompts/create
 * Registra un nuevo prompt para un chatbot
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
        { success: false, message: 'No tienes permisos para crear prompts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      product_id,
      name,
      config_prompt,
      path_config_file
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
        { success: false, message: 'El nombre del prompt es requerido' },
        { status: 400 }
      );
    }

    if (!config_prompt || typeof config_prompt !== 'object') {
      return NextResponse.json(
        { success: false, message: 'config_prompt es requerido y debe ser un objeto' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.createPrompt({
      product_id,
      name: name.trim(),
      config_prompt,
      path_config_file
    });

    return NextResponse.json({
      success: true,
      message: 'Prompt creado exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creando prompt:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear prompt',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
