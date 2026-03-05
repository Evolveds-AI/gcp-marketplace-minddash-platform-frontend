import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/semantic/createConfig
 * Crea un nuevo registro de configuración de capa semántica
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
    const { product_id, object_path_saved, bucket_name_saved } = body;

    if (!product_id || !object_path_saved || !bucket_name_saved) {
      return NextResponse.json(
        { success: false, message: 'product_id, object_path_saved y bucket_name_saved son requeridos' },
        { status: 400 }
      );
    }

    // Llamar al backend Python
    const result = await backendClient.createSemanticLayerConfig({
      product_id,
      object_path_saved,
      bucket_name_saved
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error creando configuración de capa semántica:', error);
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
