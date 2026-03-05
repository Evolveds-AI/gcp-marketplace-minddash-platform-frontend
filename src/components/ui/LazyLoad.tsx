'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { UnifiedSkeleton } from '@/components/loaders';

interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
}

export default function LazyLoad({
  children,
  fallback = <UnifiedSkeleton variant="rectangular" height="h-32" darkTheme={true} />,
  rootMargin = '50px',
  threshold = 0.1,
  className = ''
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [rootMargin, threshold, hasLoaded]);

  return (
    <div ref={elementRef} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
}

// Hook para lazy loading de componentes
export function useLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = async () => {
    if (Component || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const module = await importFunc();
      setComponent(() => module.default);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load component'));
    } finally {
      setLoading(false);
    }
  };

  return { Component, loading, error, loadComponent };
}