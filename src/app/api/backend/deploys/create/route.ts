import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/deploys/create
 * Registra una nueva configuración de despliegue para un producto/cliente
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
        { success: false, message: 'No tienes permisos para crear configuraciones de despliegue' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      product_id,
      environment,
      deploy_url,
      api_endpoint,
      config_json,
      version,
      is_active
    } = body;

    // Validaciones
    if (!product_id) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

    if (!environment) {
      return NextResponse.json(
        { success: false, message: 'environment es requerido (dev, staging, production)' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.createDeployConfig({
      product_id,
      environment,
      deploy_url,
      api_endpoint,
      config_json,
      version,
      is_active: is_active ?? true
    });


    return NextResponse.json({
      success: true,
      message: 'Configuración de despliegue creada exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creando configuración de despliegue:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear configuración',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
