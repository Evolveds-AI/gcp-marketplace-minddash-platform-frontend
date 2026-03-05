export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { mpPreference, MP_URLS } from '@/lib/mercadopago/client';
import { getPlanById, getPlanPrice, BillingInterval } from '@/lib/billing/plans';

/**
 * POST /api/billing/checkout/start
 *
 * Creates a MercadoPago Checkout Pro preference for the selected plan.
 * Returns the init_point URL to redirect the user to MercadoPago.
 *
 * Body: { plan_id: string, interval: 'month' | 'year', billing_email?: string }
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
    const { plan_id, interval, billing_email } = body as {
      plan_id: string;
      interval: BillingInterval;
      billing_email?: string;
    };

    if (!plan_id || typeof plan_id !== 'string') {
      return NextResponse.json({ success: false, message: 'plan_id es requerido' }, { status: 400 });
    }

    const plan = getPlanById(plan_id);
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Plan no encontrado' }, { status: 404 });
    }

    const billingInterval: BillingInterval = interval === 'year' ? 'year' : 'month';
    const price = getPlanPrice(plan, billingInterval);

    if (price <= 0) {
      return NextResponse.json(
        { success: false, message: 'El plan gratuito no requiere pago' },
        { status: 400 }
      );
    }

    // Verify MP credentials are configured
    const mpToken = process.env.MP_ENVIRONMENT === 'production'
      ? process.env.MP_ACCESS_TOKEN
      : (process.env.MP_ACCESS_TOKEN_TEST || process.env.MP_ACCESS_TOKEN);
    if (!mpToken) {
      console.error('[Checkout] MercadoPago access token not configured');
      return NextResponse.json(
        { success: false, message: 'Pasarela de pago no configurada. Contacte al administrador.' },
        { status: 503 }
      );
    }

    const userId = decoded.userId || decoded.id || decoded.sub || '';
    const timestamp = Date.now();
    const externalReference = `minddash_${userId}_${plan_id}_${billingInterval}_${timestamp}`;

    const periodLabel = billingInterval === 'year' ? 'Anual' : 'Mensual';
    const totalAmount = billingInterval === 'year' ? price * 12 : price;

    const preferenceData = {
      body: {
        items: [
          {
            id: `plan_${plan_id}_${billingInterval}`,
            title: `MindDash ${plan.name} - ${periodLabel}`,
            description: `Suscripción ${periodLabel.toLowerCase()} al plan ${plan.name}`,
            quantity: 1,
            unit_price: totalAmount,
            currency_id: 'USD',
          },
        ],
        payer: {
          email: billing_email || decoded.email || '',
        },
        back_urls: {
          success: MP_URLS.success,
          failure: MP_URLS.failure,
          pending: MP_URLS.pending,
        },
        auto_return: 'approved' as const,
        external_reference: externalReference,
        notification_url: MP_URLS.notification,
        statement_descriptor: 'MindDash',
        metadata: {
          user_id: userId,
          plan_id: plan_id,
          plan_name: plan.name,
          interval: billingInterval,
          unit_price: price,
        },
      },
    };

    const preference = await mpPreference.create(preferenceData);

    return NextResponse.json({
      success: true,
      data: {
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        preference_id: preference.id,
        external_reference: externalReference,
      },
    });
  } catch (error: any) {
    console.error('Error creating MercadoPago preference:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al crear preferencia de pago' },
      { status: 500 }
    );
  }
}
