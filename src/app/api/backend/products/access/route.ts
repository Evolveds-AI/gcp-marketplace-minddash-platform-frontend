import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';
import prisma from '@/lib/database';

/**
 * POST /api/backend/products/access
 * Otorga acceso de un usuario a un producto
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
    const { product_id, user_id, role_id } = body;

    // Validaciones
    if (!product_id || !user_id) {
      return NextResponse.json(
        { success: false, message: 'product_id y user_id son requeridos' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.grantProductAccess({
      product_id,
      user_id,
      role_id
    });

    try {
      const existing = await prisma.access_user_product.findFirst({
        where: {
          product_id,
          user_id,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.access_user_product.update({
          where: { id: existing.id },
          data: {
            role_id: role_id || null,
            updated_at: new Date(),
          },
        });
      } else {
        await prisma.access_user_product.create({
          data: {
            product_id,
            user_id,
            role_id: role_id || null,
            updated_at: new Date(),
          },
        });
      }
    } catch (dbError) {
      console.error('Error sincronizando acceso en Prisma (grantProductAccess):', dbError);
      return NextResponse.json(
        {
          success: false,
          message: 'Acceso otorgado en backend pero no se pudo sincronizar en la base de datos',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Acceso otorgado exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error otorgando acceso a producto:', error);
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
 * PUT /api/backend/products/access
 * Actualiza el acceso de un usuario a un producto
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
    const { product_id, user_id, role_id } = body;

    // Validaciones
    if (!product_id || !user_id) {
      return NextResponse.json(
        { success: false, message: 'product_id y user_id son requeridos' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.updateProductAccess({
      product_id,
      user_id,
      role_id
    });

    try {
      await prisma.access_user_product.updateMany({
        where: {
          product_id,
          user_id,
        },
        data: {
          role_id: role_id || null,
          updated_at: new Date(),
        },
      });
    } catch (dbError) {
      console.error('Error sincronizando acceso en Prisma (updateProductAccess):', dbError);
      return NextResponse.json(
        {
          success: false,
          message: 'Acceso actualizado en backend pero no se pudo sincronizar en la base de datos',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Acceso actualizado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error actualizando acceso a producto:', error);
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
 * DELETE /api/backend/products/access
 * Revoca el acceso de un usuario a un producto
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
    const { id, product_id, user_id } = body;

    // Si se provee 'id' directamente (ID del registro de acceso), usarlo
    // Si no, buscar el registro por product_id + user_id
    let accessRecordId = id;

    if (!accessRecordId) {
      if (!product_id || !user_id) {
        return NextResponse.json(
          { success: false, message: 'Se requiere id del registro de acceso, o product_id y user_id' },
          { status: 400 }
        );
      }

      // Buscar el registro de acceso en Prisma
      const accessRecord = await prisma.access_user_product.findFirst({
        where: { product_id, user_id },
        select: { id: true },
      });

      if (!accessRecord) {
        return NextResponse.json(
          { success: false, message: 'No se encontró registro de acceso para este usuario y producto' },
          { status: 404 }
        );
      }

      accessRecordId = accessRecord.id;
    }

    // Llamar al backend Python con el ID del registro
    const result = await backendClient.revokeProductAccess({
      id: accessRecordId,
    });

    // Eliminar de Prisma (por id si lo tenemos, o por product_id + user_id)
    try {
      if (id) {
        await prisma.access_user_product.delete({
          where: { id: accessRecordId },
        });
      } else {
        await prisma.access_user_product.deleteMany({
          where: { product_id, user_id },
        });
      }
    } catch (dbError) {
      console.error('Error sincronizando acceso en Prisma (revokeProductAccess):', dbError);
      return NextResponse.json(
        {
          success: false,
          message: 'Acceso revocado en backend pero no se pudo sincronizar en la base de datos',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Acceso revocado exitosamente',
      data: result
    });

  } catch (error: any) {
    console.error('Error revocando acceso a producto:', error);
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
