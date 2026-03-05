import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// PUT /api/admin-client/products/[productId]/status - Cambiar estado del producto
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
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'El campo is_active debe ser un booleano' }, { status: 400 });
    }

    // Verificar que el producto existe
    const existingProduct = await prisma.products.findFirst({
      where: {
        id: productId
      }
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Actualizar el estado del producto
    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: {
        is_active,
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
      message: `Producto ${is_active ? 'activado' : 'desactivado'} exitosamente`,
      product: productWithStats
    });

  } catch (error) {
    console.error('Error al cambiar estado del producto:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}