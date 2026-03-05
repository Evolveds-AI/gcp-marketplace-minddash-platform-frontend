import { useState, useCallback } from 'react';
import { Plan, BillingInterval } from '@/lib/billing/plans';

interface CheckoutState {
  loading: boolean;
  error: string | null;
  initPoint: string | null;
  preferenceId: string | null;
  externalReference: string | null;
}

interface StartCheckoutParams {
  plan: Plan;
  interval: BillingInterval;
  billingEmail?: string;
}

/**
 * Hook to initiate MercadoPago Checkout Pro flow.
 * Calls /api/billing/checkout/start and returns the redirect URL.
 */
export function useMercadoPagoCheckout() {
  const [state, setState] = useState<CheckoutState>({
    loading: false,
    error: null,
    initPoint: null,
    preferenceId: null,
    externalReference: null,
  });

  const startCheckout = useCallback(async ({ plan, interval, billingEmail }: StartCheckoutParams) => {
    setState({ loading: true, error: null, initPoint: null, preferenceId: null, externalReference: null });

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setState((s) => ({ ...s, loading: false, error: 'Sesión expirada. Por favor, inicia sesión.' }));
        return null;
      }

      const auth = JSON.parse(authData);

      const resp = await fetch('/api/billing/checkout/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          plan_id: plan.id,
          interval,
          billing_email: billingEmail,
        }),
      });

      const json = await resp.json();

      if (!resp.ok || !json.success) {
        const msg = json.message || 'Error al iniciar el checkout';
        setState((s) => ({ ...s, loading: false, error: msg }));
        return null;
      }

      const { init_point, sandbox_init_point, preference_id, external_reference } = json.data;

      // Use sandbox in non-production
      const redirectUrl = sandbox_init_point || init_point;

      setState({
        loading: false,
        error: null,
        initPoint: redirectUrl,
        preferenceId: preference_id,
        externalReference: external_reference,
      });

      return redirectUrl;
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message || 'Error inesperado' }));
      return null;
    }
  }, []);

  const redirectToCheckout = useCallback(async (params: StartCheckoutParams) => {
    const url = await startCheckout(params);
    if (url) {
      window.location.href = url;
    }
    return url;
  }, [startCheckout]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, initPoint: null, preferenceId: null, externalReference: null });
  }, []);

  return {
    ...state,
    startCheckout,
    redirectToCheckout,
    reset,
  };
}
