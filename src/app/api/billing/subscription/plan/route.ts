export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { mpPreApprovalPlan, MP_URLS } from '@/lib/mercadopago/client';
import { PLANS, getPlanPrice, BillingInterval } from '@/lib/billing/plans';

/**
 * POST /api/billing/subscription/plan
 *
 * Creates a MercadoPago preapproval_plan (subscription plan template)
 * for a given MindDash plan + interval. These are created once and reused.
 *
 * Body: { plan_id: string, interval: 'month' | 'year' }
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
    const { plan_id, interval } = body as { plan_id: string; interval: BillingInterval };

    const plan = PLANS.find((p) => p.id === plan_id);
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Plan no encontrado' }, { status: 404 });
    }

    const billingInterval: BillingInterval = interval === 'year' ? 'year' : 'month';
    const price = getPlanPrice(plan, billingInterval);

    if (price <= 0) {
      return NextResponse.json({ success: false, message: 'El plan gratuito no requiere suscripción' }, { status: 400 });
    }

    const frequencyType = billingInterval === 'year' ? 'months' : 'months';
    const frequency = billingInterval === 'year' ? 12 : 1;
    const repetitions = billingInterval === 'year' ? 1 : 12; // 1 year commitment

    const preApprovalPlanData = {
      body: {
        reason: `MindDash ${plan.name} - ${billingInterval === 'year' ? 'Anual' : 'Mensual'}`,
        auto_recurring: {
          frequency,
          frequency_type: frequencyType,
          repetitions,
          billing_day: 10,
          billing_day_proportional: true,
          transaction_amount: billingInterval === 'year' ? price * 12 : price,
          currency_id: 'USD',
        },
        back_url: MP_URLS.subscriptionBack,
      },
    };

    const result = await mpPreApprovalPlan.create(preApprovalPlanData);

    return NextResponse.json({
      success: true,
      data: {
        preapproval_plan_id: result.id,
        reason: result.reason,
        status: result.status,
        init_point: result.init_point,
      },
    });
  } catch (error: any) {
    console.error('Error creating MP subscription plan:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al crear plan de suscripción' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/subscription/plan?plan_id=...&interval=...
 *
 * Lists/searches existing MP preapproval_plans. Useful for checking
 * if a plan was already created in MP to avoid duplicates.
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

    // MP SDK doesn't have a direct search for preapproval_plans,
    // so we return our known plan mapping
    const planMapping = PLANS.filter((p) => p.price > 0).map((p) => ({
      plan_id: p.id,
      plan_name: p.name,
      monthly_price: p.price,
      annual_price: p.annualPrice,
      currency: p.currency,
    }));

    return NextResponse.json({
      success: true,
      data: planMapping,
    });
  } catch (error: any) {
    console.error('Error listing subscription plans:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al listar planes de suscripción' },
      { status: 500 }
    );
  }
}
