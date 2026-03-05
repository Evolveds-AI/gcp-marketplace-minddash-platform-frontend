'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AdminLoadingSkeletonProps {
  variant?: 'cards' | 'table' | 'list' | 'detail' | 'spinner';
  count?: number;
  columns?: number;
  className?: string;
}

const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded bg-gray-200 dark:bg-gray-700/60', className)} />
);

export default function AdminLoadingSkeleton({
  variant = 'cards',
  count = 3,
  columns = 3,
  className,
}: AdminLoadingSkeletonProps) {
  if (variant === 'spinner') {
    return (
      <div className={cn('flex justify-center items-center py-12', className)}>
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-700" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-minddash-verde-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('space-y-0 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden', className)}>
        {/* Header */}
        <div className="flex gap-4 px-6 py-3 bg-gray-50 dark:bg-minddash-elevated">
          {Array.from({ length: 4 }).map((_, i) => (
            <ShimmerBar key={`h-${i}`} className={cn('h-3', i === 0 ? 'w-1/4' : i === 3 ? 'w-16' : 'w-1/5')} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: count }).map((_, row) => (
          <div
            key={row}
            className="flex gap-4 px-6 py-4 border-t border-gray-100 dark:border-gray-800"
            style={{ animationDelay: `${row * 75}ms` }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <ShimmerBar key={`r${row}-${i}`} className={cn('h-3', i === 0 ? 'w-1/4' : i === 3 ? 'w-16' : 'w-1/5')} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-start gap-3"
          >
            <ShimmerBar className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <ShimmerBar className="h-4 w-2/5" />
              <ShimmerBar className="h-3 w-4/5" />
              <ShimmerBar className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center gap-4">
          <ShimmerBar className="h-12 w-12 rounded-xl" />
          <div className="space-y-2 flex-1">
            <ShimmerBar className="h-5 w-1/3" />
            <ShimmerBar className="h-3 w-1/5" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <ShimmerBar className="h-3 w-1/2" />
              <ShimmerBar className="h-6 w-1/3" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <ShimmerBar className="h-4 w-full" />
          <ShimmerBar className="h-4 w-5/6" />
          <ShimmerBar className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  // Default: cards grid
  const colsClass = columns === 2
    ? 'grid-cols-1 md:grid-cols-2'
    : columns === 4
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={cn(`grid ${colsClass} gap-4`, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <ShimmerBar className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <ShimmerBar className="h-4 w-3/5" />
              <ShimmerBar className="h-3 w-2/5" />
            </div>
          </div>
          <ShimmerBar className="h-3 w-full" />
          <ShimmerBar className="h-3 w-4/5" />
          <div className="flex justify-between pt-1">
            <ShimmerBar className="h-3 w-16" />
            <ShimmerBar className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
