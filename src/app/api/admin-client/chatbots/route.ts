import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';
import prisma from '@/lib/database';

/**
 * POST /api/admin-client/chatbots
 * Crea un nuevo chatbot (producto)
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

    // Verificar rol (case-insensitive)
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.error('❌ Acceso denegado. Rol del usuario:', decoded.role);
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para crear chatbots' },
        { status: 403 }
      );
    }
    
    console.log('✅ Usuario autorizado:', decoded.username, '- Rol:', decoded.role);

    const body = await request.json();
    const { nombre, descripcion, tipo, project_id } = body;

    // Validaciones
    if (!nombre || nombre.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre del chatbot es requerido' },
        { status: 400 }
      );
    }

    if (!project_id) {
      return NextResponse.json(
        { success: false, message: 'El project_id es requerido' },
        { status: 400 }
      );
    }

    // Validar que no exista otro chatbot con el mismo nombre en el mismo proyecto
    const existingProduct = await prisma.products.findFirst({
      where: {
        project_id,
        name: nombre.trim(),
        is_active: true,
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { success: false, message: 'Ya existe un chatbot con ese nombre en este proyecto' },
        { status: 400 }
      );
    }

    const result = await backendClient.createProduct({
      project_id,
      name: nombre.trim(),
      description: descripcion?.trim() || '',
      language: 'es',
      tipo: tipo || 'chatbot',
      config: {},
      label: tipo || 'Chatbot',
      max_users: 100,
      is_active_rag: false,
      is_active_alerts: false,
      is_active_insight: false
    });

    // El backend devuelve id_product, no product_id
    const productId = (result as any).id_product || (result as any).product_id;

    // Asignar acceso automático al usuario
    if (productId) {
      try {
        await backendClient.grantProductAccess({
          user_id: decoded.userId,
          product_id: productId
        });
      } catch (accessError) {
        // Error no crítico, continuar
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Chatbot creado exitosamente',
      chatbot: {
        id: productId,
        name: nombre,
        description: descripcion,
        tipo: tipo || 'chatbot',
        project_id
      }
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear chatbot',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
