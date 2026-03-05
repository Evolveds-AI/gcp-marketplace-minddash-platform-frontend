'use client';

// Importar el componente existente de selector
import dynamic from 'next/dynamic';
import { UnifiedSpinner } from '@/components/loaders';

// Cargar dinámicamente el componente para evitar problemas de SSR
const ClientSelectorPage = dynamic(
  () => import('@/app/selector/page').then(mod => ({ default: mod.default })),
  { 
    loading: () => (
      <UnifiedSpinner 
        size="medium" 
        fullScreen={true}
        message="Cargando selector de chat..."
      />
    ),
    ssr: false
  }
);

export default function ChatSelectorPage() {
  return <ClientSelectorPage />;
}