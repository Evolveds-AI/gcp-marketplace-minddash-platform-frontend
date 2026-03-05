export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { mpPayment } from '@/lib/mercadopago/client';

/**
 * POST /api/billing/checkout/verify
 *
 * Verifies the payment status after the user is redirected back from MercadoPago.
 * This is the authoritative check — we never trust the querystring alone.
 *
 * Body: { payment_id?: string, preference_id?: string, external_reference?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token) as any;
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { payment_id, preference_id, external_reference } = body as {
      payment_id?: string;
      preference_id?: string;
      external_reference?: string;
    };

    if (!payment_id) {
      return NextResponse.json(
        { success: false, message: 'payment_id es requerido para verificar el pago' },
        { status: 400 }
      );
    }

    // Fetch payment details from MercadoPago
    const payment = await mpPayment.get({ id: Number(payment_id) });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Pago no encontrado en MercadoPago' },
        { status: 404 }
      );
    }

    const paymentStatus = payment.status; // 'approved' | 'pending' | 'rejected' | ...
    const paymentExternalRef = payment.external_reference || '';
    const paymentAmount = payment.transaction_amount;
    const paymentCurrency = payment.currency_id;
    const paymentMethod = payment.payment_method_id;
    const payerEmail = payment.payer?.email;

    // Parse external_reference: minddash_<userId>_<planId>_<interval>_<timestamp>
    const refParts = paymentExternalRef.split('_');
    const refUserId = refParts[1] || '';
    const refPlanId = refParts[2] || '';
    const refInterval = refParts[3] || 'month';

    // Security: verify the payment belongs to the requesting user
    const currentUserId = decoded.userId || decoded.id || decoded.sub || '';
    if (refUserId && currentUserId && refUserId !== currentUserId) {
      console.warn(`[Checkout Verify] User mismatch: token=${currentUserId}, ref=${refUserId}`);
      return NextResponse.json(
        { success: false, message: 'Este pago no pertenece a tu cuenta' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: paymentStatus,
        payment_id: payment.id,
        external_reference: paymentExternalRef,
        plan_id: refPlanId,
        interval: refInterval,
        amount: paymentAmount,
        currency: paymentCurrency,
        payment_method: paymentMethod,
        payer_email: payerEmail,
        approved: paymentStatus === 'approved',
        date_approved: payment.date_approved || null,
      },
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al verificar el pago' },
      { status: 500 }
    );
  }
}
