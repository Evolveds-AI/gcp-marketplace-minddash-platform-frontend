'use client';

// Importar el componente existente de yaml-config
import dynamic from 'next/dynamic';
import { UnifiedSpinner } from '@/components/loaders';

// Cargar dinámicamente el componente para evitar problemas de SSR
const YamlConfigPage = dynamic(
  () => import('@/app/admin/yaml-config/page').then(mod => ({ default: mod.default })),
  { 
    loading: () => (
      <UnifiedSpinner 
        size="medium" 
        fullScreen={true}
        message="Cargando configuración YAML..."
      />
    ),
    ssr: false
  }
);

export default function AdminYamlConfigPage() {
  return <YamlConfigPage />;
}