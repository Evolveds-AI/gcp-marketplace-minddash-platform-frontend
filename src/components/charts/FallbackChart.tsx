'use client';

import React from 'react';
import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';

interface FallbackChartProps {
  chartData: string | any;
  height?: number;
  className?: string;
}

// Componente simple que solo muestra la imagen de QuickChart como fallback
export const FallbackChart: React.FC<FallbackChartProps> = ({
  chartData,
  height = 300,
  className = ''
}) => {
  // Si es una URL de QuickChart, mostrarla directamente
  if (typeof chartData === 'string' && chartData.includes('quickchart.io')) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
        <div className="p-4">
          <Image 
            src={chartData}
            alt="Gráfico" 
            width={800}
            height={400}
            className="w-full h-auto rounded"
            unoptimized={true}
          />
        </div>
      </div>
    );
  }

  // Para otros tipos de datos, generar una URL de QuickChart simple
  if (typeof chartData === 'object' && chartData.data) {
    const labels = chartData.data.map((item: any) => item.time || item.label || 'Item');
    const values = chartData.data.map((item: any) => item.value || 0);
    
    const quickChartConfig = {
      type: chartData.config?.type || 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Datos',
          data: values,
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: chartData.config?.title || 'Gráfico de Datos'
          }
        }
      }
    };

    const quickChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(quickChartConfig))}`;

    return (
      <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
        <div className="p-4">
          <Image 
            src={quickChartUrl}
            alt="Gráfico Generado" 
            width={800}
            height={400}
            className="w-full h-auto rounded"
            unoptimized={true}
          />
        </div>
      </div>
    );
  }

  // Para arrays simples
  if (Array.isArray(chartData)) {
    const quickChartConfig = {
      type: 'bar',
      data: {
        labels: chartData.map((_, index) => `Item ${index + 1}`),
        datasets: [{
          label: 'Valores',
          data: chartData,
          backgroundColor: '#36A2EB'
        }]
      }
    };

    const quickChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(quickChartConfig))}`;

    return (
      <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
        <div className="p-4">
          <Image 
            src={quickChartUrl}
            alt="Gráfico de Array" 
            width={800}
            height={400}
            className="w-full h-auto rounded"
            unoptimized={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`} style={{ height: `${height}px` }}>
      <div className="flex items-center justify-center h-full">
        <p className="text-red-600 inline-flex items-center gap-1"><AlertTriangle className="h-4 w-4" aria-label="Error" /> No se pudo mostrar el gráfico</p>
      </div>
    </div>
  );
};

export default FallbackChart;