export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
  'https://backend-service-dev-minddash-294493969622.us-central1.run.app';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    // Verificar permisos (admin o admin-client) - case insensitive
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para desplegar ejemplos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { product_id, environment = 'develop' } = body;

    if (!product_id) {
      return NextResponse.json(
        { success: false, message: 'product_id es requerido' },
        { status: 400 }
      );
    }

    // Configuración de rutas según el ambiente
    const bucketName = 'gs-minddash-agent-env';
    const examplesYamlPath = `examples_agents/few_shot_examples_${environment}.yaml`;
    const embeddingsNpyPath = `examples_agents/few_shot_examples_${environment}.npy`;
    const modelName = 'paraphrase-multilingual-mpnet-base-v2';

    // Construir y subir ejemplos + embeddings a GCS
    const response = await fetch(`${BACKEND_URL}/prompts_and_examples/examples/uploadByProduct`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        product_id,
        bucket_name: bucketName,
        examples_yaml_path: examplesYamlPath,
        embeddings_npy_path: embeddingsNpyPath,
        model_name: modelName
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error del backend Python:', error);
      
      // Retornar el error completo para mejor debugging
      return NextResponse.json(
        { 
          success: false,
          message: error.detail || error.message || 'Error al desplegar ejemplos',
          detail: error.detail,
          status: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error en POST /api/backend/examples/deploy:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
