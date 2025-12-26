import { supabase } from '@/integrations/supabase/client';

// Configuration
const ORIGINAL_MAX_WIDTH = 1920;
const ORIGINAL_MAX_HEIGHT = 1920;
const ORIGINAL_QUALITY = 0.85;
const THUMBNAIL_MAX_SIZE = 400;
const THUMBNAIL_QUALITY = 0.7;

// Bucket configurations
export const BUCKET_CONFIG = {
  'gym-photos': { isPublic: true, folder: 'gym' },
  'food-logs': { isPublic: false, folder: 'meals' },
  'health-checkups': { isPublic: false, folder: 'health' },
  'chat-media': { isPublic: false, folder: 'chat' },
} as const;

export type BucketName = keyof typeof BUCKET_CONFIG;

// In-memory cache for URLs
const urlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Compress and resize image to specified dimensions
 */
async function resizeImage(
  file: File | Blob,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to compress image'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file instanceof File ? file : file);
  });
}

/**
 * Generate thumbnail from image
 */
async function generateThumbnail(file: File | Blob): Promise<Blob> {
  return resizeImage(file, THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE, THUMBNAIL_QUALITY);
}

/**
 * Compress original image
 */
async function compressOriginal(file: File | Blob): Promise<Blob> {
  return resizeImage(file, ORIGINAL_MAX_WIDTH, ORIGINAL_MAX_HEIGHT, ORIGINAL_QUALITY);
}

/**
 * Convert base64 to Blob
 */
export function base64ToBlob(base64: string): Blob {
  const match = base64.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid base64 string');
  
  const contentType = match[1];
  const raw = atob(match[2]);
  const uInt8Array = new Uint8Array(raw.length);
  
  for (let i = 0; i < raw.length; i++) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Check if string is base64 image
 */
export function isBase64Image(str: string | null | undefined): boolean {
  return !!str?.startsWith('data:image/');
}

/**
 * Upload image with thumbnail to Supabase Storage
 * Returns paths for both original and thumbnail
 */
export async function uploadImageWithThumbnail(
  bucket: BucketName,
  userId: string,
  file: File | Blob,
  customFileName?: string
): Promise<{ originalPath: string; thumbnailPath: string }> {
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  const baseName = customFileName || `${timestamp}_${uuid}`;
  
  // Parallel processing of original and thumbnail
  const [originalBlob, thumbnailBlob] = await Promise.all([
    compressOriginal(file),
    generateThumbnail(file)
  ]);

  const originalPath = `${userId}/${baseName}.jpg`;
  const thumbnailPath = `${userId}/thumb_${baseName}.jpg`;

  // Parallel upload of both versions
  const [originalResult, thumbnailResult] = await Promise.all([
    supabase.storage.from(bucket).upload(originalPath, originalBlob, {
      contentType: 'image/jpeg',
      upsert: false,
    }),
    supabase.storage.from(bucket).upload(thumbnailPath, thumbnailBlob, {
      contentType: 'image/jpeg',
      upsert: false,
    })
  ]);

  if (originalResult.error) {
    throw new Error(`원본 이미지 업로드 실패: ${originalResult.error.message}`);
  }
  if (thumbnailResult.error) {
    // Cleanup original if thumbnail fails
    await supabase.storage.from(bucket).remove([originalPath]);
    throw new Error(`썸네일 업로드 실패: ${thumbnailResult.error.message}`);
  }

  return {
    originalPath: originalResult.data.path,
    thumbnailPath: thumbnailResult.data.path,
  };
}

/**
 * Upload image (original only, for backward compatibility)
 */
export async function uploadImage(
  bucket: BucketName,
  userId: string,
  file: File | Blob,
  customFileName?: string
): Promise<string> {
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  const baseName = customFileName || `${timestamp}_${uuid}`;
  
  const originalBlob = await compressOriginal(file);
  const path = `${userId}/${baseName}.jpg`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, originalBlob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  return data.path;
}

/**
 * Upload from base64 data
 */
export async function uploadFromBase64(
  bucket: BucketName,
  userId: string,
  base64Data: string,
  withThumbnail = true
): Promise<{ originalPath: string; thumbnailPath?: string }> {
  const blob = base64ToBlob(base64Data);
  
  if (withThumbnail) {
    return uploadImageWithThumbnail(bucket, userId, blob);
  }
  
  const path = await uploadImage(bucket, userId, blob);
  return { originalPath: path };
}

/**
 * Get public URL for a path (for public buckets like gym-photos)
 */
export function getPublicUrl(bucket: BucketName, path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('data:')) return path;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get signed URL for a path (for private buckets)
 * Uses in-memory cache to reduce API calls
 */
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('data:')) return path;

  // Check cache
  const cacheKey = `${bucket}:${path}`;
  const cached = urlCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      console.error('Failed to get signed URL:', error);
      return null;
    }

    // Update cache
    urlCache.set(cacheKey, { url: data.signedUrl, timestamp: Date.now() });
    return data.signedUrl;
  } catch (err) {
    console.error('Error getting signed URL:', err);
    return null;
  }
}

/**
 * Get image URL (auto-detects public vs private bucket)
 */
export async function getImageUrl(
  bucket: BucketName,
  path: string
): Promise<string | null> {
  if (!path) return null;
  
  const config = BUCKET_CONFIG[bucket];
  if (config.isPublic) {
    return getPublicUrl(bucket, path);
  }
  return getSignedUrl(bucket, path);
}

/**
 * Get thumbnail path from original path
 */
export function getThumbnailPath(originalPath: string): string {
  if (!originalPath) return '';
  const parts = originalPath.split('/');
  const fileName = parts.pop() || '';
  return [...parts, `thumb_${fileName}`].join('/');
}

/**
 * Delete image and its thumbnail
 */
export async function deleteImage(
  bucket: BucketName,
  originalPath: string
): Promise<boolean> {
  if (!originalPath || originalPath.startsWith('data:') || originalPath.startsWith('http')) {
    return false;
  }

  try {
    const thumbnailPath = getThumbnailPath(originalPath);
    const paths = [originalPath];
    if (thumbnailPath) paths.push(thumbnailPath);

    const { error } = await supabase.storage.from(bucket).remove(paths);
    
    if (error) {
      console.error('Failed to delete image:', error);
      return false;
    }

    // Clear cache
    urlCache.delete(`${bucket}:${originalPath}`);
    urlCache.delete(`${bucket}:${thumbnailPath}`);
    
    return true;
  } catch (err) {
    console.error('Error deleting image:', err);
    return false;
  }
}

/**
 * Batch upload multiple images with thumbnails
 */
export async function uploadMultipleImages(
  bucket: BucketName,
  userId: string,
  files: File[],
  withThumbnail = true
): Promise<Array<{ originalPath: string; thumbnailPath?: string }>> {
  const results: Array<{ originalPath: string; thumbnailPath?: string }> = [];
  
  // Process in batches of 3 to avoid overwhelming the browser
  const batchSize = 3;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          if (withThumbnail) {
            return await uploadImageWithThumbnail(bucket, userId, file);
          }
          const path = await uploadImage(bucket, userId, file);
          return { originalPath: path };
        } catch (error) {
          console.error('Failed to upload image:', error);
          return null;
        }
      })
    );
    results.push(...batchResults.filter((r): r is NonNullable<typeof r> => r !== null));
  }
  
  return results;
}

/**
 * Preload image URLs into browser cache
 */
export function preloadImages(urls: string[]): void {
  urls.forEach((url) => {
    if (url && !url.startsWith('data:')) {
      const img = new Image();
      img.src = url;
    }
  });
}

/**
 * Preload adjacent images for lightbox navigation
 */
export function preloadAdjacentImages(
  currentIndex: number,
  allUrls: string[],
  range = 2
): void {
  const indices: number[] = [];
  for (let i = 1; i <= range; i++) {
    if (currentIndex - i >= 0) indices.push(currentIndex - i);
    if (currentIndex + i < allUrls.length) indices.push(currentIndex + i);
  }
  preloadImages(indices.map((i) => allUrls[i]));
}
