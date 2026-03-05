'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface UnifiedSkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string;
  height?: string;
  lines?: number;
  className?: string;
  darkTheme?: boolean;
}

const UnifiedSkeleton: React.FC<UnifiedSkeletonProps> = ({
  variant = 'rectangular',
  width = 'w-full',
  height = 'h-4',
  lines = 3,
  className,
  darkTheme = true
}) => {
  const baseClasses = cn(
    'animate-pulse',
    'bg-gray-200 dark:bg-gray-700',
    'rounded'
  );

  if (variant === 'text') {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              width,
              height,
              index === lines - 1 && lines > 1 ? 'w-3/4' : '' // Última línea más corta
            )}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div className={cn(
        baseClasses,
        'rounded-full',
        width,
        height,
        className
      )} />
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('space-y-3', className)}>
        {/* Header con avatar y título */}
        <div className="flex items-center space-x-3">
          <div className={cn(baseClasses, 'h-10 w-10 rounded-full')} />
          <div className="space-y-2 flex-1">
            <div className={cn(baseClasses, 'h-4 w-1/2')} />
            <div className={cn(baseClasses, 'h-3 w-1/3')} />
          </div>
        </div>
        
        {/* Contenido */}
        <div className="space-y-2">
          <div className={cn(baseClasses, 'h-4 w-full')} />
          <div className={cn(baseClasses, 'h-4 w-5/6')} />
          <div className={cn(baseClasses, 'h-4 w-3/4')} />
        </div>
        
        {/* Footer */}
        <div className="flex justify-between">
          <div className={cn(baseClasses, 'h-8 w-20 rounded-md')} />
          <div className={cn(baseClasses, 'h-8 w-16 rounded-md')} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      baseClasses,
      width,
      height,
      className
    )} />
  );
};

export default UnifiedSkeleton;
