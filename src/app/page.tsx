import { redirect } from 'next/navigation';
import ClientOnly from '@/components/ClientOnly';
import HomeClient from '@/components/HomeClient';
import { UnifiedSpinner } from '@/components/loaders';

export default function Home() {
  return (
    <ClientOnly fallback={
      <UnifiedSpinner 
        size="large" 
        fullScreen={true}
        message="Cargando aplicación..."
      />
    }>
      <HomeClient />
    </ClientOnly>
  );
}
