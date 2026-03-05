export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { mpPreApproval } from '@/lib/mercadopago/client';

/**
 * GET /api/billing/subscription/status?subscription_id=...
 *
 * Fetches the current status of a MercadoPago subscription (preapproval).
 * Used to sync subscription state with the local billing system.
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

    const subscriptionId = request.nextUrl.searchParams.get('subscription_id');
    if (!subscriptionId) {
      return NextResponse.json({ success: false, message: 'subscription_id es requerido' }, { status: 400 });
    }

    const result = await mpPreApproval.get({ id: subscriptionId }) as any;

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
        reason: result.reason,
        external_reference: result.external_reference,
        payer_email: result.payer_email,
        init_point: result.init_point,
        date_created: result.date_created,
        last_modified: result.last_modified,
        auto_recurring: result.auto_recurring,
        next_payment_date: result.next_payment_date,
      },
    });
  } catch (error: any) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al obtener estado de suscripción' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/billing/subscription/status
 *
 * Updates the status of a MercadoPago subscription.
 * Used to pause, cancel, or reactivate subscriptions.
 *
 * Body: { subscription_id: string, status: 'authorized' | 'paused' | 'cancelled' }
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription_id, status } = body as {
      subscription_id: string;
      status: 'authorized' | 'paused' | 'cancelled';
    };

    if (!subscription_id) {
      return NextResponse.json({ success: false, message: 'subscription_id es requerido' }, { status: 400 });
    }

    const validStatuses = ['authorized', 'paused', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: `status debe ser uno de: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await mpPreApproval.update({
      id: subscription_id,
      body: { status },
    }) as any;

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
        reason: result.reason,
        last_modified: result.last_modified,
      },
    });
  } catch (error: any) {
    console.error('Error updating subscription status:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al actualizar estado de suscripción' },
      { status: 500 }
    );
  }
}
