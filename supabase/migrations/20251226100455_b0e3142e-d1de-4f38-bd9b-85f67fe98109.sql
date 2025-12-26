-- gym-photos 버킷을 public으로 변경
UPDATE storage.buckets SET public = true WHERE id = 'gym-photos';

-- 누구나 파일 읽기 가능 (public bucket)
CREATE POLICY "Anyone can view gym photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'gym-photos');

-- 인증된 사용자만 자신의 폴더에 업로드 가능
CREATE POLICY "Authenticated users can upload gym photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gym-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자는 자신의 사진만 삭제 가능
CREATE POLICY "Users can delete own gym photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gym-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);