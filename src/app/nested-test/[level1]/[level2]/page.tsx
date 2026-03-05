interface NestedTestPageProps {
  params: {
    level1: string;
    level2: string;
  };
}

export default function NestedTestPage({ params }: NestedTestPageProps) {
  const { level1, level2 } = params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md">
        <div className="text-green-500 text-5xl mb-4">✅</div>
        <h2 className="text-xl font-semibold mb-2 text-gray-800">Página Anidada de Prueba</h2>
        <p className="text-gray-600 mb-4">Las rutas dinámicas anidadas están funcionando correctamente.</p>
        <div className="text-sm text-gray-500 space-y-1">
          <p><strong>Nivel 1:</strong> {level1}</p>
          <p><strong>Nivel 2:</strong> {level2}</p>
        </div>
      </div>
    </div>
  );
} 