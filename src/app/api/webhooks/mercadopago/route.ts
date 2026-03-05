export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { mpPayment, mpPreApproval } from '@/lib/mercadopago/client';
import { getPlanById } from '@/lib/billing/plans';
import { backendClient } from '@/lib/api/backend-client';
import crypto from 'crypto';

/**
 * Validates the MercadoPago webhook signature if MP_WEBHOOK_SECRET is configured.
 * See: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
 */
function validateWebhookSignature(request: NextRequest): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // If no secret configured, skip validation (dev mode)
    console.warn('[Webhook MP] No MP_WEBHOOK_SECRET configured, skipping signature validation');
    return true;
  }

  const xSignature = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');

  if (!xSignature || !xRequestId) {
    return false;
  }

  // Parse the x-signature header (format: "ts=...,v1=...")
  const parts: Record<string, string> = {};
  xSignature.split(',').forEach((part) => {
    const [key, value] = part.split('=');
    if (key && value) {
      parts[key.trim()] = value.trim();
    }
  });

  const ts = parts['ts'];
  const v1 = parts['v1'];

  if (!ts || !v1) {
    return false;
  }

  // Get data.id from query params
  const dataId = request.nextUrl.searchParams.get('data.id') || '';

  // Build the manifest string
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  // Calculate HMAC
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  return hmac === v1;
}

// In-memory set for idempotency (in production, use Redis or DB)
const processedNotifications = new Set<string>();
const MAX_PROCESSED_SIZE = 10000;

function markAsProcessed(notificationId: string): boolean {
  if (processedNotifications.has(notificationId)) {
    return false; // Already processed
  }
  // Prevent unbounded growth
  if (processedNotifications.size >= MAX_PROCESSED_SIZE) {
    const firstKey = processedNotifications.values().next().value;
    if (firstKey) processedNotifications.delete(firstKey);
  }
  processedNotifications.add(notificationId);
  return true;
}

/**
 * Parses the external_reference to extract user and plan info.
 * Format: minddash_<userId>_<planId>_<interval>_<timestamp>
 */
function parseExternalReference(ref: string) {
  const parts = (ref || '').split('_');
  if (parts.length < 5 || parts[0] !== 'minddash') {
    return null;
  }
  return {
    userId: parts[1],
    planId: parts[2],
    interval: parts[3] as 'month' | 'year',
    timestamp: parts[4],
  };
}

/**
 * Parses subscription external_reference.
 * Format: minddash_sub_<userId>_<planId>_<interval>_<timestamp>
 */
function parseSubscriptionReference(ref: string) {
  const parts = (ref || '').split('_');
  if (parts.length < 6 || parts[0] !== 'minddash' || parts[1] !== 'sub') {
    return null;
  }
  return {
    userId: parts[2],
    planId: parts[3],
    interval: parts[4] as 'month' | 'year',
    timestamp: parts[5],
  };
}

// ─── Event Handlers ─────────────────────────────────────────────

/**
 * Handles one-time payment events (from Checkout Pro).
 */
async function handlePaymentEvent(paymentId: string | undefined) {
  if (!paymentId) return;

  try {
    const payment = await mpPayment.get({ id: paymentId });
    const status = payment.status;
    const externalRef = payment.external_reference || '';
    const parsed = parseExternalReference(externalRef);

    console.log(`[Webhook MP] Payment ${paymentId}: status=${status}, ref=${externalRef}`);

    if (status === 'approved' && parsed) {
      console.log(`[Webhook MP] ✅ Payment approved — plan=${parsed.planId}, user=${parsed.userId}, interval=${parsed.interval}`);
      // TODO: Create billing_payment record + activate plan via backend
    } else if (status === 'rejected' && parsed) {
      console.log(`[Webhook MP] ❌ Payment rejected — user=${parsed.userId}, plan=${parsed.planId}`);
      // TODO: Notify user of failed payment
    } else if (status === 'pending' && parsed) {
      console.log(`[Webhook MP] ⏳ Payment pending — user=${parsed.userId}, plan=${parsed.planId}`);
    }
  } catch (err: any) {
    console.error(`[Webhook MP] Error handling payment ${paymentId}:`, err.message);
  }
}

/**
 * Handles subscription lifecycle events (created, updated, paused, cancelled).
 * MP type: subscription_preapproval
 */
async function handleSubscriptionEvent(subscriptionId: string | undefined, action: string | undefined) {
  if (!subscriptionId) return;

  try {
    const sub = await mpPreApproval.get({ id: subscriptionId }) as any;
    const status = sub.status; // authorized, paused, cancelled, pending
    const externalRef = sub.external_reference || '';
    const parsed = parseSubscriptionReference(externalRef) || parseExternalReference(externalRef);

    console.log(`[Webhook MP] Subscription ${subscriptionId}: status=${status}, action=${action}, ref=${externalRef}`);

    switch (status) {
      case 'authorized':
        console.log(`[Webhook MP] ✅ Subscription authorized — user=${parsed?.userId}, plan=${parsed?.planId}`);
        // TODO: Activate plan, record subscription in billing backend
        break;

      case 'paused':
        console.log(`[Webhook MP] ⏸️ Subscription paused — user=${parsed?.userId}, plan=${parsed?.planId}`);
        // TODO: Mark subscription as paused in backend, keep plan active until period ends
        break;

      case 'cancelled':
        console.log(`[Webhook MP] 🛑 Subscription cancelled — user=${parsed?.userId}, plan=${parsed?.planId}`);
        // TODO: Schedule downgrade to free plan at end of billing period
        break;

      case 'pending':
        console.log(`[Webhook MP] ⏳ Subscription pending — user=${parsed?.userId}, plan=${parsed?.planId}`);
        break;

      default:
        console.log(`[Webhook MP] Subscription unknown status=${status} — user=${parsed?.userId}`);
    }
  } catch (err: any) {
    console.error(`[Webhook MP] Error handling subscription ${subscriptionId}:`, err.message);
  }
}

/**
 * Handles recurring subscription payment events (successful charges, failures).
 * MP type: subscription_authorized_payment
 */
async function handleSubscriptionPaymentEvent(paymentId: string | undefined, action: string | undefined) {
  if (!paymentId) return;

  try {
    // Fetch the payment details
    const payment = await mpPayment.get({ id: paymentId });
    const status = payment.status;
    const externalRef = payment.external_reference || '';
    const parsed = parseSubscriptionReference(externalRef) || parseExternalReference(externalRef);

    console.log(`[Webhook MP] Subscription payment ${paymentId}: status=${status}, action=${action}`);

    if (status === 'approved') {
      console.log(`[Webhook MP] ✅ Recurring payment approved — user=${parsed?.userId}, plan=${parsed?.planId}`);
      // TODO: Record billing_payment, extend subscription period
    } else if (status === 'rejected') {
      console.log(`[Webhook MP] ❌ Recurring payment FAILED — user=${parsed?.userId}, plan=${parsed?.planId}`);
      // TODO: Implement retry/notification logic:
      // 1. Send email notification to user about failed charge
      // 2. Allow grace period (e.g. 3 days)
      // 3. If still failing after retries, pause/downgrade plan
      //
      // For now, log for manual follow-up:
      console.warn(`[Webhook MP] ⚠️ ACTION REQUIRED: Payment failure for user=${parsed?.userId}. Check MercadoPago dashboard.`);
    } else if (status === 'pending') {
      console.log(`[Webhook MP] ⏳ Recurring payment pending — user=${parsed?.userId}`);
    }
  } catch (err: any) {
    console.error(`[Webhook MP] Error handling subscription payment ${paymentId}:`, err.message);
  }
}

// ─── Main Handler ───────────────────────────────────────────────

/**
 * POST /api/webhooks/mercadopago
 *
 * Receives webhook notifications from MercadoPago.
 * Processes payment, subscription, and recurring charge events.
 *
 * This endpoint is PUBLIC (no user auth) — validated via MP signature.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate signature
    if (!validateWebhookSignature(request)) {
      console.error('[Webhook MP] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data, action } = body;

    console.log(`[Webhook MP] Received: type=${type}, action=${action}, data.id=${data?.id}`);

    // 2. Idempotency check
    const notificationId = `${type}_${data?.id}_${action || ''}`;
    if (!markAsProcessed(notificationId)) {
      console.log(`[Webhook MP] Already processed: ${notificationId}`);
      return NextResponse.json({ status: 'already_processed' }, { status: 200 });
    }

    // 3. Handle payment events (one-time checkout)
    if (type === 'payment') {
      await handlePaymentEvent(data?.id);
    }

    // 4. Handle subscription (preapproval) events
    if (type === 'subscription_preapproval') {
      await handleSubscriptionEvent(data?.id, action);
    }

    // 5. Handle subscription authorized payment events (recurring charges)
    if (type === 'subscription_authorized_payment') {
      await handleSubscriptionPaymentEvent(data?.id, action);
    }

    // Always respond 200 quickly to avoid MP retries
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error: any) {
    console.error('[Webhook MP] Error processing webhook:', error);
    // Still return 200 to avoid retries for malformed payloads
    return NextResponse.json({ status: 'error_logged' }, { status: 200 });
  }
}

// MercadoPago may also send GET requests for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
