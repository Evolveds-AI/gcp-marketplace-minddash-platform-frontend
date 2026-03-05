'use client';

import React, { useState, useMemo } from 'react';
import { FiBarChart, FiImage } from '@/lib/icons';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Area, AreaChart, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FallbackChart from './FallbackChart';
import { autoParseChartData } from '@/lib/utils/chart-data-parser';

interface ShadcnChartTabsProps {
  chartData: string | Record<string, unknown>;
  height?: number;
  className?: string;
}

type TabType = 'dynamic' | 'static';

const ShadcnChartTabs: React.FC<ShadcnChartTabsProps> = ({ 
  chartData, 
  height = 300, 
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('dynamic');

  // Procesar datos del gráfico
  const processedData = useMemo(() => {
    try {
      // Validar entrada
      if (!chartData) {
        console.warn('[ShadcnChartTabs] No hay datos de gráfico proporcionados');
        return null;
      }

      const result = autoParseChartData(chartData);
      if (!result || !result.data || result.data.length === 0) {
        console.warn('[ShadcnChartTabs] No se pudieron parsear los datos del gráfico');
        
        // Crear datos de fallback
        return {
          data: [{
            name: 'Sin datos',
            value: 0,
            month: 'Sin datos',
            desktop: 0
          }],
          config: { type: 'bar' as const },
          title: 'Datos no disponibles'
        };
      }

      // Detectar tipo de gráfico desde QuickChart URL
      let chartType = result.config.type || 'bar';
      
      if (typeof chartData === 'string' && chartData.includes('quickchart.io')) {
        try {
          const url = new URL(chartData);
          const chartParam = url.searchParams.get('c');
          if (chartParam) {
            const config = JSON.parse(decodeURIComponent(chartParam));
            chartType = config.type || 'bar';
          }
        } catch (urlError) {
          console.warn('[ShadcnChartTabs] Error parseando URL de QuickChart:', urlError);
          // Mantener tipo por defecto
        }
      }

      // Convertir datos para Recharts (formato shadcn/ui)
      const rechartsData = result.data.map((item, index) => ({
        name: item.label || item.time || `Item ${index + 1}`,
        value: typeof item.value === 'number' ? item.value : 0,
        month: item.label || item.time || `Item ${index + 1}`, // Para compatibilidad
        desktop: typeof item.value === 'number' ? item.value : 0, // Para compatibilidad con ejemplos shadcn
      }));

      return {
        data: rechartsData,
        config: { ...result.config, type: chartType },
        title: result.config.title || 'Análisis de Datos'
      };
    } catch (error) {
      console.error('[ShadcnChartTabs] Error procesando datos:', error);
      
      // Retornar datos de fallback en caso de error
      return {
        data: [{
          name: 'Error al cargar',
          value: 0,
          month: 'Error al cargar',
          desktop: 0
        }],
        config: { type: 'bar' as const },
        title: 'Error al cargar datos'
      };
    }
  }, [chartData]);

  // Configuración de colores para shadcn/ui
  const chartConfig = {
    value: {
      color: "var(--chart-1)",
    },
    desktop: {
      color: "var(--chart-1)",
    },
    // Colores adicionales para gráficos multicolor
    chart1: { color: "var(--chart-1)" },
    chart2: { color: "var(--chart-2)" },
    chart3: { color: "var(--chart-3)" },
    chart4: { color: "var(--chart-4)" },
    chart5: { color: "var(--chart-5)" },
  } satisfies ChartConfig;

  // Configuración de tabs
  const tabConfig = {
    dynamic: {
      id: 'dynamic',
      label: 'Dinámico',
      icon: FiBarChart,
    },
    static: {
      id: 'static', 
      label: 'Estático',
      icon: FiImage,
    }
  };

  // Renderizar gráfico dinámico según tipo
  const renderDynamicChart = () => {
    if (!processedData) {
      return (
        <div className="flex items-center justify-center h-32 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-600 text-sm">No hay datos para mostrar</p>
        </div>
      );
    }

    const { data, config } = processedData;

    switch (config.type?.toLowerCase()) {
      case 'line':
        return (
          <ChartContainer config={chartConfig} className={`min-h-[${height - 20}px] w-full`}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid vertical={false} />
              <XAxis 
                dataKey="name" 
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                angle={-45}
                textAnchor="end"
                height={85}
                interval={0}
                tickFormatter={(value) => value.toString()}
              />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                dataKey="value" 
                type="monotone" 
                stroke="var(--color-value)" 
                strokeWidth={2}
                dot={{ fill: "var(--color-value)" }}
              />
            </LineChart>
          </ChartContainer>
        );

      case 'area':
        return (
          <ChartContainer config={chartConfig} className={`min-h-[${height - 20}px] w-full`}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid vertical={false} />
              <XAxis 
                dataKey="name" 
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                angle={-45}
                textAnchor="end"
                height={85}
                interval={0}
                tickFormatter={(value) => value.toString()}
              />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area 
                dataKey="value" 
                type="monotone" 
                fill="var(--color-value)" 
                fillOpacity={0.4}
                stroke="var(--color-value)"
              />
            </AreaChart>
          </ChartContainer>
        );

      case 'pie':
      case 'doughnut':
        return (
          <ChartContainer config={chartConfig} className={`min-h-[${height - 20}px] w-full`}>
            <PieChart margin={{ top: 40, right: 80, left: 80, bottom: 40 }}>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={Math.min(height / 3, 200)}
                innerRadius={config.type?.toLowerCase() === 'doughnut' ? Math.min(height / 6, 60) : 0}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`var(--chart-${(index % 5) + 1})`} 
                  />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        );

      case 'bar':
      default:
        return (
          <ChartContainer config={chartConfig} className={`min-h-[${height - 20}px] w-full`}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid vertical={false} />
              <XAxis 
                dataKey="name" 
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                angle={-45}
                textAnchor="end"
                height={85}
                interval={0}
                tickFormatter={(value) => value.toString()}
              />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="value" 
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`var(--chart-${(index % 5) + 1})`} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        );
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      {/* Header con Tabs */}
      <CardHeader className="p-0">
        <div className="flex border-b border-gray-200">
          {Object.values(tabConfig).map((tab) => (
            <button
              key={tab.id}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                ${activeTab === tab.id
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              onClick={() => setActiveTab(tab.id as TabType)}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>

      {/* Contenido del Chart */}
      <CardContent className="p-4">
        {activeTab === 'dynamic' ? (
          renderDynamicChart()
        ) : (
          <FallbackChart
            chartData={chartData}
            height={height - 80}
            className=""
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ShadcnChartTabs;