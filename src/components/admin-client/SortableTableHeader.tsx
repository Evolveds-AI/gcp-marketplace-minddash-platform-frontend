'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FiChevronUp, FiChevronDown } from '@/lib/icons';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableColumnProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  currentDirection: SortDirection;
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function SortableColumn({
  label,
  sortKey,
  currentSortKey,
  currentDirection,
  onSort,
  className,
  align = 'left',
}: SortableColumnProps) {
  const isActive = currentSortKey === sortKey;

  return (
    <th
      className={cn(
        'px-6 py-3 text-xs font-medium uppercase tracking-wider cursor-pointer select-none group transition-colors',
        align === 'left' && 'text-left',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        isActive
          ? 'text-gray-900 dark:text-white'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={cn(
          'inline-flex flex-col -space-y-1 transition-opacity',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
        )}>
          <FiChevronUp
            size={10}
            className={cn(
              'transition-colors',
              isActive && currentDirection === 'asc'
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500'
            )}
          />
          <FiChevronDown
            size={10}
            className={cn(
              'transition-colors',
              isActive && currentDirection === 'desc'
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500'
            )}
          />
        </span>
      </span>
    </th>
  );
}

export function useSortableTable<T>(
  data: T[],
  defaultSortKey?: string,
  defaultDirection: SortDirection = null
) {
  const [sortKey, setSortKey] = React.useState<string | null>(defaultSortKey ?? null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(defaultDirection);

  const handleSort = React.useCallback((key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey, sortDirection]);

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        comparison = Number(aVal) - Number(bVal);
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [data, sortKey, sortDirection]);

  return {
    sortedData,
    sortKey,
    sortDirection,
    handleSort,
  };
}
