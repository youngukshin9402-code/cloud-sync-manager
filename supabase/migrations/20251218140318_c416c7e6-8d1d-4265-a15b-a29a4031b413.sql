-- voice-files Storage bucket 출시급 보안 정책
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Coaches can upload voice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own voice files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage voice files" ON storage.objects;

-- (A) 사용자: 본인 userId 폴더만 조회/삭제 가능
CREATE POLICY "Users can view own voice files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'voice-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own voice files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'voice-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- (B) 코치: 본인이 담당하는 사용자(assigned_coach_id)의 폴더만 조회/업로드
CREATE POLICY "Coaches can view assigned user voice files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'voice-files'
  AND public.has_role(auth.uid(), 'coach')
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id::text = (storage.foldername(name))[1]
    AND profiles.assigned_coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can upload to assigned user voice files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'voice-files'
  AND public.has_role(auth.uid(), 'coach')
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id::text = (storage.foldername(name))[1]
    AND profiles.assigned_coach_id = auth.uid()
  )
);

-- (C) 관리자: 전체 접근 가능
CREATE POLICY "Admins can view all voice files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'voice-files'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can upload all voice files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'voice-files'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete all voice files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'voice-files'
  AND public.has_role(auth.uid(), 'admin')
);

-- coaching_feedback에 coach RLS 정책 강화: 담당 사용자에게만 피드백 작성 가능
DROP POLICY IF EXISTS "Coaches can create feedback" ON public.coaching_feedback;

CREATE POLICY "Coaches can create feedback for assigned users"
ON public.coaching_feedback
FOR INSERT
WITH CHECK (
  auth.uid() = coach_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_id
    AND profiles.assigned_coach_id = auth.uid()
  )
);

-- Admin은 모든 피드백 생성 가능
CREATE POLICY "Admins can create any feedback"
ON public.coaching_feedback
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);