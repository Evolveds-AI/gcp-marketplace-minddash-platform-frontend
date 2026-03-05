'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'active'
  | 'inactive'
  | 'warning'
  | 'error'
  | 'info'
  | 'scheduled'
  | 'expired'
  | 'paused';

const BADGE_STYLES: Record<BadgeVariant, string> = {
  active:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
  inactive:
    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  warning:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  error:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
  info:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  scheduled:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  expired:
    'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700',
  paused:
    'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({
  variant,
  children,
  dot = false,
  className,
  size = 'sm',
}: StatusBadgeProps) {
  const DOT_COLORS: Record<BadgeVariant, string> = {
    active: 'bg-green-500 dark:bg-green-400',
    inactive: 'bg-gray-400 dark:bg-gray-500',
    warning: 'bg-amber-500 dark:bg-amber-400',
    error: 'bg-red-500 dark:bg-red-400',
    info: 'bg-blue-500 dark:bg-blue-400',
    scheduled: 'bg-blue-500 dark:bg-blue-400',
    expired: 'bg-gray-400 dark:bg-gray-500',
    paused: 'bg-yellow-500 dark:bg-yellow-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border rounded-full',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        BADGE_STYLES[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', DOT_COLORS[variant])}
        />
      )}
      {children}
    </span>
  );
}

export function getStatusVariant(isActive: boolean): BadgeVariant {
  return isActive ? 'active' : 'inactive';
}

export function getLifecycleVariant(
  lifecycle: 'ACTIVA' | 'PROGRAMADA' | 'EXPIRADA' | 'PAUSADA' | string
): BadgeVariant {
  switch (lifecycle) {
    case 'ACTIVA':
      return 'active';
    case 'PROGRAMADA':
      return 'scheduled';
    case 'EXPIRADA':
      return 'expired';
    case 'PAUSADA':
      return 'paused';
    default:
      return 'inactive';
  }
}
