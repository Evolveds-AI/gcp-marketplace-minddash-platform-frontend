'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/ui/AuthLayout';
import { toast } from 'sonner';

export default function NoChatbotsPage() {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = () => {
    // Limpiar localStorage
    localStorage.removeItem('evolve-auth');
    localStorage.removeItem('evolve-selected-client');
    localStorage.removeItem('chatbot-conversations');
    
    // Redirigir al login
    router.push('/login?logout=true');
  };

  const handleContactAdmin = () => {
    // Aquí podrías implementar lógica para contactar al administrador
    // Por ejemplo, abrir un modal de contacto o redirigir a un formulario
    toast.info('Por favor, contacta al administrador del sistema para solicitar acceso a un chatbot.');
  };

  if (!isClient) {
    return null;
  }

  return (
    <AuthLayout
      title="Sin Chatbots Asignados"
      subtitle="No tienes chatbots disponibles en este momento"
    >
      <div className="space-y-6">
        {/* Mensaje principal */}
        <div className="bg-yellow-900/20 border border-yellow-800 text-yellow-400 px-4 py-3 rounded-lg text-sm">
          <div className="flex">
            <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 018.618 8.04A12.02 12.02 0 0112 21c-2.678 0-5.184-.844-7.242-2.284L2 21l1.716-2.758A11.955 11.955 0 012.382 10.96z" />
            </svg>
            <div>
              <p className="font-medium">No tienes chatbots asignados</p>
              <p className="mt-1 text-yellow-300">
                Actualmente no tienes acceso a ningún chatbot. Contacta al administrador para solicitar acceso.
              </p>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-200 mb-3">¿Qué puedes hacer?</h3>
          <ul className="space-y-2 text-gray-400">
            <li className="flex items-start">
              <svg className="h-5 w-5 mr-2 mt-0.5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Contactar al administrador del sistema para solicitar acceso
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 mr-2 mt-0.5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Esperar a que te asignen un chatbot
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 mr-2 mt-0.5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar la página para verificar nuevos accesos
            </li>
          </ul>
        </div>

        {/* Botones de acción */}
        <div className="space-y-3">
          <button
            onClick={handleContactAdmin}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Contactar Administrador
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full flex justify-center py-3 px-4 border border-gray-600 rounded-lg shadow-sm bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar Página
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex justify-center py-3 px-4 border border-red-600 rounded-lg shadow-sm bg-red-900/20 text-sm font-medium text-red-400 hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}