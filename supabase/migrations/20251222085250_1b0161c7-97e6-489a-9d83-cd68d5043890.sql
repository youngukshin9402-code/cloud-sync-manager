-- 1. ai_health_reviews 테이블에 Realtime 활성화
ALTER TABLE public.ai_health_reviews REPLICA IDENTITY FULL;

-- 2. Realtime publication에 ai_health_reviews 추가
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_health_reviews;

-- 3. ai_health_reviews에 코치 권한 추가 (assigned_coach_id 기준)
CREATE POLICY "Coaches can manage assigned user reviews"
ON public.ai_health_reviews
FOR ALL
USING (
  has_role(auth.uid(), 'coach'::app_role) AND
  EXISTS (
    SELECT 1 FROM ai_health_reports r
    JOIN profiles p ON p.id = r.user_id
    WHERE r.id = ai_health_reviews.report_id
    AND p.assigned_coach_id = auth.uid()
  )
);

-- 4. ai_health_reports에 코치 권한 추가
CREATE POLICY "Coaches can view assigned user reports"
ON public.ai_health_reports
FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) AND
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = ai_health_reports.user_id
    AND p.assigned_coach_id = auth.uid()
  )
);

-- 5. user_consents에 unique constraint 추가 (upsert용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_consents_user_id_key'
  ) THEN
    ALTER TABLE public.user_consents ADD CONSTRAINT user_consents_user_id_key UNIQUE (user_id);
  END IF;
END $$;