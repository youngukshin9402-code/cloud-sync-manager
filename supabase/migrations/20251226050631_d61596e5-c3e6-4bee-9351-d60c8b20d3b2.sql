-- Fix gym-photos storage policies: add public role policies for upload/view/delete
-- The existing policies only have 'authenticated' role, need to add 'public' role versions

CREATE POLICY "gym_photos_upload_public"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'gym-photos' 
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "gym_photos_view_public"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'gym-photos' 
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "gym_photos_delete_public"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'gym-photos' 
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
);