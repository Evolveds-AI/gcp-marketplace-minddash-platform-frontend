import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';
import prisma from '@/lib/database';

/**
 * PUT /api/backend/products/[productId]
 * Actualiza un producto existente en el backend Python
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
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
      is_active,
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

    const trimmedName = name.trim();

    // Validar nombre único dentro del mismo proyecto (excluyendo el producto actual)
    const existingProduct = await prisma.products.findFirst({
      where: {
        project_id,
        name: trimmedName,
        is_active: true,
        NOT: { id: params.productId },
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { success: false, message: 'Ya existe un chatbot con ese nombre en este proyecto' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.updateProduct({
      id: params.productId,
      project_id: project_id,
      name: trimmedName,
      description: description?.trim(),
      language,
      tipo,
      welcome_message,
      label,
      label_color,
      max_users,
      is_active,
      is_active_rag,
      is_active_alerts,
      is_active_insight,
      config
    } as any);

    return NextResponse.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando producto:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al actualizar producto',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backend/products/[productId]
 * Elimina un producto del backend Python
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
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

    // Log para debugging
    console.log('🔍 DELETE Product - Usuario:', {
      userId: decoded.userId,
      role: decoded.role,
      isAdmin: decoded.isAdmin,
      productId: params.productId
    });

    // Verificar permisos: admin, super_admin, o isAdmin
    const allowedRoles = ['admin', 'super_admin', 'admin-client'];
    const hasPermission = allowedRoles.includes(decoded.role) || decoded.isAdmin;
    
    if (!hasPermission) {
      console.warn('⚠️ Permiso denegado para eliminar producto:', {
        userId: decoded.userId,
        role: decoded.role,
        isAdmin: decoded.isAdmin
      });
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para eliminar productos' },
        { status: 403 }
      );
    }

    // Intentar revocar acceso del usuario actual antes de eliminar el producto
    // Buscar todos los registros de acceso del usuario actual para este producto
    const userAccessRecords = await prisma.access_user_product.findMany({
      where: {
        product_id: params.productId,
        user_id: decoded.userId,
      },
      select: { id: true },
    });

    for (const accessRecord of userAccessRecords) {
      try {
        await backendClient.revokeProductAccess({
          id: accessRecord.id,
        });
      } catch (revokeError: any) {
        const normalizedRevokeMessage = String(revokeError?.message || '').toLowerCase();
        const isNotFound =
          revokeError?.statusCode === 404 ||
          normalizedRevokeMessage.includes('404') ||
          normalizedRevokeMessage.includes('not found') ||
          normalizedRevokeMessage.includes('no existe');

        if (isNotFound) {
          continue; // El registro ya no existe, continuar con el siguiente
        }

        console.warn('⚠️ No se pudo revocar acceso antes de eliminar producto:', revokeError);
      }
    }

    // Limpiar TODAS las dependencias en Prisma ANTES de llamar al backend Python
    // Esto evita errores de FK en el stored procedure del backend
    const productId = params.productId;

    try {
      // 1. Eliminar configuraciones de deploy
      const deploysDeleted = await prisma.clients_products_deploys.deleteMany({
        where: { product_id: productId },
      });
      if (deploysDeleted.count > 0) {
        console.log(`✅ ${deploysDeleted.count} configuraciones de deploy eliminadas`);
      }
    } catch (err) {
      console.error('Error eliminando clients_products_deploys:', err);
    }

    try {
      // 2. Eliminar accesos de usuarios al producto
      const accessDeleted = await prisma.access_user_product.deleteMany({
        where: { product_id: productId },
      });
      if (accessDeleted.count > 0) {
        console.log(`✅ ${accessDeleted.count} accesos de usuario eliminados`);
      }
    } catch (err) {
      console.error('Error eliminando access_user_product:', err);
    }

    try {
      // 3. Eliminar canales del producto
      const channelsDeleted = await prisma.channel_product.deleteMany({
        where: { product_id: productId },
      });
      if (channelsDeleted.count > 0) {
        console.log(`✅ ${channelsDeleted.count} canales eliminados`);
      }
    } catch (err) {
      console.error('Error eliminando channel_product:', err);
    }

    try {
      // 4. Eliminar prompts del producto
      const promptsDeleted = await prisma.prompts.deleteMany({
        where: { product_id: productId },
      });
      if (promptsDeleted.count > 0) {
        console.log(`✅ ${promptsDeleted.count} prompts eliminados`);
      }
    } catch (err) {
      console.error('Error eliminando prompts:', err);
    }

    try {
      // 5a. Primero eliminar user_data_access que dependen de roles_data_access de este producto
      const productRoles = await prisma.roles_data_access.findMany({
        where: { product_id: productId },
        select: { id: true },
      });
      
      if (productRoles.length > 0) {
        const roleIds = productRoles.map(r => r.id);
        const userDataDeleted = await prisma.user_data_access.deleteMany({
          where: { role_data_id: { in: roleIds } },
        });
        if (userDataDeleted.count > 0) {
          console.log(`✅ ${userDataDeleted.count} user_data_access eliminados`);
        }
      }

      // 5b. Ahora eliminar roles de acceso a datos del producto
      const rolesDeleted = await prisma.roles_data_access.deleteMany({
        where: { product_id: productId },
      });
      if (rolesDeleted.count > 0) {
        console.log(`✅ ${rolesDeleted.count} roles de acceso a datos eliminados`);
      }
    } catch (err) {
      console.error('Error eliminando roles_data_access o user_data_access:', err);
    }

    try {
      // 6. Eliminar configuraciones de capa semántica
      const semanticDeleted = await prisma.semantic_layer_configs.deleteMany({
        where: { product_id: productId },
      });
      if (semanticDeleted.count > 0) {
        console.log(`✅ ${semanticDeleted.count} configuraciones semánticas eliminadas`);
      }
    } catch (err) {
      console.error('Error eliminando semantic_layer_configs:', err);
    }

    console.log('✅ Todas las dependencias locales limpiadas para producto:', productId);

    // Llamar al backend Python para eliminar el producto
    const result = await backendClient.deleteProduct(params.productId);

    console.log('✅ Producto eliminado exitosamente:', params.productId);

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('❌ Error eliminando producto:', error);
    
    // Detectar error de foreign key constraint
    let errorMessage = error.message || 'Error al eliminar producto';
    const normalizedErrorMessage = String(errorMessage).toLowerCase();

    // Detectar tipo específico de constraint
    if (normalizedErrorMessage.includes('clients_products_deploys')) {
      console.error('⚠️ Error de foreign key: El producto tiene configuraciones de deploy');
      errorMessage = 'No se puede eliminar el producto porque tiene configuraciones de deploy asociadas. Intenta eliminarlas primero.';
    } else if (
      normalizedErrorMessage.includes('user_access_product_fkey') ||
      normalizedErrorMessage.includes('access_user_product') ||
      normalizedErrorMessage.includes('user_access_product')
    ) {
      console.error('⚠️ Error de foreign key: El producto tiene dependencias en access_user_product');
      errorMessage = 'No se puede eliminar el producto porque tiene usuarios asignados.';
    } else if (normalizedErrorMessage.includes('foreign key constraint')) {
      console.error('⚠️ Error de foreign key genérico:', errorMessage);
      errorMessage = 'No se puede eliminar el producto porque tiene dependencias asociadas. Contacta al administrador.';
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
