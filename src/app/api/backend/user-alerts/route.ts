import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { backendClient } from '@/lib/api/backend-client';

export const dynamic = 'force-dynamic';

function normalizeAlertsList(alertsResult: any): any[] {
  return Array.isArray(alertsResult?.alerts)
    ? alertsResult.alerts
    : Array.isArray(alertsResult)
      ? alertsResult
      : Array.isArray(alertsResult?.data)
        ? alertsResult.data
        : [];
}

function getTokenFromRequest(request: NextRequest): string | null {
  return request.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

function getBackendStatusCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const statusCode = (error as { statusCode?: number }).statusCode;
  if (typeof statusCode === 'number') return statusCode;
  const status = (error as { status?: number }).status;
  return typeof status === 'number' ? status : null;
}

function isNoAlertsError(error: unknown): boolean {
  if (getBackendStatusCode(error) === 404) return true;
  const message = (error as { message?: string })?.message || '';
  const errorData = (error as { errorData?: unknown })?.errorData;
  const combined = `${message} ${errorData ? JSON.stringify(errorData) : ''}`.toLowerCase();
  return combined.includes('no se encontraron alertas');
}

/**
 * GET /api/backend/user-alerts?product_id=xxx
 * Lista alertas del usuario autenticado para un producto
 */
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const product_id = searchParams.get('product_id');

    if (!product_id) {
      return NextResponse.json({ success: false, message: 'product_id es requerido' }, { status: 400 });
    }

    let alertsResult: any;
    try {
      alertsResult = await backendClient.getAlertsByProduct(product_id);
    } catch (error) {
      if (isNoAlertsError(error)) {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }
    const alertsList = normalizeAlertsList(alertsResult);

    const myAlerts = alertsList.filter((a: any) => a?.user_id === decoded.userId);

    return NextResponse.json({
      success: true,
      data: myAlerts,
    });
  } catch (error: any) {
    console.error('Error obteniendo user-alerts:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al obtener alertas',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backend/user-alerts
 * Crea una alerta para el usuario autenticado
 */
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();

    const {
      product_id,
      prompt_alerta,
      codigo_cron,
      channel_product_type,
      flg_habilitado,
      fecha_inicio,
      fecha_fin,
    } = body;

    if (!product_id) {
      return NextResponse.json({ success: false, message: 'product_id es requerido' }, { status: 400 });
    }

    if (!prompt_alerta || (typeof prompt_alerta === 'string' && prompt_alerta.trim() === '')) {
      return NextResponse.json({ success: false, message: 'prompt_alerta es requerido' }, { status: 400 });
    }

    if (!codigo_cron) {
      return NextResponse.json({ success: false, message: 'codigo_cron es requerido' }, { status: 400 });
    }

    const payload = {
      product_id,
      prompt_alerta,
      codigo_cron,
      user_id: decoded.userId,
      session_id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
      channel_product_type,
      flg_habilitado,
      fecha_inicio,
      fecha_fin,
    };

    const result = await backendClient.createAlert(payload);

    return NextResponse.json(
      {
        success: true,
        message: 'Alerta creada exitosamente',
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creando user-alert:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al crear alerta',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/backend/user-alerts
 * Actualiza una alerta del usuario autenticado
 */
export async function PUT(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();

    const { id, product_id, prompt_alerta, codigo_cron, channel_product_type, flg_habilitado, fecha_inicio, fecha_fin } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'id es requerido' }, { status: 400 });
    }

    if (!product_id) {
      return NextResponse.json({ success: false, message: 'product_id es requerido' }, { status: 400 });
    }

    let alertsResult: any;
    try {
      alertsResult = await backendClient.getAlertsByProduct(product_id);
    } catch (error) {
      if (isNoAlertsError(error)) {
        alertsResult = [];
      } else {
        throw error;
      }
    }
    const alertsList = normalizeAlertsList(alertsResult);
    const existing = alertsList.find((a: any) => a?.id === id);

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Alerta no encontrada' }, { status: 404 });
    }

    if (existing.user_id !== decoded.userId) {
      return NextResponse.json({ success: false, message: 'No tienes permisos para modificar esta alerta' }, { status: 403 });
    }

    const payload = {
      id,
      product_id,
      prompt_alerta,
      codigo_cron,
      channel_product_type,
      flg_habilitado,
      fecha_inicio,
      fecha_fin,
      user_id: decoded.userId,
    };

    const result = await backendClient.updateAlert(payload);

    return NextResponse.json({
      success: true,
      message: 'Alerta actualizada exitosamente',
      data: result,
    });
  } catch (error: any) {
    console.error('Error actualizando user-alert:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al actualizar alerta',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backend/user-alerts
 * Elimina una alerta del usuario autenticado
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { id, product_id } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'id es requerido' }, { status: 400 });
    }

    if (!product_id) {
      return NextResponse.json({ success: false, message: 'product_id es requerido' }, { status: 400 });
    }

    let alertsResult: any;
    try {
      alertsResult = await backendClient.getAlertsByProduct(product_id);
    } catch (error) {
      if (isNoAlertsError(error)) {
        alertsResult = [];
      } else {
        throw error;
      }
    }
    const alertsList = normalizeAlertsList(alertsResult);
    const existing = alertsList.find((a: any) => a?.id === id);

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Alerta no encontrada' }, { status: 404 });
    }

    if (existing.user_id !== decoded.userId) {
      return NextResponse.json({ success: false, message: 'No tienes permisos para eliminar esta alerta' }, { status: 403 });
    }

    const result = await backendClient.deleteAlert(id);

    return NextResponse.json({
      success: true,
      message: 'Alerta eliminada exitosamente',
      data: result,
    });
  } catch (error: any) {
    console.error('Error eliminando user-alert:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error al eliminar alerta',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      { status: 500 }
    );
  }
}
