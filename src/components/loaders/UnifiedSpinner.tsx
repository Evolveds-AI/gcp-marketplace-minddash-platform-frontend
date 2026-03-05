'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface UnifiedSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  message?: string;
  className?: string;
  darkBackground?: boolean;
}

const UnifiedSpinner: React.FC<UnifiedSpinnerProps> = ({
  size = 'medium',
  fullScreen = false,
  message = 'Cargando...',
  className,
  darkBackground
}) => {
  // Mapeo de tamaños
  const sizeMap = {
    small: 'h-6 w-6',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const textSizeMap = {
    small: 'text-sm',
    medium: 'text-base', 
    large: 'text-lg'
  };

  const isForced = typeof darkBackground === 'boolean';
  const forcedIsDark = darkBackground === true;

  const messageClassName = isForced
    ? forcedIsDark
      ? 'text-gray-300'
      : 'text-gray-800'
    : 'text-muted-foreground';

  const spinner = (
    <div className="flex flex-col items-center space-y-3">
      <div className={cn(
        'animate-spin rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-500',
        sizeMap[size]
      )} />
      {message && (
        <p className={cn(
          'font-medium',
          messageClassName,
          textSizeMap[size]
        )}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={cn(
        'fixed inset-0 flex items-center justify-center z-50',
        isForced ? (forcedIsDark ? 'bg-[#111111] text-gray-300' : 'bg-white text-gray-800') : 'bg-background text-foreground',
        className
      )}>
        {spinner}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center justify-center p-4',
      isForced ? (forcedIsDark ? 'text-gray-300' : 'text-gray-800') : 'text-foreground',
      className
    )}>
      {spinner}
    </div>
  );
};

export default UnifiedSpinner;
