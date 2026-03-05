import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';
import prisma from '@/lib/database';

/**
 * GET /api/products
 * Obtiene productos del usuario autenticado desde el backend Python
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

    // Llamar al backend Python con el userId del token
    const products = await backendClient.getProductsByUser(decoded.userId);

    return NextResponse.json({
      success: true,
      products
    });

  } catch (error: any) {
    console.error('Error obteniendo productos:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener productos',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Crea un nuevo producto/chatbot en el backend Python
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
    const { 
      project_id, 
      name, 
      description, 
      language,
      tipo,
      config,
      welcome_message,
      label,
      label_color,
      max_users,
      is_active_rag,
      is_active_alerts,
      is_active_insight
    } = body;

    // Validaciones
    if (!project_id) {
      return NextResponse.json(
        { success: false, message: 'project_id es requerido' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre del producto es requerido' },
        { status: 400 }
      );
    }

    // Validar que no exista otro producto/chatbot con el mismo nombre en el mismo proyecto
    const existingProduct = await prisma.products.findFirst({
      where: {
        project_id,
        name: name.trim(),
        is_active: true,
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { success: false, message: 'Ya existe un chatbot con ese nombre en este proyecto' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.createProduct({
      project_id: project_id, // Backend Python espera 'project_id'
      name: name.trim(),
      description: description?.trim(),
      language: language || 'es',
      tipo: tipo || 'chatbot',
      config: config || {},
      welcome_message,
      label,
      label_color,
      max_users: max_users || 100,
      is_active_rag: is_active_rag || false,
      is_active_alerts: is_active_alerts || false,
      is_active_insight: is_active_insight || false,
    });

    console.log('✅ Producto creado en backend Python:', result);

    const allowedRoles = ['admin', 'super_admin', 'admin-client'];
    const shouldAutoAssignCreator = !allowedRoles.includes(decoded.role) && !decoded.isAdmin;

    // 🔧 FIX CRÍTICO: Asignar acceso automático al usuario que creó el producto
    if (shouldAutoAssignCreator) {
      try {
        console.log('🔐 Asignando acceso automático al usuario...', {
          productId: result.id_product,
          userId: decoded.userId
        });

        // Asignar rol de Admin al usuario que crea el producto
        await backendClient.grantProductAccess({
          product_id: result.id_product,
          user_id: decoded.userId,
          role_id: 'ee7376a8-d934-4936-91fa-2bda2949b5b8' // Admin
        });

        try {
          const existing = await prisma.access_user_product.findFirst({
            where: {
              product_id: result.id_product,
              user_id: decoded.userId,
            },
            select: { id: true },
          });

          if (existing) {
            await prisma.access_user_product.update({
              where: { id: existing.id },
              data: {
                role_id: 'ee7376a8-d934-4936-91fa-2bda2949b5b8',
                updated_at: new Date(),
              },
            });
          } else {
            await prisma.access_user_product.create({
              data: {
                product_id: result.id_product,
                user_id: decoded.userId,
                role_id: 'ee7376a8-d934-4936-91fa-2bda2949b5b8',
                updated_at: new Date(),
              },
            });
          }
        } catch (prismaSyncError: any) {
          console.error('⚠️ Error sincronizando acceso en Prisma luego de crear producto:', prismaSyncError);
        }

        console.log('✅ Acceso asignado correctamente al usuario');

      } catch (accessError: any) {
        console.error('⚠️ Error al asignar acceso al usuario:', accessError);
        console.error('Stack:', accessError?.stack);
        
        // Registrar el error pero no fallar la creación
        console.warn('⚠️ El producto se creó pero no se pudo asignar acceso automáticamente.');
        console.warn('⚠️ El usuario deberá ser asignado manualmente o no verá el producto.');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Producto creado exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creando producto:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear producto',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
