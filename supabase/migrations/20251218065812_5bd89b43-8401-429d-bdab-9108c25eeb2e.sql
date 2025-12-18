-- Create storage bucket for food logs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('food-logs', 'food-logs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

-- RLS policy: Users can upload their own food images
CREATE POLICY "Users can upload own food images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'food-logs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Users can view their own food images
CREATE POLICY "Users can view own food images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'food-logs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Users can delete their own food images
CREATE POLICY "Users can delete own food images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'food-logs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Service role can access all food images (for edge function)
CREATE POLICY "Service role can access all food images"
ON storage.objects
FOR ALL
USING (bucket_id = 'food-logs' AND auth.role() = 'service_role');