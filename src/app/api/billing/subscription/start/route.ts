export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { mpPreApproval, MP_URLS } from '@/lib/mercadopago/client';
import { getPlanById, getPlanPrice, BillingInterval } from '@/lib/billing/plans';

/**
 * POST /api/billing/subscription/start
 *
 * Creates a MercadoPago preapproval (subscription) for the authenticated user.
 * This is the recurring payment flow — user needs an MP account.
 *
 * Body: {
 *   plan_id: string,
 *   interval: 'month' | 'year',
 *   preapproval_plan_id?: string,  // if already created via /subscription/plan
 *   payer_email: string
 * }
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
    const { plan_id, interval, preapproval_plan_id, payer_email } = body as {
      plan_id: string;
      interval: BillingInterval;
      preapproval_plan_id?: string;
      payer_email: string;
    };

    const plan = getPlanById(plan_id);
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Plan no encontrado' }, { status: 404 });
    }

    const billingInterval: BillingInterval = interval === 'year' ? 'year' : 'month';
    const price = getPlanPrice(plan, billingInterval);

    if (price <= 0) {
      return NextResponse.json({ success: false, message: 'El plan gratuito no requiere suscripción' }, { status: 400 });
    }

    if (!payer_email) {
      return NextResponse.json({ success: false, message: 'payer_email es requerido' }, { status: 400 });
    }

    const userId = decoded.userId || decoded.id || decoded.sub || '';
    const externalReference = `minddash_sub_${userId}_${plan_id}_${billingInterval}_${Date.now()}`;

    const frequency = billingInterval === 'year' ? 12 : 1;
    const totalAmount = billingInterval === 'year' ? price * 12 : price;

    // Calculate end_date: 1 year from now
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const preApprovalData: any = {
      body: {
        reason: `MindDash ${plan.name} - ${billingInterval === 'year' ? 'Anual' : 'Mensual'}`,
        external_reference: externalReference,
        payer_email: payer_email,
        auto_recurring: {
          frequency: frequency,
          frequency_type: 'months',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          transaction_amount: totalAmount,
          currency_id: 'USD',
        },
        back_url: MP_URLS.subscriptionBack,
        status: 'pending',
      },
    };

    // If a preapproval_plan_id was provided, link to it
    if (preapproval_plan_id) {
      preApprovalData.body.preapproval_plan_id = preapproval_plan_id;
    }

    const result = await mpPreApproval.create(preApprovalData) as any;

    return NextResponse.json({
      success: true,
      data: {
        subscription_id: result.id,
        status: result.status,
        init_point: result.init_point,
        sandbox_init_point: result.sandbox_init_point || null,
        external_reference: externalReference,
        payer_email: payer_email,
      },
    });
  } catch (error: any) {
    console.error('Error creating MP subscription:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al crear suscripción' },
      { status: 500 }
    );
  }
}
