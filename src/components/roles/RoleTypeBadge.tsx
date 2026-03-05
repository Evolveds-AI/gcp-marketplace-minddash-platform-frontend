import React from 'react';
import { RoleType } from '@/types/roles/index';
import { cn } from '@/lib/utils';

interface RoleTypeBadgeProps {
  type: RoleType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Configuración de estilos para cada tipo de rol
 */
const ROLE_TYPE_STYLES: Record<RoleType, {
  bg: string;
  text: string;
  border: string;
}> = {
  DYNAMIC: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800'
  },
  STATIC: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    text: 'text-green-800 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800'
  },
  ALL: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800'
  },
  NONE: {
    bg: 'bg-gray-100 dark:bg-gray-900/20',
    text: 'text-gray-800 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800'
  }
};

/**
 * Configuración de tamaños para el badge
 */
const sizeStyles = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
};

/**
 * Componente para mostrar badges de tipos de rol con colores distintivos
 */
export const RoleTypeBadge: React.FC<RoleTypeBadgeProps> = ({
  type,
  className,
  size = 'md'
}) => {
  const styles = ROLE_TYPE_STYLES[type] || ROLE_TYPE_STYLES.NONE;
  const sizeStyle = sizeStyles[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        styles.bg,
        styles.text,
        styles.border,
        sizeStyle,
        className
      )}
    >
      {type}
    </span>
  );
};

export default RoleTypeBadge;