import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Plus, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadGymPhoto, getGymPhotoSignedUrl, deleteGymPhoto } from '@/lib/gymPhotoUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Get signed URL for a path
  const getSignedUrl = async (path: string) => {
    if (signedUrls[path]) return signedUrls[path];
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    
    setLoadingUrls(prev => ({ ...prev, [path]: true }));
    try {
      const url = await getGymPhotoSignedUrl(path);
      if (url) {
        setSignedUrls(prev => ({ ...prev, [path]: url }));
        return url;
      }
    } catch (error) {
      console.error('Failed to get signed URL:', error);
    } finally {
      setLoadingUrls(prev => ({ ...prev, [path]: false }));
    }
    return null;
  };

  // Load signed URLs on mount and when images change
  useEffect(() => {
    images.forEach(path => {
      if (!signedUrls[path] && !path.startsWith('http') && !path.startsWith('data:')) {
        getSignedUrl(path);
      }
    });
  }, [images]);

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
        const { path, url } = await uploadGymPhoto(user.id, file);
        newPaths.push(path);
        // Store signed URL immediately
        setSignedUrls(prev => ({ ...prev, [path]: url }));
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
    deleteGymPhoto(path).catch(console.error);
    
    // Update local state
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    
    // Remove from signed URLs cache
    setSignedUrls(prev => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  const getDisplayUrl = (path: string) => {
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return signedUrls[path] || null;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Photo Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((path, index) => {
            const displayUrl = getDisplayUrl(path);
            const isLoading = loadingUrls[path];

            return (
              <div 
                key={`${path}-${index}`}
                className="relative aspect-square rounded-xl overflow-hidden bg-muted"
              >
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : displayUrl ? (
                  <img
                    src={displayUrl}
                    alt={`운동 사진 ${index + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedImage(displayUrl)}
                    onError={() => {
                      // Retry getting signed URL
                      getSignedUrl(path);
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}

                {/* Remove button */}
                {!readonly && (
                  <button
                    type="button"
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
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

      {/* Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedImage}
            alt="확대된 사진"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
