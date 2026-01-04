-- 코치가 담당 사용자의 nutrition_settings를 볼 수 있도록 정책 추가
CREATE POLICY "Coaches can view assigned user nutrition settings"
ON public.nutrition_settings
FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = nutrition_settings.user_id 
    AND profiles.assigned_coach_id = auth.uid()
  )
);