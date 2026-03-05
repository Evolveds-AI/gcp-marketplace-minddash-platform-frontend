'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { globalCache } from '@/lib/cache';
import { UnifiedSkeleton } from '@/components/loaders';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder,
  priority = false,
  quality = 75,
  sizes,
  fill = false,
  objectFit = 'cover',
  loading = 'lazy',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px'
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [priority, isInView]);

  // Cache image loading status
  useEffect(() => {
    const cacheKey = `img_loaded_${src}`;
    const cachedStatus = globalCache.get(cacheKey);
    
    if (cachedStatus) {
      setIsLoaded(true);
    }
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    
    // Cache successful load
    const cacheKey = `img_loaded_${src}`;
    globalCache.set(cacheKey, true, 30 * 60 * 1000); // 30 minutes
    
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
    onError?.();
  };

  // Generate placeholder based on dimensions
  const generatePlaceholder = () => {
    if (placeholder) return placeholder;
    
    const w = width || 400;
    const h = height || 300;
    return `data:image/svg+xml;base64,${btoa(
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">
          ${alt || 'Loading...'}
        </text>
      </svg>`
    )}`;
  };

  // Error fallback
  const ErrorFallback = () => (
    <div 
      className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}
      style={{ width, height }}
    >
      <div className="text-center text-gray-500 dark:text-gray-400">
        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-xs">Failed to load</p>
      </div>
    </div>
  );

  // Loading placeholder
  const LoadingPlaceholder = () => (
    <UnifiedSkeleton 
      variant="rectangular"
      className={className}
      width={`w-[${width}px]`}
      height={`h-[${height}px]`}
      darkTheme={true}
    />
  );

  if (hasError) {
    return <ErrorFallback />;
  }

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {/* Show placeholder while not in view or loading */}
      {(!isInView || !isLoaded) && <LoadingPlaceholder />}
      
      {/* Actual image */}
      {isInView && (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          sizes={sizes}
          quality={quality}
          priority={priority}
          loading={loading}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${fill ? 'object-cover' : ''}`}
          style={{
            objectFit: fill ? objectFit : undefined,
            position: fill ? 'absolute' : 'relative'
          }}
          onLoad={handleLoad}
          onError={handleError}
          placeholder="blur"
          blurDataURL={generatePlaceholder()}
        />
      )}
    </div>
  );
}

// Hook for preloading images
export function useImagePreloader(urls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const preloadImage = (url: string) => {
      return new Promise<void>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          setLoadedImages(prev => {
            const newSet = new Set(prev);
            newSet.add(url);
            return newSet;
          });
          // Cache the successful preload
          globalCache.set(`img_preloaded_${url}`, true, 60 * 60 * 1000); // 1 hour
          resolve();
        };
        img.onerror = () => {
          setFailedImages(prev => {
            const newSet = new Set(prev);
            newSet.add(url);
            return newSet;
          });
          reject(new Error(`Failed to preload image: ${url}`));
        };
        img.src = url;
      });
    };

    // Check cache first
    const uncachedUrls = urls.filter(url => {
      const cached = globalCache.get(`img_preloaded_${url}`);
      if (cached) {
                  setLoadedImages(prev => {
            const newSet = new Set(prev);
            newSet.add(url);
            return newSet;
          });
        return false;
      }
      return true;
    });

    // Preload uncached images
    Promise.allSettled(uncachedUrls.map(preloadImage));
  }, [urls]);

  return {
    loadedImages,
    failedImages,
    isLoaded: (url: string) => loadedImages.has(url),
    hasFailed: (url: string) => failedImages.has(url)
  };
}