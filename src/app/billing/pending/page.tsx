'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingPendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <BillingPendingContent />
    </Suspense>
  );
}

function BillingPendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference') || '';

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center">
          <Clock className="w-10 h-10 text-yellow-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Pago pendiente</h1>
          <p className="text-gray-400">
            Tu pago está siendo procesado. Esto puede tomar unos minutos dependiendo del método de pago elegido.
          </p>
        </div>

        <div className="bg-[#111] border border-yellow-900/50 rounded-lg p-4 space-y-2 text-left">
          <p className="text-sm text-yellow-400/80 font-medium">¿Qué pasará ahora?</p>
          <ul className="text-sm text-gray-400 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">1.</span>
              Recibirás un email de MercadoPago cuando el pago se confirme.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">2.</span>
              Tu plan se activará automáticamente tras la confirmación.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">3.</span>
              Puedes verificar el estado desde la sección de Facturación.
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => router.push('/dashboard/admin')}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white"
          >
            Ir al Dashboard
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
            className="w-full text-gray-400 hover:text-white"
          >
            <RefreshCw className="mr-2 w-4 h-4" />
            Verificar estado
          </Button>
        </div>

        {paymentId && (
          <p className="text-xs text-gray-600">
            ID de pago: {paymentId}
          </p>
        )}
      </div>
    </div>
  );
}
