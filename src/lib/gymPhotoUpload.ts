import { supabase } from '@/integrations/supabase/client';
import { compressImage } from './imageUpload';

const BUCKET_NAME = 'gym-photos';

/**
 * Upload gym photo to Supabase Storage
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

  // Generate a signed URL (valid for 1 hour) for immediate use
  const { data: signedUrlData, error: signedError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(data.path, 3600);

  if (signedError || !signedUrlData?.signedUrl) {
    console.error('Failed to create signed URL:', signedError);
    // Return path for later resolution
    return { url: data.path, path: data.path };
  }

  return { url: signedUrlData.signedUrl, path: data.path };
}

/**
 * Get a signed URL for a gym photo path
 */
export async function getGymPhotoSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!path || path.startsWith('data:')) {
    return path || null;
  }
  
  // If it's already a full URL (signed or public), return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      console.error('Failed to get signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error getting signed URL:', err);
    return null;
  }
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
