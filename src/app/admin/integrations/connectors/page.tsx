'use client';

// Importar el componente existente de connectors
import dynamic from 'next/dynamic';
import { UnifiedSpinner } from '@/components/loaders';

// Cargar dinámicamente el componente para evitar problemas de SSR
const ConnectorsPage = dynamic(
  () => import('@/app/admin/connectors/page').then(mod => ({ default: mod.default })),
  { 
    loading: () => (
      <UnifiedSpinner 
        size="medium" 
        fullScreen={true}
        message="Cargando conectores..."
      />
    ),
    ssr: false
  }
);

export default function AdminConnectorsPage() {
  return <ConnectorsPage />;
}