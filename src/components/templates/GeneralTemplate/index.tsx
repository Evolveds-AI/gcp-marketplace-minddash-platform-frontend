'use client';

import React from 'react';
import { useAccess } from '@/hooks/useAccess';

interface GeneralTemplateProps {
  clientId: string;
  productId: string;
  userId: string;
}

export default function GeneralTemplate({ clientId, productId, userId }: GeneralTemplateProps) {
  const { hasAccess, isLoading, error } = useAccess(userId, 'product', 'id', productId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-8 text-center max-w-md">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2 text-white">Error de Verificación</h2>
          <p className="text-gray-300 mb-4">No se pudo verificar el acceso al producto.</p>
          <p className="text-sm text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-8 text-center max-w-md">
          <div className="text-red-400 text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold mb-2 text-white">Sin Acceso</h2>
          <p className="text-gray-300 mb-4">
            No tienes permisos para acceder a este producto.
          </p>
          <p className="text-sm text-gray-400">
            Cliente: {clientId} | Producto: {productId}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#111111]">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 text-white p-4 shadow-lg">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Chatbot General - {productId}</h1>
          <p className="text-gray-300">Cliente: {clientId}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">
            Asistente Virtual
          </h2>
          <p className="text-gray-300 mb-6">
            Bienvenido al chatbot para el producto {productId}.
          </p>
          
          {/* Aquí se integrará el componente de chat */}
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
            <p className="text-gray-400">Componente de Chat se integrará aquí</p>
          </div>
        </div>
      </main>
    </div>
  );
}