'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedSpinner } from '@/components/loaders';

export default function UserDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente a la nueva ruta
    router.replace('/dashboard/user');
  }, [router]);

  return (
    <UnifiedSpinner 
      size="medium" 
      fullScreen={true}
      message="Redirigiendo..."
    />
  );
}