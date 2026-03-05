import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';
import { v4 as uuidv4 } from 'uuid';

const allowedRoles = ['admin', 'admin-client', 'super_admin'];

function normalizeAlertsList(alertsResult: any): any[] {
  if (Array.isArray(alertsResult?.alerts)) return alertsResult.alerts;
  if (Array.isArray(alertsResult)) return alertsResult;
  if (Array.isArray(alertsResult?.data)) return alertsResult.data;
  return [];
}

function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { error: { success: false, message: 'Token requerido' }, status: 401 };
  }
  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return { error: { success: false, message: 'Token inválido' }, status: 401 };
  }
  const userRole = decoded.role?.toLowerCase();
  if (!userRole || !allowedRoles.includes(userRole)) {
    return { error: { success: false, message: 'No tienes permisos para gestionar alertas' }, status: 403 };
  }
  return { decoded };
}

function validateCreatePayload(body: any) {
  const {
    product_id,
    prompt_alerta,
    codigo_cron,
    user_id,
    channel_product_type,
    flg_habilitado,
    fecha_inicio,
    fecha_fin,
  } = body || {};

  if (!product_id) return 'product_id es requerido';
  if (!user_id) return 'user_id es requerido';
  if (!prompt_alerta || typeof prompt_alerta !== 'string' || !prompt_alerta.trim()) return 'prompt_alerta es requerido';
  if (prompt_alerta.length > 1500) return 'prompt_alerta no puede exceder 1500 caracteres';
  if (!codigo_cron || typeof codigo_cron !== 'string' || !codigo_cron.trim()) return 'codigo_cron es requerido';
  if (channel_product_type && !['email', 'whatsapp'].includes(channel_product_type)) {
    return 'channel_product_type inválido (email|whatsapp)';
  }
  if (fecha_inicio && Number.isNaN(Date.parse(fecha_inicio))) return 'fecha_inicio inválida';
  if (fecha_fin && Number.isNaN(Date.parse(fecha_fin))) return 'fecha_fin inválida';

  return null;
}

function validateUpdatePayload(body: any) {
  const {
    id,
    product_id,
    prompt_alerta,
    codigo_cron,
    user_id,
    channel_product_type,
    flg_habilitado,
    fecha_inicio,
    fecha_fin,
  } = body || {};

  if (!id) return 'id es requerido';
  if (!product_id) return 'product_id es requerido';
  if (prompt_alerta && prompt_alerta.length > 1500) return 'prompt_alerta no puede exceder 1500 caracteres';
  if (channel_product_type && !['email', 'whatsapp'].includes(channel_product_type)) {
    return 'channel_product_type inválido (email|whatsapp)';
  }
  if (fecha_inicio && Number.isNaN(Date.parse(fecha_inicio))) return 'fecha_inicio inválida';
  if (fecha_fin && Number.isNaN(Date.parse(fecha_fin))) return 'fecha_fin inválida';

  const hasUpdates =
    prompt_alerta !== undefined ||
    codigo_cron !== undefined ||
    user_id !== undefined ||
    channel_product_type !== undefined ||
    flg_habilitado !== undefined ||
    fecha_inicio !== undefined ||
    fecha_fin !== undefined;

  if (!hasUpdates) return 'Se requiere al menos un campo a actualizar';

  return null;
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth) return NextResponse.json(auth.error, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const product_id = searchParams.get('product_id');
  if (!product_id) {
    return NextResponse.json({ success: false, message: 'product_id es requerido' }, { status: 400 });
  }

  try {
    const alertsResult = await backendClient.getAlertsByProduct(product_id);
    const alertsList = normalizeAlertsList(alertsResult);

    return NextResponse.json({ success: true, data: alertsList });
  } catch (error: any) {
    console.error('Error en GET /api/backend/alerts:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al obtener alertas' },
      { status: error?.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth) return NextResponse.json(auth.error, { status: auth.status });

  try {
    const body = await request.json();
    const errorMsg = validateCreatePayload(body);
    if (errorMsg) {
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const payload = {
      ...body,
      session_id: uuidv4(),
    };

    const result = await backendClient.createAlert(payload);
    return NextResponse.json({ success: true, message: 'Alerta creada', data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/backend/alerts:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al crear alerta' },
      { status: error?.statusCode || 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth) return NextResponse.json(auth.error, { status: auth.status });

  try {
    const body = await request.json();
    const errorMsg = validateUpdatePayload(body);
    if (errorMsg) {
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const alertsResult = await backendClient.getAlertsByProduct(body.product_id);
    const alertsList = normalizeAlertsList(alertsResult);
    const existing = alertsList.find((a: any) => a?.id === body.id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Alerta no encontrada' }, { status: 404 });
    }

    const result = await backendClient.updateAlert(body);
    return NextResponse.json({ success: true, message: 'Alerta actualizada', data: result });
  } catch (error: any) {
    console.error('Error en PUT /api/backend/alerts:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al actualizar alerta' },
      { status: error?.statusCode || 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth) return NextResponse.json(auth.error, { status: auth.status });

  try {
    const body = await request.json();
    const { id, product_id } = body || {};
    if (!id) return NextResponse.json({ success: false, message: 'id es requerido' }, { status: 400 });
    if (!product_id) return NextResponse.json({ success: false, message: 'product_id es requerido' }, { status: 400 });

    const alertsResult = await backendClient.getAlertsByProduct(product_id);
    const alertsList = normalizeAlertsList(alertsResult);
    const existing = alertsList.find((a: any) => a?.id === id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Alerta no encontrada' }, { status: 404 });
    }

    const result = await backendClient.deleteAlert(id);
    return NextResponse.json({ success: true, message: 'Alerta eliminada', data: result });
  } catch (error: any) {
    console.error('Error en DELETE /api/backend/alerts:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al eliminar alerta' },
      { status: error?.statusCode || 500 }
    );
  }
}
