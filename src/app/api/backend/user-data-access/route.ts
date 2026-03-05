import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

/**
 * POST /api/backend/user-data-access
 * Obtiene todos los registros de acceso a datos de usuario o uno específico por ID
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
    const { user_data_access_id } = body;

    console.log('📥 Solicitando User Data Access:', user_data_access_id ? `ID: ${user_data_access_id}` : 'TODOS');

    // Llamar al backend Python
    const result = await backendClient.getUserDataAccess(user_data_access_id);

    console.log('📤 Backend Python devolvió:', Array.isArray(result) ? `Array(${result.length})` : typeof result);
    console.log('📤 Datos completos:', JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error obteniendo acceso a datos de usuario:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener acceso a datos',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
