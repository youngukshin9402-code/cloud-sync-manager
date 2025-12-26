-- Add images column to gym_records table
ALTER TABLE public.gym_records 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Create storage bucket for gym photos (private, only authenticated users)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gym-photos', 'gym-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for the bucket
CREATE POLICY "Users can upload their own gym photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gym-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own gym photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'gym-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own gym photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'gym-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);