'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPlanById } from '@/lib/billing/plans';

interface VerifyResult {
  status: string;
  plan_id: string;
  interval: string;
  amount: number;
  currency: string;
  payment_method: string;
  payer_email: string;
  approved: boolean;
  date_approved: string | null;
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <BillingSuccessContent />
    </Suspense>
  );
}

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verifyData, setVerifyData] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paymentId = searchParams.get('payment_id');
  const preferenceId = searchParams.get('preference_id');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    async function verifyPayment() {
      if (!paymentId) {
        setLoading(false);
        return;
      }

      try {
        const authData = localStorage.getItem('evolve-auth');
        if (!authData) {
          setError('Sesión expirada. Por favor, inicia sesión.');
          setLoading(false);
          return;
        }

        const auth = JSON.parse(authData);
        const resp = await fetch('/api/billing/checkout/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.accessToken}`,
          },
          body: JSON.stringify({
            payment_id: paymentId,
            preference_id: preferenceId,
            external_reference: externalReference,
          }),
        });

        const json = await resp.json();
        if (json.success && json.data) {
          setVerifyData(json.data);
        } else {
          setError(json.message || 'No se pudo verificar el pago.');
        }
      } catch (err: any) {
        setError(err.message || 'Error al verificar el pago.');
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [paymentId, preferenceId, externalReference]);

  const plan = verifyData?.plan_id ? getPlanById(verifyData.plan_id) : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-green-400 animate-spin" />
            <p className="text-gray-400 text-sm">Verificando tu pago...</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Pago registrado</h1>
            <p className="text-gray-400 text-sm">
              Tu pago fue procesado pero no pudimos verificarlo automáticamente. 
              Nuestro equipo lo revisará y activará tu plan en breve.
            </p>
            <p className="text-xs text-gray-500">{error}</p>
            <Button
              onClick={() => router.push('/dashboard/admin')}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              Ir al Dashboard
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">
                {verifyData?.approved ? '¡Pago exitoso!' : 'Pago procesado'}
              </h1>
              <p className="text-gray-400">
                {verifyData?.approved
                  ? `Tu plan ${plan?.name || verifyData?.plan_id || ''} ha sido activado.`
                  : 'Tu pago está siendo procesado.'}
              </p>
            </div>

            {verifyData && (
              <div className="bg-[#111] border border-gray-800 rounded-lg p-4 space-y-3 text-left">
                {plan && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Plan</span>
                    <span className="text-white font-medium">{plan.name}</span>
                  </div>
                )}
                {verifyData.interval && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Período</span>
                    <span className="text-white font-medium">
                      {verifyData.interval === 'year' ? 'Anual' : 'Mensual'}
                    </span>
                  </div>
                )}
                {verifyData.amount != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Monto</span>
                    <span className="text-white font-medium">
                      ${verifyData.amount} {verifyData.currency || 'USD'}
                    </span>
                  </div>
                )}
                {verifyData.payer_email && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Email</span>
                    <span className="text-white font-medium">{verifyData.payer_email}</span>
                  </div>
                )}
                {verifyData.payment_method && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Método</span>
                    <span className="text-white font-medium">{verifyData.payment_method}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => router.push('/dashboard/admin')}
                className="w-full bg-green-600 hover:bg-green-500 text-white"
              >
                Ir al Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard/admin/settings')}
                className="w-full text-gray-400 hover:text-white"
              >
                Ver Facturación
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
