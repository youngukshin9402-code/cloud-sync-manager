import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Global image cache for cross-component access
const imageCache = new Map<string, boolean>();
const pendingPreloads = new Map<string, Promise<void>>();

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
 * - Thumbnail loads FIRST and IMMEDIATELY (no lazy loading for thumbnails)
 * - Skeleton only shows if thumbnail isn't available
 * - Progressive loading (thumbnail → original)
 * - Intersection Observer for lazy loading originals
 * - Global image cache for cross-device consistency
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
  const [isLoaded, setIsLoaded] = useState(() => src ? imageCache.has(src) : false);
  const [isThumbLoaded, setIsThumbLoaded] = useState(() => thumbnailSrc ? imageCache.has(thumbnailSrc) : false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading ORIGINALS only (thumbnails load immediately)
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px', threshold: 0.01 } // Increased margin for earlier loading
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    if (src) imageCache.set(src, true);
  }, [src]);

  const handleThumbLoad = useCallback(() => {
    setIsThumbLoaded(true);
    if (thumbnailSrc) imageCache.set(thumbnailSrc, true);
  }, [thumbnailSrc]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  // Reset state when src changes
  useEffect(() => {
    const isSrcCached = src ? imageCache.has(src) : false;
    const isThumbCached = thumbnailSrc ? imageCache.has(thumbnailSrc) : false;
    setIsLoaded(isSrcCached);
    setIsThumbLoaded(isThumbCached);
    setHasError(false);
  }, [src, thumbnailSrc]);

  const aspectRatioClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  }[aspectRatio];

  // Show skeleton ONLY if neither thumbnail nor original is loaded/cached
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
      {/* Skeleton placeholder - only when no thumbnail */}
      {shouldShowSkeleton && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {/* Thumbnail - ALWAYS try to load immediately (no lazy loading) */}
      {thumbnailSrc && (
        <img
          src={thumbnailSrc}
          alt=""
          aria-hidden="true"
          onLoad={handleThumbLoad}
          loading="eager" // Force eager loading for thumbnails
          decoding="async"
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-200',
            isThumbLoaded && !isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
        />
      )}

      {/* Original image - lazy load */}
      {shouldShowOriginal && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-200',
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
 * Preload a single image and cache it
 */
function preloadImage(url: string): Promise<void> {
  if (!url || url.startsWith('data:') || imageCache.has(url)) {
    return Promise.resolve();
  }

  // Check if already preloading
  const existing = pendingPreloads.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, true);
      pendingPreloads.delete(url);
      resolve();
    };
    img.onerror = () => {
      pendingPreloads.delete(url);
      resolve();
    };
    img.src = url;
  });

  pendingPreloads.set(url, promise);
  return promise;
}

/**
 * Hook for preloading images with caching
 */
export function useImagePreloader() {
  const preload = useCallback((urls: string[]) => {
    urls.forEach((url) => {
      if (url) preloadImage(url);
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

  // Preload thumbnails immediately for a list of images
  const preloadThumbnails = useCallback((thumbnailUrls: string[]) => {
    // Preload thumbnails with high priority
    thumbnailUrls.forEach((url) => {
      if (url) preloadImage(url);
    });
  }, []);

  return { preload, preloadAdjacent, preloadThumbnails };
}

/**
 * Check if an image is already cached
 */
export function isImageCached(url: string): boolean {
  return imageCache.has(url);
}

/**
 * Preload images before entering detail view
 * Call this when user hovers or is about to click on a card
 */
export function prefetchImagesForDetail(
  imagePaths: string[],
  getUrls: (path: string) => { original: string; thumbnail: string }
): void {
  imagePaths.forEach((path) => {
    const { original, thumbnail } = getUrls(path);
    // Preload thumbnail first (higher priority)
    if (thumbnail) preloadImage(thumbnail);
    // Then preload original
    if (original) preloadImage(original);
  });
}
