'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { LucideIcon } from 'lucide-react';

import { getBayerClasses } from '@/lib/utils/bayer-theme';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SparklineData = Array<{ label: string; value: number }>;

type TrendInfo = {
  formatted: string;
  positive: boolean;
};

export type SectionCardItem = {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  helper: string;
  sparkline?: SparklineData;
  sparklineColor: string;
  trend?: TrendInfo;
};

const Sparkline = ({ data, color, id }: { data: SparklineData; color: string; id: string }) => {
  if (!data || data.length === 0) {
    return <div aria-hidden="true" className="h-8" />;
  }

  return (
    <div className="h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.6}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function SectionCards({
  cards,
  applyThemeClass,
}: {
  cards: SectionCardItem[];
  applyThemeClass: (darkClasses: string, lightClasses: string) => string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
          className="h-full"
        >
          <Card
            className={
              getBayerClasses(
                applyThemeClass(
                  'relative overflow-hidden border border-minddash-border bg-minddash-card text-white shadow-sm',
                  'relative overflow-hidden border border-gray-200 bg-white text-gray-900 shadow-sm'
                ),
                'bayer-card shadow-sm'
              ) + ' h-full flex flex-col'
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
              <div>
                <CardDescription className={applyThemeClass('text-gray-400', 'text-gray-500')}>
                  {stat.label}
                </CardDescription>
                <CardTitle className="text-2xl font-semibold">{stat.value}</CardTitle>
              </div>
              <div
                className={applyThemeClass(
                  'rounded-full bg-minddash-elevated p-2 text-white',
                  'rounded-full bg-gray-100 p-2 text-gray-900'
                )}
              >
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2 p-3 pt-0">
              <p className={`truncate text-sm ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>{stat.helper}</p>
              <div className="h-5 flex items-center min-w-0">
                {stat.trend ? (
                  <div className="flex items-center gap-2 text-xs min-w-0">
                    <Badge
                      variant="outline"
                      className={applyThemeClass(
                        stat.trend.positive
                          ? 'border-emerald-500 text-emerald-300'
                          : 'border-rose-500 text-rose-300',
                        stat.trend.positive
                          ? 'border-emerald-500 text-emerald-600'
                          : 'border-rose-500 text-rose-600'
                      )}
                    >
                      {stat.trend.positive ? '↑' : '↓'} {stat.trend.formatted}
                    </Badge>
                    <span className={cn('truncate', applyThemeClass('text-gray-500', 'text-gray-500'))}>
                      Respecto al mes anterior
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="mt-auto">
                <Sparkline
                  data={stat.sparkline ?? []}
                  color={stat.sparklineColor}
                  id={`spark-${stat.label.replace(/\s+/g, '-').toLowerCase()}`}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
