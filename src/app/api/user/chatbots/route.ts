import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/chatbots
 * Endpoint de compatibilidad.
 *
 * Algunas pantallas legacy esperan este endpoint y un formato distinto al de /api/selector/chatbots.
 * Internamente reutilizamos el backend Python para listar productos asignados al usuario.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const normalizedRole = decoded.role?.toLowerCase() || '';
    const isSuperAdminRole = ['superadmin', 'super_admin'].includes(normalizedRole);

    if (isSuperAdminRole) {
      const products = await backendClient.getProducts();
      const chatbots = products.map((product: any) => {
        const productId = product.product_id;
        return {
          id: productId,
          chatbot_id: productId,
          chatbot_name: product.product_name,
          chatbot_path: `/chatbot/${productId}`,
          gcp_name: product.product_name ? String(product.product_name).toLowerCase().replace(/\s+/g, '-') : productId,
          assigned_at: null,
          is_active: true,
        };
      });

      return NextResponse.json({
        success: true,
        data: { chatbots },
        chatbots,
      });
    }

    const productsData = await backendClient.getProductsByUser(decoded.userId);
    const chatbots = productsData.map((item: any) => {
      const productId = item.product_id;
      return {
        id: productId,
        chatbot_id: productId,
        chatbot_name: item.product_name,
        chatbot_path: `/chatbot/${productId}`,
        gcp_name: item.product_name ? String(item.product_name).toLowerCase().replace(/\s+/g, '-') : productId,
        assigned_at: item.assigned_at ?? null,
        is_active: item.is_active ?? true,
      };
    });

    return NextResponse.json({
      success: true,
      data: { chatbots },
      chatbots,
    });
  } catch (error: any) {
    console.error('❌ Error obteniendo chatbots (api/user/chatbots):', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al obtener chatbots',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      { status: 500 }
    );
  }
}
