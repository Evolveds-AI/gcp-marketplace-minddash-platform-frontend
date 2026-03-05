'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface AuthButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export default function AuthButton({
  variant = 'primary',
  loading = false,
  loadingText = 'Cargando...',
  icon,
  children,
  disabled,
  ...props
}: AuthButtonProps) {
  const baseClasses = clsx(
    'group relative w-full flex justify-center py-3 px-4 border rounded-lg text-sm font-medium',
    'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
    {
      // Primary variant
      'border-transparent text-white bg-[#3978d5] hover:bg-[#4a88e5] hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] focus:ring-blue-500':
        variant === 'primary' && !loading && !disabled,
      'border-transparent text-white bg-[#3978d5]/70 cursor-not-allowed':
        variant === 'primary' && (loading || disabled),
      
      // Secondary variant
      'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 focus:ring-blue-500':
        variant === 'secondary' && !loading && !disabled,
      'bg-secondary text-muted-foreground border-border cursor-not-allowed opacity-70':
        variant === 'secondary' && (loading || disabled)
    }
  );

  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={baseClasses}
    >
      {loading ? (
        <span className="flex items-center">
          <svg 
            className={clsx(
              'animate-spin -ml-1 mr-3 h-5 w-5',
              variant === 'primary' ? 'text-white' : 'text-muted-foreground'
            )}
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText}
        </span>
      ) : (
        <span className="flex items-center">
          {icon && (
            <div className={clsx(
              "h-5 w-5 mr-2",
              variant === 'primary' ? "text-blue-300 group-hover:text-blue-200" : "text-muted-foreground"
            )}>
              {icon}
            </div>
          )}
          {children}
        </span>
      )}
    </button>
  );
}