import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Plus, X, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  uploadImageWithThumbnail, 
  getPublicUrl, 
  getThumbnailPath,
  deleteImage,
  preloadAdjacentImages
} from '@/lib/unifiedImageUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { OptimizedImage, useImagePreloader } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';

interface GymPhotoUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  readonly?: boolean;
  className?: string;
}

export function GymPhotoUpload({ 
  images, 
  onImagesChange, 
  readonly = false,
  className 
}: GymPhotoUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { preloadAdjacent } = useImagePreloader();

  // Get display URLs for path (original + thumbnail)
  const getDisplayUrls = (path: string): { original: string; thumbnail: string } => {
    if (!path) return { original: '', thumbnail: '' };
    // Already a full URL or base64
    if (path.startsWith('http') || path.startsWith('data:')) {
      return { original: path, thumbnail: path };
    }
    // Storage path - get public URLs
    const original = getPublicUrl('gym-photos', path);
    const thumbnailPath = getThumbnailPath(path);
    const thumbnail = getPublicUrl('gym-photos', thumbnailPath);
    return { original, thumbnail };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !user) return;

    // IMPORTANT: copy first, then reset input (FileList can become empty after reset)
    const selectedFiles = Array.from(fileList);
    e.target.value = ''; // Reset input

    setUploading(true);
    const newPaths: string[] = [];

    try {
      for (const file of selectedFiles) {
        const { originalPath } = await uploadImageWithThumbnail('gym-photos', user.id, file);
        newPaths.push(originalPath);
      }

      const nextImages = [...images, ...newPaths];
      onImagesChange(nextImages);
      toast({ title: `${newPaths.length}장 업로드 완료` });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: '사진 업로드 실패', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (index: number) => {
    const path = images[index];
    
    // Try to delete from storage (non-blocking)
    deleteImage('gym-photos', path).catch(console.error);
    
    // Update local state
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  // Get all display URLs for lightbox navigation (original images)
  const allImageData = images.map(path => getDisplayUrls(path));
  const originalUrls = allImageData.map(d => d.original).filter(Boolean);
  const thumbnailUrls = allImageData.map(d => d.thumbnail).filter(Boolean);

  // Preload adjacent images when lightbox index changes
  useEffect(() => {
    if (lightboxIndex !== null) {
      preloadAdjacent(lightboxIndex, originalUrls, 2);
    }
  }, [lightboxIndex, originalUrls, preloadAdjacent]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex === null) return;
    setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : originalUrls.length - 1);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex === null) return;
    setLightboxIndex(lightboxIndex < originalUrls.length - 1 ? lightboxIndex + 1 : 0);
  };

  const goToIndex = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setLightboxIndex(index);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Photo Grid - Uses thumbnails for fast loading */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((path, index) => {
            const { original, thumbnail } = getDisplayUrls(path);

            return (
              <div 
                key={`${path}-${index}`}
                className="relative aspect-square rounded-xl overflow-hidden bg-muted"
              >
                <OptimizedImage
                  src={thumbnail || original}
                  alt={`운동 사진 ${index + 1}`}
                  aspectRatio="square"
                  onClick={() => openLightbox(index)}
                  containerClassName="w-full h-full cursor-pointer hover:opacity-80 transition-opacity"
                  priority={index < 6}
                />

                {/* Remove button */}
                {!readonly && (
                  <button
                    type="button"
                    className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Photo Button (inside grid when there are images) */}
          {!readonly && (
            <button
              type="button"
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 flex flex-col items-center justify-center gap-1 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Plus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">추가</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Add Photo Button (when no images) */}
      {images.length === 0 && !readonly && (
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              업로드 중...
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              사진 추가
            </>
          )}
        </Button>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Lightbox with navigation - Uses original images */}
      {lightboxIndex !== null && originalUrls[lightboxIndex] && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            type="button"
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 z-10"
            onClick={closeLightbox}
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Previous button */}
          {originalUrls.length > 1 && (
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 z-10"
              onClick={goToPrev}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          {/* Image - Shows original high-res image */}
          <img
            src={originalUrls[lightboxIndex]}
            alt="확대된 사진"
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* Next button */}
          {originalUrls.length > 1 && (
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 z-10"
              onClick={goToNext}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          
          {/* Indicator dots */}
          {originalUrls.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {originalUrls.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-colors",
                    idx === lightboxIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"
                  )}
                  onClick={(e) => goToIndex(e, idx)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}