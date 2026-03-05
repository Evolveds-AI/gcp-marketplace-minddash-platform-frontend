import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/selector/chatbots
 * Obtiene los chatbots disponibles para el usuario autenticado
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

    console.log('🔍 Cargando chatbots para usuario:', decoded.username, 'Rol:', decoded.role);

    const normalizedRole = decoded.role?.toLowerCase() || '';
    const isSuperAdminRole = ['superadmin', 'super_admin'].includes(normalizedRole);

    // Para superadmin, obtener todos los productos
    if (isSuperAdminRole) {
      const products = await backendClient.getProducts();
      
      const chatbots = products.map((product: any) => {
        const productId = product.product_id;
        const organizationId = product.organization_id || 'default';
        const projectId = product.project_id || 'default';
        
        return {
          id: productId,
          name: product.product_name,
          // Redirigir siempre al chatbot público basado en productId
          path: `/chatbot/${productId}`,
          gcpName: product.product_name ? product.product_name.toLowerCase().replace(/\s+/g, '-') : productId,
          productId: productId,
          description: product.product_description || '',
          organization_name: product.organization_name || 'N/A',
          project_name: product.project_name || 'N/A'
        };
      });

      console.log('✅ Chatbots cargados para superadmin:', chatbots.length);

      return NextResponse.json({
        success: true,
        data: {
          userRole: 'SuperAdmin',
          chatbots
        }
      });
    }

    // Para usuarios admin y normales, obtener productos asignados al usuario
    const productsData = await backendClient.getProductsByUser(decoded.userId);
    
    const chatbots = productsData.map((item: any) => {
      const productId = item.product_id;
      const organizationId = item.organization_id || 'default';
      const projectId = item.project_id || 'default';
      
      return {
        id: productId,
        name: item.product_name,
        // Redirigir siempre al chatbot público basado en productId
        path: `/chatbot/${productId}`,
        gcpName: item.product_name ? item.product_name.toLowerCase().replace(/\s+/g, '-') : productId,
        productId: productId,
        description: item.product_description || '',
        organization_name: item.organization_name || 'N/A',
        project_name: item.project_name || 'N/A'
      };
    });

    console.log('✅ Chatbots cargados para usuario:', chatbots.length);

    return NextResponse.json({
      success: true,
      data: {
        userRole: decoded.role,
        chatbots
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo chatbots:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener chatbots',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
