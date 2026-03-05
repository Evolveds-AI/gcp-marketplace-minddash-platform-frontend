import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/semantic/create
 * Crea una nueva configuración de semantic layer
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
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para crear configuraciones de semantic layer' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      product_id,
      object_path_saved,
      bucket_name_saved,
      object_path_deployed,
      bucket_name_deployed
    } = body;

    if (!product_id) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

    if (!object_path_saved || object_path_saved.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'object_path_saved es requerido' },
        { status: 400 }
      );
    }

    if (!bucket_name_saved || bucket_name_saved.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'bucket_name_saved es requerido' },
        { status: 400 }
      );
    }

    const result = await backendClient.createSemanticLayerConfig({
      product_id,
      object_path_saved: object_path_saved.trim(),
      bucket_name_saved: bucket_name_saved.trim(),
      object_path_deployed: object_path_deployed || null,
      bucket_name_deployed: bucket_name_deployed || null
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración de semantic layer creada exitosamente',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creando configuración de semantic layer:', error);
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

