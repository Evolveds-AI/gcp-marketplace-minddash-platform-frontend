'use client';

// Importar el componente existente de data-sources
import dynamic from 'next/dynamic';
import { UnifiedSpinner } from '@/components/loaders';

// Cargar dinámicamente el componente para evitar problemas de SSR
const DataSourcesPage = dynamic(
  () => import('@/app/admin/data-sources/page').then(mod => ({ default: mod.default })),
  { 
    loading: () => (
      <UnifiedSpinner 
        size="medium" 
        fullScreen={true}
        message="Cargando fuentes de datos..."
      />
    ),
    ssr: false
  }
);

export default function AdminDataSourcesPage() {
  return <DataSourcesPage />;
}