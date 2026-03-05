'use client';

import { Spotlight } from '@/components/ui/spotlight-new';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Componente Spotlight como fondo */}
      <Spotlight
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .06) 0, hsla(210, 100%, 55%, .02) 50%, hsla(210, 100%, 45%, 0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 55%, .02) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .03) 0, hsla(210, 100%, 45%, .01) 80%, transparent 100%)"
        translateY={-250}
        width={400}
        height={1000}
        smallWidth={180}
        duration={8}
        xOffset={80}
      />
      
      {/* Patrón de fondo sutil */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] z-10"></div>
      
      {/* Gradientes decorativos suaves */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-[0.02] animate-blob z-10"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-[0.02] animate-blob animation-delay-2000 z-10"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-[0.02] animate-blob animation-delay-4000 z-10"></div>
      
      <div className="relative z-20">
        {/* Logo */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="relative w-24 h-24 transition-all duration-700 scale-100 opacity-100">
              <Image 
                src="/images/Evolve.png" 
                alt="Logo Evolve"
                width={96}
                height={96}
                className="mx-auto object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Contenido del error 404 */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md transition-all duration-700 delay-200 translate-y-0 opacity-100">
          <div className="bg-card py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-border backdrop-blur-sm">
            <div className="text-center">
              {/* Icono 404 */}
              <div className="mb-6 flex justify-center">
                <AlertTriangle className="h-16 w-16 text-yellow-500" aria-label="Página no encontrada" />
              </div>
              
              {/* Título principal */}
              <h1 className="text-4xl font-bold text-foreground mb-2">
                404
              </h1>
              
              {/* Subtítulo */}
              <h2 className="text-xl font-semibold text-foreground/90 mb-4">
                ¡Oops! Página no encontrada
              </h2>
              
              {/* Mensaje descriptivo */}
              <p className="text-muted-foreground mb-6 leading-relaxed">
                La página que buscas no existe o ha sido movida. <br/>
                No te preocupes, te ayudamos a encontrar lo que necesitas.
              </p>
              
              {/* Botones de acción */}
              <div className="space-y-3">
                <Link 
                  href="/login"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Ir al Inicio
                </Link>
                
                <button 
                  onClick={() => window.history.back()}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground/80 bg-transparent hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Volver Atrás
                </button>
              </div>
              
              {/* Mensaje adicional */}
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground/60">
                  Si crees que esto es un error, contacta al administrador.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos CSS adicionales */}
      <style jsx>{`

        
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, #1a1a1a 1px, transparent 1px),
            linear-gradient(to bottom, #1a1a1a 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
}