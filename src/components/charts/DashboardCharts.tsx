'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardChartsProps {
  chartsData: {
    'user-growth': Array<{ month: string; usuarios: number; total: number }>;
    'project-chatbots': Array<{ proyecto: string; chatbots: number }>;
    'monthly-metrics': Array<{ mes: string; usuarios: number; mensajes: number; engagement: number }>;
  };
  isDark?: boolean;
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ chartsData, isDark = true }) => {

  const userGrowthData = chartsData['user-growth'] || [];
  const projectChatbotsData = chartsData['project-chatbots'] || [];
  const monthlyMetricsData = chartsData['monthly-metrics'] || [];

  // Validar que los datos tengan la estructura correcta
  const validUserGrowthData = userGrowthData.filter(item => 
    item && typeof item.month === 'string' && typeof item.usuarios === 'number'
  );
  const validProjectChatbotsData = projectChatbotsData.filter(item => 
    item && typeof item.proyecto === 'string' && typeof item.chatbots === 'number'
  );
  const validMonthlyMetricsData = monthlyMetricsData.filter(item => 
    item && typeof item.mes === 'string' && typeof item.usuarios === 'number'
  );

  const gridStroke = isDark ? '#374151' : '#E2E8F0';
  const cardSurface = isDark
    ? 'bg-gradient-to-br from-[#1f1f1f] to-[#2a2a2a] border-gray-800'
    : 'bg-white border border-gray-200 shadow-sm';
  const titleClass = isDark ? 'text-white' : 'text-slate-900';
  const emptyStateClass = isDark ? 'text-gray-400' : 'text-slate-500';

  const userGrowthConfig = {
    usuarios: {
      label: 'Usuarios',
      color: '#8B5CF6',
    },
  } satisfies ChartConfig;

  const projectChatbotsConfig = {
    chatbots: {
      label: 'Chatbots',
      color: '#06B6D4',
    },
  } satisfies ChartConfig;

  const monthlyMetricsConfig = {
    value: {
      label: 'Total',
      color: '#8B5CF6',
    },
  } satisfies ChartConfig;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Gráfico de Crecimiento de Usuarios */}
      <Card className={cn('rounded-2xl', cardSurface)}>
        <CardHeader className="pb-3">
          <CardTitle className={cn('text-sm', titleClass)}>Crecimiento de Usuarios</CardTitle>
          <p className={cn('text-xs mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
            Nuevos usuarios incorporados en los últimos meses
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {validUserGrowthData.length > 0 ? (
            <ChartContainer config={userGrowthConfig} className="h-[200px] w-full aspect-auto">
              <AreaChart data={validUserGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="usuarios"
                  stroke="var(--color-usuarios)"
                  fill="var(--color-usuarios)"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className={cn('h-[200px] flex items-center justify-center text-xs', emptyStateClass)}>
              <p className="text-xs">No hay datos de crecimiento de usuarios</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Chatbots por Proyecto */}
      <Card className={cn('rounded-2xl', cardSurface)}>
        <CardHeader className="pb-3">
          <CardTitle className={cn('text-sm', titleClass)}>Chatbots por Proyecto</CardTitle>
          <p className={cn('text-xs mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
            Cantidad de chatbots activos asignados a cada proyecto
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {validProjectChatbotsData.length > 0 ? (
            <ChartContainer config={projectChatbotsConfig} className="h-[200px] w-full aspect-auto">
              <BarChart data={validProjectChatbotsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="proyecto" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="chatbots" fill="var(--color-chatbots)" name="Chatbots" />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className={cn('h-[200px] flex items-center justify-center text-xs', emptyStateClass)}>
              <p className="text-xs">Aún no hay chatbots asignados a tus proyectos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Tendencia Mensual */}
      <Card className={cn('rounded-2xl', cardSurface)}>
        <CardHeader className="pb-3">
          <CardTitle className={cn('text-sm', titleClass)}>Tendencia Mensual</CardTitle>
          <p className={cn('text-xs mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
            Distribución de usuarios y mensajes por mes
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {validMonthlyMetricsData.length > 0 ? (
            <ChartContainer config={monthlyMetricsConfig} className="h-[200px] w-full aspect-auto">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={validMonthlyMetricsData.map((item, index) => ({
                    name: item.mes,
                    value: item.usuarios + item.mensajes,
                    fill: ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][index % 6]
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                >
                  {validMonthlyMetricsData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][index % 6]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <div className={cn('h-[200px] flex items-center justify-center text-xs', emptyStateClass)}>
              <p className="text-xs">No hay datos de distribución mensual</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCharts;