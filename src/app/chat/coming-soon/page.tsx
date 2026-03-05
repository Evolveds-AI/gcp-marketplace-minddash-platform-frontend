'use client';

// Importar el componente existente de proximamente
import dynamic from 'next/dynamic';
import { UnifiedSpinner } from '@/components/loaders';

// Cargar dinámicamente el componente para evitar problemas de SSR
const ComingSoonPage = dynamic(
  () => import('@/app/chatbots/proximamente/page').then(mod => ({ default: mod.default })),
  { 
    loading: () => (
      <UnifiedSpinner 
        size="medium" 
        fullScreen={true}
        message="Cargando página..."
      />
    ),
    ssr: false
  }
);

export default function ChatComingSoonPage() {
  return <ComingSoonPage />;
}