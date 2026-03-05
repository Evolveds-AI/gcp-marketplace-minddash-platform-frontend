'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

export type KPITrend = 'up' | 'down' | 'neutral';
export type KPISize = 'sm' | 'md' | 'lg';

export interface KPIData {
  id: string;
  title: string;
  value: number | string;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percentage' | 'compact';
  prefix?: string;
  suffix?: string;
  trend?: KPITrend;
  trendValue?: number;
  trendLabel?: string;
  thresholds?: {
    good?: number;
    warning?: number;
    critical?: number;
  };
  sparkline?: number[];
  description?: string;
}

interface Props {
  data: KPIData;
  size?: KPISize;
  onClick?: () => void;
  isLoading?: boolean;
}

function formatValue(value: number | string, format?: string, prefix?: string, suffix?: string): string {
  if (typeof value === 'string') return `${prefix || ''}${value}${suffix || ''}`;
  
  let formatted: string;
  
  switch (format) {
    case 'currency':
      formatted = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
      }).format(value);
      break;
    case 'percentage':
      formatted = `${value.toFixed(1)}%`;
      break;
    case 'compact':
      if (value >= 1_000_000_000) {
        formatted = `${(value / 1_000_000_000).toFixed(1)}B`;
      } else if (value >= 1_000_000) {
        formatted = `${(value / 1_000_000).toFixed(1)}M`;
      } else if (value >= 1_000) {
        formatted = `${(value / 1_000).toFixed(1)}K`;
      } else {
        formatted = value.toLocaleString('es-CL');
      }
      break;
    default:
      formatted = value.toLocaleString('es-CL');
  }
  
  return `${prefix || ''}${formatted}${suffix || ''}`;
}

function getTrendInfo(trend?: KPITrend, trendValue?: number) {
  if (!trend || trend === 'neutral') {
    return {
      icon: Minus,
      color: 'text-gray-400',
      bgColor: 'bg-gray-800',
    };
  }
  
  if (trend === 'up') {
    return {
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-900/30',
    };
  }
  
  return {
    icon: TrendingDown,
    color: 'text-red-400',
    bgColor: 'bg-red-900/30',
  };
}

function getValueColor(value: number, thresholds?: KPIData['thresholds']): string {
  if (!thresholds) return 'text-white';
  
  if (thresholds.critical !== undefined && value <= thresholds.critical) {
    return 'text-red-400';
  }
  if (thresholds.warning !== undefined && value <= thresholds.warning) {
    return 'text-yellow-400';
  }
  if (thresholds.good !== undefined && value >= thresholds.good) {
    return 'text-green-400';
  }
  
  return 'text-white';
}

function MiniSparkline({ data, trend }: { data: number[]; trend?: KPITrend }) {
  if (!data || data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 24;
  const width = 60;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  const color = trend === 'up' ? '#4ade80' : trend === 'down' ? '#f87171' : '#9ca3af';
  
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const sizeClasses = {
  sm: {
    card: 'p-3',
    title: 'text-[10px]',
    value: 'text-xl',
    trend: 'text-[10px]',
  },
  md: {
    card: 'p-4',
    title: 'text-xs',
    value: 'text-3xl',
    trend: 'text-xs',
  },
  lg: {
    card: 'p-5',
    title: 'text-sm',
    value: 'text-4xl',
    trend: 'text-sm',
  },
};

export default function KPICard({ data, size = 'md', onClick, isLoading = false }: Props) {
  const { title, value, format, prefix, suffix, trend, trendValue, trendLabel, thresholds, sparkline, description } = data;
  
  const trendInfo = useMemo(() => getTrendInfo(trend, trendValue), [trend, trendValue]);
  const valueColor = useMemo(() => {
    if (typeof value === 'number') {
      return getValueColor(value, thresholds);
    }
    return 'text-white';
  }, [value, thresholds]);
  
  const formattedValue = useMemo(() => formatValue(value, format, prefix, suffix), [value, format, prefix, suffix]);
  const formattedTrend = useMemo(() => {
    if (trendValue === undefined) return null;
    const sign = trendValue > 0 ? '+' : '';
    return `${sign}${trendValue.toFixed(1)}%`;
  }, [trendValue]);
  
  const classes = sizeClasses[size];
  const TrendIcon = trendInfo.icon;
  
  if (isLoading) {
    return (
      <div className={`bg-[#0c0c0c] border border-gray-800 rounded-lg ${classes.card} animate-pulse`}>
        <div className="h-3 bg-gray-800 rounded w-1/2 mb-3" />
        <div className="h-8 bg-gray-800 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-800 rounded w-1/3" />
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#0c0c0c] border border-gray-800 rounded-lg ${classes.card} ${
        onClick ? 'cursor-pointer hover:border-gray-700 hover:bg-[#111] transition-colors' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className={`font-medium text-gray-400 uppercase tracking-wide ${classes.title}`}>
          {title}
        </h3>
        {sparkline && sparkline.length > 0 && (
          <MiniSparkline data={sparkline} trend={trend} />
        )}
      </div>
      
      {/* Value */}
      <div className={`font-bold ${valueColor} ${classes.value} mb-2 tracking-tight`}>
        {formattedValue}
      </div>
      
      {/* Trend */}
      {(formattedTrend || trendLabel) && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${trendInfo.bgColor}`}>
            <TrendIcon className={`w-3 h-3 ${trendInfo.color}`} />
            {formattedTrend && (
              <span className={`${classes.trend} font-medium ${trendInfo.color}`}>
                {formattedTrend}
              </span>
            )}
          </div>
          {trendLabel && (
            <span className={`${classes.trend} text-gray-500`}>
              {trendLabel}
            </span>
          )}
        </div>
      )}
      
      {/* Description */}
      {description && (
        <p className="mt-2 text-[10px] text-gray-500 line-clamp-2">
          {description}
        </p>
      )}
    </motion.div>
  );
}

export function KPICardGrid({ 
  kpis, 
  columns = 4, 
  size = 'md',
  isLoading = false 
}: { 
  kpis: KPIData[]; 
  columns?: 2 | 3 | 4;
  size?: KPISize;
  isLoading?: boolean;
}) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };
  
  if (isLoading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-3`}>
        {Array(columns).fill(null).map((_, i) => (
          <KPICard key={i} data={{ id: `loading-${i}`, title: '', value: 0 }} size={size} isLoading />
        ))}
      </div>
    );
  }
  
  return (
    <div className={`grid ${gridCols[columns]} gap-3`}>
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} data={kpi} size={size} />
      ))}
    </div>
  );
}
