'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingFailurePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <BillingFailureContent />
    </Suspense>
  );
}

function BillingFailureContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const externalReference = searchParams.get('external_reference') || '';
  const paymentId = searchParams.get('payment_id');

  // Parse plan info from external_reference: minddash_<userId>_<planId>_<interval>_<ts>
  const refParts = externalReference.split('_');
  const planId = refParts[2] || '';

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-red-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Pago no completado</h1>
          <p className="text-gray-400">
            El pago no pudo ser procesado. No se realizó ningún cargo a tu cuenta.
          </p>
        </div>

        <div className="bg-[#111] border border-gray-800 rounded-lg p-4 space-y-2 text-left">
          <p className="text-sm text-gray-400">
            Esto puede ocurrir por varias razones:
          </p>
          <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
            <li>Fondos insuficientes</li>
            <li>Datos de la tarjeta incorrectos</li>
            <li>El pago fue cancelado</li>
            <li>Límite de la tarjeta excedido</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => router.push('/dashboard/admin/settings')}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
          >
            <RotateCcw className="mr-2 w-4 h-4" />
            Intentar de nuevo
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/admin')}
            className="w-full text-gray-400 hover:text-white"
          >
            Ir al Dashboard
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        {paymentId && (
          <p className="text-xs text-gray-600">
            Ref: {paymentId}
          </p>
        )}
      </div>
    </div>
  );
}
