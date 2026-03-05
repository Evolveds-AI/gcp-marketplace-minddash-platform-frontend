import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// PUT /api/admin-client/products/[productId] - Actualizar producto
export async function PUT(request: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorización requerido' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar que el usuario sea admin
    if (decoded.iam_role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado. Se requiere rol de administrador.' }, { status: 403 });
    }

    const { productId } = params;
    const body = await request.json();
    const { nombre, descripcion, tipo, config } = body;

    // Verificar que el producto existe
    const existingProduct = await prisma.products.findFirst({
      where: {
        id: productId
      }
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Verificar que no existe otro producto con el mismo nombre (excluyendo el actual)
    if (nombre && nombre !== existingProduct.name) {
      const duplicateProduct = await prisma.products.findFirst({
        where: {
          name: nombre,
          id: { not: productId }
        }
      });

      if (duplicateProduct) {
        return NextResponse.json({ error: 'Ya existe un producto con ese nombre' }, { status: 400 });
      }
    }

    // Actualizar el producto
    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: {
        ...(nombre && { name: nombre }),
        ...(descripcion !== undefined && { description: descripcion }),
        ...(tipo && { tipo }),
        ...(config !== undefined && { config }),
        updated_at: new Date()
      }
    });

    // Obtener estadísticas actualizadas
    const usuarios_asignados = await prisma.access_user_product.count({
      where: { product_id: productId }
    });

    // Simular mensajes por mes (esto debería venir de una tabla de métricas real)
    const mensajes_mes = Math.floor(Math.random() * 10000) + 1000;

    const productWithStats = {
      ...updatedProduct,
      usuarios_asignados,
      mensajes_mes
    };

    return NextResponse.json({
      message: 'Producto actualizado exitosamente',
      product: productWithStats
    });

  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/admin-client/products/[productId] - Eliminar producto
export async function DELETE(request: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorización requerido' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar que el usuario sea admin
    if (decoded.iam_role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado. Se requiere rol de administrador.' }, { status: 403 });
    }

    const { productId } = params;

    // Verificar que el producto existe
    const existingProduct = await prisma.products.findFirst({
      where: {
        id: productId
      }
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Eliminar relaciones primero
    await prisma.access_user_product.deleteMany({
      where: { product_id: productId }
    });

    // Eliminar el producto
    await prisma.products.delete({
      where: { id: productId }
    });

    return NextResponse.json({
      message: 'Producto eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}