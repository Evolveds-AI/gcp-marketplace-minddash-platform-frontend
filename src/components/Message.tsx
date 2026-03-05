'use client';

import { MessageProps } from '@/lib/types';
import { FiSearch, FiBarChart, FiFileText, FiAlertTriangle } from '@/lib/icons';

// This component now only renders function results for assistant messages
const Message: React.FC<MessageProps> = ({ message }) => {
  if (!message.functionDetails) return null;
  
  const details = message.functionDetails;
  
  try {
    if (typeof details.resultado === 'string') {
      return (
        <div className="mt-3 p-4 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 text-sm shadow-inner">
          <div className="flex items-center mb-3 text-blue-400">
            <FiSearch className="mr-2" />
            <span className="font-semibold tracking-wide">Resultado del análisis</span>
          </div>
          <p className="mb-3 text-gray-200 leading-relaxed"><strong>Valor:</strong> {details.resultado}</p>
          {details.detalle && (
            <details className="mt-3 group">
              <summary className="cursor-pointer text-blue-400/80 hover:text-blue-400 mt-1 flex items-center transition-colors text-xs font-medium uppercase tracking-wider">
                <FiBarChart className="mr-2" />
                <span>Ver datos completos</span>
              </summary>
              <div className="mt-3 p-3 bg-black/50 rounded-lg border border-white/5 overflow-x-auto whitespace-pre-wrap text-xs text-gray-400 font-mono">
                {typeof details.detalle === 'object' ? (
                  <pre>{JSON.stringify(details.detalle, null, 2)}</pre>
                ) : (
                  <p>{String(details.detalle)}</p>
                )}
              </div>
            </details>
          )}
        </div>
      );
    } else if (Array.isArray(details.resultado)) {
      // For array results (listings)
      return (
        <div className="mt-3 p-4 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 text-sm shadow-inner">
          <div className="flex items-center mb-3 text-blue-400">
            <FiFileText className="mr-2" />
            <span className="font-semibold tracking-wide">Listado</span>
          </div>
          <div className="mb-3 text-gray-300">
            <p><strong>Total elementos:</strong> {details.resultado.length}</p>
          </div>
          <ul className="mt-3 space-y-2">
            {details.resultado.map((item: string, index: number) => (
              <li key={`item-${index}`} className="flex items-start text-gray-300">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0"></span>
                {item}
              </li>
            ))}
          </ul>
          {details.detalle && (
            <details className="mt-3 group">
              <summary className="cursor-pointer text-blue-400/80 hover:text-blue-400 flex items-center transition-colors text-xs font-medium uppercase tracking-wider">
                <FiFileText className="mr-2" />
                <span>Ver detalles completos</span>
              </summary>
              <div className="mt-3 p-3 bg-black/50 rounded-lg border border-white/5 overflow-x-auto whitespace-pre-wrap text-xs text-gray-400 font-mono">
                {typeof details.detalle === 'object' ? (
                  <pre>{JSON.stringify(details.detalle, null, 2)}</pre>
                ) : (
                  <p>{String(details.detalle)}</p>
                )}
              </div>
            </details>
          )}
        </div>
      );
    } else if (typeof details.resultado === 'object') {
      return (
        <div className="mt-3 p-4 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 text-sm shadow-inner">
          <div className="flex items-center mb-3 text-blue-400">
            <FiBarChart className="mr-2" />
            <span className="font-semibold tracking-wide">Estadísticas</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-200">
            {Object.entries(details.resultado).map(([key, value]) => (
              <div key={key} className="p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{key}</p>
                <p className="font-medium">{String(value)}</p>
              </div>
            ))}
          </div>
          {details.detalle && (
            <details className="mt-3 group">
              <summary className="cursor-pointer text-blue-400/80 hover:text-blue-400 flex items-center transition-colors text-xs font-medium uppercase tracking-wider">
                <FiFileText className="mr-2" />
                <span>Ver detalles completos</span>
              </summary>
              <div className="mt-3 p-3 bg-black/50 rounded-lg border border-white/5 overflow-x-auto whitespace-pre-wrap text-xs text-gray-400 font-mono">
                {typeof details.detalle === 'object' ? (
                  <pre>{JSON.stringify(details.detalle, null, 2)}</pre>
                ) : (
                  <p>{String(details.detalle)}</p>
                )}
              </div>
            </details>
          )}
        </div>
      );
    }
  } catch (e) {
    console.error('Error al formatear el resultado:', e);
    return (
      <div className="mt-3 p-4 bg-red-900/20 rounded-xl border border-red-500/30 text-sm backdrop-blur-sm">
        <div className="flex items-center text-red-400">
          <FiAlertTriangle className="mr-2" />
          <span className="font-medium">Error al mostrar los resultados</span>
        </div>
      </div>
    );
  }
  
  return null;
};

export default Message;
