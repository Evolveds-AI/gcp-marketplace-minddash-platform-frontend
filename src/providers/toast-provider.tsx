'use client';

import { Toaster } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import { cn } from '@/lib/utils';

export function ToastProvider() {
  const { isDark } = useThemeMode();

  return (
    <Toaster
      position="top-right"
      theme={isDark ? 'dark' : 'light'}
      richColors
      duration={4000}
      className={cn('toaster group')}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  );
}
