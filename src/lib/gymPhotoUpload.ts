import { supabase } from '@/integrations/supabase/client';
import { compressImage } from './imageUpload';

const BUCKET_NAME = 'gym-photos';

/**
 * Get public URL for a gym photo path
 */
export function getGymPhotoPublicUrl(path: string): string {
  if (!path) return '';
  
  // Already a full URL (legacy data or external)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Base64 data (legacy - should be migrated)
  if (path.startsWith('data:')) {
    return path;
  }
  
  // Get public URL from Supabase
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * Upload gym photo to Supabase Storage
 * Returns path for storage in DB (not URL - URLs are generated on demand)
 */
export async function uploadGymPhoto(
  userId: string,
  file: File | Blob
): Promise<{ url: string; path: string }> {
  // Compress if it's a File
  const blob = file instanceof File ? await compressImage(file) : file;
  
  const fileName = `${userId}/${Date.now()}_${crypto.randomUUID()}.jpg`;
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  // Return public URL for immediate display
  const publicUrl = getGymPhotoPublicUrl(data.path);
  
  return { url: publicUrl, path: data.path };
}

/**
 * Upload gym photo from base64 data
 */
export async function uploadGymPhotoFromBase64(
  userId: string,
  base64Data: string
): Promise<string> {
  // Extract the actual base64 content
  const base64Match = base64Data.match(/^data:image\/\w+;base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid base64 image data');
  }
  
  // Convert base64 to blob
  const binaryStr = atob(base64Match[1]);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/jpeg' });
  
  const { path } = await uploadGymPhoto(userId, blob);
  return path;
}

/**
 * Get a signed URL for a gym photo path (legacy support)
 * @deprecated Use getGymPhotoPublicUrl instead - bucket is now public
 */
export async function getGymPhotoSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!path) return null;
  
  // Use public URL instead of signed URL
  return getGymPhotoPublicUrl(path) || null;
}

/**
 * Delete a gym photo from storage
 */
export async function deleteGymPhoto(path: string): Promise<boolean> {
  if (!path || path.startsWith('data:') || path.startsWith('http')) {
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Failed to delete gym photo:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting gym photo:', err);
    return false;
  }
}

/**
 * Upload multiple gym photos
 */
export async function uploadGymPhotos(
  userId: string,
  files: File[]
): Promise<string[]> {
  const results: string[] = [];
  
  for (const file of files) {
    try {
      const { path } = await uploadGymPhoto(userId, file);
      results.push(path);
    } catch (error) {
      console.error('Failed to upload photo:', error);
      // Continue with other uploads
    }
  }
  
  return results;
}

/**
 * Upload multiple gym photos from base64 data
 */
export async function uploadGymPhotosFromBase64(
  userId: string,
  base64Images: string[]
): Promise<string[]> {
  const results: string[] = [];
  
  for (const base64 of base64Images) {
    try {
      const path = await uploadGymPhotoFromBase64(userId, base64);
      results.push(path);
    } catch (error) {
      console.error('Failed to upload photo from base64:', error);
    }
  }
  
  return results;
}
