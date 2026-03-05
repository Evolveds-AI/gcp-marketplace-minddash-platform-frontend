'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedSpinner } from '@/components/loaders';

export default function ClientRedirect({ params }: { params: { clientId: string } }) {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente a la nueva ruta
    router.replace(`/dashboard/client/${params.clientId}`);
  }, [router, params.clientId]);

  return (
    <UnifiedSpinner 
      size="medium" 
      fullScreen={true}
      message="Redirigiendo..."
    />
  );
}