interface DynamicTestPageProps {
  params: {
    id: string;
  };
}

export default function DynamicTestPage({ params }: DynamicTestPageProps) {
  const { id } = params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md">
        <div className="text-green-500 text-5xl mb-4">✅</div>
        <h2 className="text-xl font-semibold mb-2 text-gray-800">Página Dinámica de Prueba</h2>
        <p className="text-gray-600 mb-4">La ruta dinámica simple está funcionando correctamente.</p>
        <div className="text-sm text-gray-500">
          <p><strong>ID:</strong> {id}</p>
        </div>
      </div>
    </div>
  );
} 