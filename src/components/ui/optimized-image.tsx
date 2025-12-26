import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps {
  src: string | null | undefined;
  thumbnailSrc?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  onClick?: () => void;
  aspectRatio?: 'square' | 'video' | 'auto';
  priority?: boolean;
  showSkeleton?: boolean;
  fallback?: React.ReactNode;
}

/**
 * OptimizedImage - Progressive loading image component
 * 
 * Features:
 * - Skeleton placeholder while loading
 * - Progressive loading (thumbnail → original)
 * - Intersection Observer for lazy loading
 * - Error handling with fallback
 * - Fade-in animation on load
 */
export function OptimizedImage({
  src,
  thumbnailSrc,
  alt,
  className,
  containerClassName,
  onClick,
  aspectRatio = 'auto',
  priority = false,
  showSkeleton = true,
  fallback,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isThumbLoaded, setIsThumbLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

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
      { rootMargin: '100px', threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  const handleThumbLoad = useCallback(() => {
    setIsThumbLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setIsThumbLoaded(false);
    setHasError(false);
  }, [src]);

  const aspectRatioClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  }[aspectRatio];

  const shouldShowSkeleton = showSkeleton && !isLoaded && !isThumbLoaded && !hasError;
  const shouldShowThumbnail = thumbnailSrc && isThumbLoaded && !isLoaded;
  const shouldShowOriginal = isInView && src && !hasError;

  if (!src && !thumbnailSrc) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatioClass,
        containerClassName
      )}
      onClick={onClick}
    >
      {/* Skeleton placeholder */}
      {shouldShowSkeleton && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {/* Thumbnail (blurred background) */}
      {thumbnailSrc && isInView && (
        <img
          src={thumbnailSrc}
          alt=""
          aria-hidden="true"
          onLoad={handleThumbLoad}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            isThumbLoaded && !isLoaded ? 'opacity-100 blur-sm scale-105' : 'opacity-0',
            className
          )}
        />
      )}

      {/* Original image */}
      {shouldShowOriginal && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          {fallback || (
            <svg
              className="w-8 h-8 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ImageGrid - Optimized grid for multiple images
 */
interface ImageGridProps {
  images: Array<{
    src: string;
    thumbnailSrc?: string;
    alt?: string;
  }>;
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  onImageClick?: (index: number) => void;
  className?: string;
}

export function ImageGrid({
  images,
  columns = 3,
  gap = 'sm',
  onImageClick,
  className,
}: ImageGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns];

  const gapSize = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-4',
  }[gap];

  return (
    <div className={cn('grid', gridCols, gapSize, className)}>
      {images.map((image, index) => (
        <OptimizedImage
          key={image.src + index}
          src={image.src}
          thumbnailSrc={image.thumbnailSrc}
          alt={image.alt || `Image ${index + 1}`}
          aspectRatio="square"
          onClick={() => onImageClick?.(index)}
          containerClassName="rounded-md cursor-pointer hover:opacity-90 transition-opacity"
        />
      ))}
    </div>
  );
}

/**
 * Hook for preloading images
 */
export function useImagePreloader() {
  const preloadedUrls = useRef(new Set<string>());

  const preload = useCallback((urls: string[]) => {
    urls.forEach((url) => {
      if (url && !url.startsWith('data:') && !preloadedUrls.current.has(url)) {
        preloadedUrls.current.add(url);
        const img = new Image();
        img.src = url;
      }
    });
  }, []);

  const preloadAdjacent = useCallback((currentIndex: number, allUrls: string[], range = 2) => {
    const indices: number[] = [];
    for (let i = 1; i <= range; i++) {
      if (currentIndex - i >= 0) indices.push(currentIndex - i);
      if (currentIndex + i < allUrls.length) indices.push(currentIndex + i);
    }
    preload(indices.map((i) => allUrls[i]));
  }, [preload]);

  return { preload, preloadAdjacent };
}
