-- 건강나이 결과 저장 테이블 생성
CREATE TABLE public.health_age_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actual_age INTEGER NOT NULL,
  health_age INTEGER NOT NULL,
  body_score INTEGER,
  analysis TEXT,
  inbody_data JSONB,
  inbody_record_date DATE,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- 사용자당 최신 1건만 유지하기 위한 unique constraint
  CONSTRAINT health_age_results_user_unique UNIQUE (user_id)
);

-- RLS 활성화
ALTER TABLE public.health_age_results ENABLE ROW LEVEL SECURITY;

-- 사용자 본인만 조회 가능
CREATE POLICY "Users can view own health age results"
  ON public.health_age_results
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자 본인만 생성 가능
CREATE POLICY "Users can insert own health age results"
  ON public.health_age_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자 본인만 수정 가능
CREATE POLICY "Users can update own health age results"
  ON public.health_age_results
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자 본인만 삭제 가능
CREATE POLICY "Users can delete own health age results"
  ON public.health_age_results
  FOR DELETE
  USING (auth.uid() = user_id);

-- 코치/관리자도 담당 회원 조회 가능
CREATE POLICY "Coaches can view assigned user health age results"
  ON public.health_age_results
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    (has_role(auth.uid(), 'coach'::app_role) AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = health_age_results.user_id
      AND profiles.assigned_coach_id = auth.uid()
    )) OR
    EXISTS (
      SELECT 1 FROM guardian_connections
      WHERE guardian_connections.guardian_id = auth.uid()
      AND guardian_connections.user_id = health_age_results.user_id
    )
  );

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_health_age_results_updated_at
  BEFORE UPDATE ON public.health_age_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();