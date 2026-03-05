'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface UnifiedTimeoutProps {
  onTimeout?: () => void;
  timeoutMs?: number;
  message?: string;
  showAdvice?: boolean;
  className?: string;
  darkTheme?: boolean;
}

const UnifiedTimeout: React.FC<UnifiedTimeoutProps> = ({
  onTimeout,
  timeoutMs = 30000,
  message = 'Procesando tu consulta...',
  showAdvice = true,
  className,
  darkTheme = true
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [showAdviceState, setShowAdviceState] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsElapsed(prev => {
        const newTime = prev + 1;
        
        // Mostrar consejos después de 15 segundos
        if (newTime >= 15 && showAdvice) {
          setShowAdviceState(true);
        }
        
        // Llamar timeout si se alcanza el límite
        if (newTime >= timeoutMs / 1000 && onTimeout) {
          onTimeout();
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutMs, onTimeout, showAdvice]);

  const getAdviceMessage = () => {
    if (secondsElapsed < 15) return null;
    if (secondsElapsed < 30) return "La primera consulta puede tomar más tiempo mientras el sistema se inicializa";
    if (secondsElapsed < 45) return "Consultas complejas requieren más procesamiento. Tu pregunta está siendo analizada";
    if (secondsElapsed < 60) return "El sistema está procesando datos. Esto puede tomar hasta 90 segundos";
    return "La consulta está tomando más tiempo del usual. El sistema seguirá intentando";
  };

  const themeClasses = darkTheme
    ? {
        container: 'text-gray-300',
        spinner: 'border-blue-500',
        message: 'text-gray-300',
        timer: 'text-gray-500',
        advice: 'bg-gray-800 border-gray-600 text-blue-300'
      }
    : {
        container: 'text-gray-600',
        spinner: 'border-blue-600',
        message: 'text-gray-600',
        timer: 'text-gray-500',
        advice: 'bg-blue-50 border-blue-200 text-blue-700'
      };

  return (
    <div className={cn(
      'flex flex-col items-center space-y-4 p-6',
      themeClasses.container,
      className
    )}>
      {/* Spinner */}
      <div className={cn(
        'animate-spin rounded-full h-10 w-10 border-2 border-transparent border-t-current border-r-current',
        themeClasses.spinner
      )} />
      
      {/* Mensaje principal */}
      <p className={cn('text-base font-medium', themeClasses.message)}>
        {message}
      </p>
      
      {/* Timer */}
      <p className={cn('text-sm', themeClasses.timer)}>
        Tiempo: {secondsElapsed}s
      </p>
      
      {/* Consejos */}
      {showAdviceState && getAdviceMessage() && (
        <div className={cn(
          'max-w-md p-4 rounded-lg text-center border',
          themeClasses.advice
        )}>
          <p className="text-sm">{getAdviceMessage()}</p>
        </div>
      )}
    </div>
  );
};

export default UnifiedTimeout;
