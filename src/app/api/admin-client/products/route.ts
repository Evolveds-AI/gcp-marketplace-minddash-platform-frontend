import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { getMessageStatsForProduct } from '@/lib/utils/message-analytics';
import { backendClient } from '@/lib/api/backend-client';
import { isAdminClientReadRole } from '@/lib/utils/admin-client-role';

// Helper para generar URL slug amigable para productos
function generateProductSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
    .replace(/[\s_-]+/g, '-') // Reemplazar espacios por guiones
    .replace(/^-+|-+$/g, ''); // Remover guiones al inicio/final
}

// GET - Obtener productos del cliente (filtrado por usuario)
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

    // Solo roles de administración pueden ver productos
    if (!isAdminClientReadRole(decoded.role)) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    // 🔧 FIX: Obtener productos desde el backend Python filtrados por usuario
    // Esto asegura que solo se vean los productos a los que el usuario tiene acceso
    try {
      console.log('🔍 Obteniendo productos filtrados por usuario desde backend Python...', {
        userId: decoded.userId
      });

      const userProducts = await backendClient.getProductsByUser(decoded.userId);
      
      console.log('✅ Productos obtenidos del backend:', {
        count: userProducts.length,
        userId: decoded.userId
      });

      // Enriquecer productos con información de Prisma y estadísticas
      const productsWithUrls = await Promise.all(userProducts.map(async (backendProduct: any) => {
        // Obtener información adicional de Prisma si existe
        const prismaProduct = await prisma.products.findFirst({
          where: {
            id: backendProduct.product_id,
            is_active: true
          },
          select: {
            config: true,
            welcome_message: true,
            max_users: true,
            projects: {
              select: {
                name: true,
                organizations: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        });

        const messageStats = await getMessageStatsForProduct(backendProduct.product_id);
        
        return {
          id: backendProduct.product_id,
          nombre: backendProduct.product_name, // Para compatibilidad con frontend
          name: backendProduct.product_name,
          descripcion: backendProduct.product_description || 'Descripción del producto',
          description: backendProduct.product_description || 'Descripción del producto',
          tipo: 'chatbot',
          is_active: true,
          created_at: new Date().toISOString(),
          mensajes_mes: messageStats.messagesThisMonth,
          total_mensajes: messageStats.totalMessages,
          crecimiento_mensual: messageStats.growth,
          promedio_diario: messageStats.dailyAverage,
          url: prismaProduct?.projects?.organizations
            ? `/dashboard/admin/organizations/${prismaProduct.projects.organizations.name}/product/${backendProduct.product_id}`
            : `/dashboard/product/${backendProduct.product_id}`,
          productSlug: generateProductSlug(backendProduct.product_name),
          config: prismaProduct?.config || {
            welcomeMessage: prismaProduct?.welcome_message || 'Bienvenido a nuestro chatbot',
            maxUsers: prismaProduct?.max_users || 100
          },
          // Info adicional del backend
          project_id: backendProduct.project_id,
          project_name: backendProduct.project_name,
          organization_id: backendProduct.organization_id,
          organization_name: backendProduct.organization_name
        };
      }));

      return NextResponse.json({
        success: true,
        data: { products: productsWithUrls }
      });

    } catch (backendError: any) {
      console.error('⚠️ Error al obtener productos del backend Python:', backendError);
      console.error('Stack:', backendError?.stack);
      
      // Fallback: Si el backend falla, usar Prisma directamente
      console.warn('⚠️ Usando fallback: obteniendo productos desde Prisma...');
      
      const products = await prisma.products.findMany({
        where: {
          project_id: (decoded as any).projectId || (decoded as any).clientId,
          is_active: true
        },
        select: {
          id: true,
          name: true,
          project_id: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          description: true,
          tipo: true,
          config: true,
          mensajes_mes: true,
          welcome_message: true,
          max_users: true,
          projects: {
            select: {
              name: true,
              organizations: {
                select: {
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              access_user_product: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      const productsWithUrls = await Promise.all(products.map(async (product: any) => {
        const messageStats = await getMessageStatsForProduct(product.id);
        
        return {
          ...product,
          nombre: product.name, // Para compatibilidad con frontend
          descripcion: product.description,
          url: `/dashboard/admin/organizations/${product.projects?.organizations?.name || 'org'}/product/${product.id}`,
          productSlug: generateProductSlug(product.name),
          usuarios_asignados: product._count?.access_user_product || 0,
          mensajes_mes: product.mensajes_mes || messageStats.messagesThisMonth,
          total_mensajes: messageStats.totalMessages,
          crecimiento_mensual: messageStats.growth,
          promedio_diario: messageStats.dailyAverage,
          config: product.config || {
            welcomeMessage: product.welcome_message || 'Bienvenido a nuestro chatbot',
            maxUsers: product.max_users || 100
          }
        };
      }));

      return NextResponse.json({
        success: true,
        data: { products: productsWithUrls }
      });
    }

  } catch (error) {
    console.error('Error obteniendo productos del cliente:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear producto para el cliente
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

    // Solo admin del cliente puede crear productos
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    const { nombre, descripcion, tipo, config } = await request.json();

    // Validaciones básicas
    if (!nombre || nombre.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'El nombre del producto es requerido' },
        { status: 400 }
      );
    }

    // Verificar que no exista un producto con el mismo nombre en el proyecto
    const existingProduct = await prisma.products.findFirst({
      where: {
        name: nombre.trim(),
        project_id: (decoded as any).projectId || (decoded as any).clientId,
        is_active: true
      }
    });

    if (existingProduct) {
      return NextResponse.json(
        { success: false, message: 'Ya existe un producto con ese nombre en tu organización' },
        { status: 400 }
      );
    }

    // Crear producto con ID automático UUID y asociado al proyecto
    const productId = randomUUID();
    const newProduct = await prisma.products.create({
      data: {
        id: productId, // GENERACIÓN AUTOMÁTICA DE ID UUID
        name: nombre.trim(),
        description: descripcion || 'Descripción del producto',
        tipo: tipo || 'chatbot',
        config: config || {},
        project_id: (decoded as any).projectId || (decoded as any).clientId, // AISLAMIENTO POR PROYECTO
        is_active: true,
        mensajes_mes: 0,
        welcome_message: config?.welcomeMessage || 'Bienvenido a nuestro chatbot',
        max_users: config?.maxUsers || 100,
        is_active_rag: false,
        is_active_alerts: false,
        is_active_insight: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        projects: {
          select: {
            name: true,
            organizations: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            access_user_product: true
          }
        }
      }
    });

    // 🔧 FIX: Registrar producto en el backend Python y asignar acceso al usuario
    try {
      console.log('📝 Registrando producto en backend Python...', {
        productId,
        nombre: newProduct.name,
        userId: decoded.userId
      });

      // Registrar producto en backend Python
      await backendClient.createProduct({
        product_id: (decoded as any).projectId || (decoded as any).clientId,
        name: newProduct.name,
        description: newProduct.description || '',
        language: 'es',
        tipo: newProduct.tipo,
        config: (newProduct.config as Record<string, any>) || {},
        welcome_message: newProduct.welcome_message || '',
        max_users: newProduct.max_users || 100,
        is_active_rag: false,
        is_active_alerts: false,
        is_active_insight: false
      });

      console.log('✅ Producto registrado en backend Python');

      // Asignar acceso automáticamente al usuario que creó el producto
      console.log('🔐 Asignando acceso al usuario...', {
        productId,
        userId: decoded.userId
      });

      // Asignar rol de Admin al usuario que crea el producto
      await backendClient.grantProductAccess({
        product_id: productId,
        user_id: decoded.userId,
        role_id: 'ee7376a8-d934-4936-91fa-2bda2949b5b8' // Admin
      });

      console.log('✅ Acceso asignado correctamente al usuario');

    } catch (backendError: any) {
      console.error('⚠️ Error al registrar producto en backend Python:', backendError);
      console.error('Stack:', backendError?.stack);
      
      // Registrar el error pero no fallar la creación del producto
      // El producto existe en Prisma, solo faltó el registro en Python
      console.warn('⚠️ El producto se creó en la base de datos local pero no se pudo registrar en el backend Python.');
      console.warn('⚠️ Es posible que el usuario no vea el producto hasta que se asigne acceso manualmente.');
    }

    // Generar URL dinámica para el nuevo producto con estadísticas reales
    const messageStats = await getMessageStatsForProduct(newProduct.id);
    
    const productWithUrl = {
      ...newProduct,
      nombre: newProduct.name, // Para compatibilidad con frontend
      descripcion: newProduct.description,
      url: `/dashboard/admin/organizations/${newProduct.projects?.organizations?.name || 'org'}/product/${newProduct.id}`,
      productSlug: generateProductSlug(newProduct.name),
      usuarios_asignados: newProduct._count?.access_user_product || 0,
      mensajes_mes: newProduct.mensajes_mes || messageStats.messagesThisMonth,
      total_mensajes: messageStats.totalMessages,
      crecimiento_mensual: messageStats.growth,
      promedio_diario: messageStats.dailyAverage,
      tipo: newProduct.tipo,
      config: newProduct.config
    };

    return NextResponse.json({
      success: true,
      message: 'Producto creado exitosamente',
      data: { product: productWithUrl }
    });

  } catch (error) {
    console.error('Error creando producto:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';