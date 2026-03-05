'use client';

import { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, useState } from 'react';
import { clsx } from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';

interface BaseInputProps {
  label: string;
  error?: string;
  icon?: ReactNode;
  required?: boolean;
}

interface InputProps extends BaseInputProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  type?: 'text' | 'email' | 'password';
  rightIcon?: ReactNode;
}

interface TextareaProps extends BaseInputProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  type: 'textarea';
  rows?: number;
}

type AuthInputProps = InputProps | TextareaProps;

export default function AuthInput(props: AuthInputProps) {
  const { label, error, icon, required, ...restProps } = props;
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const reduceMotion = useReducedMotion();
  
  // Extraer rightIcon si existe para evitar pasarlo al DOM
  const { rightIcon, ...inputProps } = 'rightIcon' in restProps ? 
    { rightIcon: restProps.rightIcon, ...restProps } : 
    { rightIcon: undefined, ...restProps };
  
  const baseClasses = clsx(
    'appearance-none block w-full py-3 rounded-lg',
    'bg-background text-foreground placeholder:text-muted-foreground',
    'border border-input focus:outline-none',
    "transition-all duration-200",
    "shadow-[var(--shadow-input)]",
    "ring-1 ring-transparent",
    "group-hover/input:ring-ring/20 focus:ring-2 focus:ring-ring/40",
    {
      'ring-2 ring-destructive/30 focus:ring-destructive/30 border-destructive/40': error,
      'pl-10': icon && props.type !== 'textarea',
      'pr-10': rightIcon,
      'px-4': props.type === 'textarea',
      'pl-10 pr-3': icon && !rightIcon,
      'pl-3 pr-3': !icon && !rightIcon,
      'pl-10 pr-10': icon && rightIcon,
      'resize-none': props.type === 'textarea'
    }
  );

  const showGlow = isFocused || isHovered;

  return (
    <div>
      <label className="block text-sm font-medium text-foreground/90 mb-2">
        {label} {required && '*'}
      </label>
      <div
        className="group/input relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <div className="h-5 w-5 text-muted-foreground">
              {icon}
            </div>
          </div>
        )}
        
        {props.type === 'textarea' ? (
          <textarea
            {...(inputProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            className={baseClasses}
            onFocus={(e) => {
              setIsFocused(true);
              (inputProps as TextareaHTMLAttributes<HTMLTextAreaElement>).onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              (inputProps as TextareaHTMLAttributes<HTMLTextAreaElement>).onBlur?.(e);
            }}
          />
        ) : (
          <input
            {...(inputProps as InputHTMLAttributes<HTMLInputElement>)}
            className={baseClasses}
            onFocus={(e) => {
              setIsFocused(true);
              (inputProps as InputHTMLAttributes<HTMLInputElement>).onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              (inputProps as InputHTMLAttributes<HTMLInputElement>).onBlur?.(e);
            }}
          />
        )}
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center z-10">
            {rightIcon}
          </div>
        )}

        {/* Aceternity-style gradient hover effect */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: showGlow ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
          className="absolute inset-x-0 -bottom-px h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
        />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: showGlow ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
          className="absolute inset-x-10 -bottom-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-ring to-transparent blur-sm"
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}