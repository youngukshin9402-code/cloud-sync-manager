-- ============================================================
-- Iteration 1: DB/RLS 보안 패치
-- ============================================================

-- A. profiles 민감 컬럼 변경 방지 트리거
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- admin은 모든 변경 허용
  IF has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  
  -- 일반 사용자는 민감 컬럼 변경 시 예외 발생
  IF OLD.user_type IS DISTINCT FROM NEW.user_type THEN
    RAISE EXCEPTION 'user_type 변경 권한이 없습니다';
  END IF;
  
  IF OLD.assigned_coach_id IS DISTINCT FROM NEW.assigned_coach_id THEN
    RAISE EXCEPTION 'assigned_coach_id 변경 권한이 없습니다';
  END IF;
  
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
    RAISE EXCEPTION 'subscription_tier 변경 권한이 없습니다';
  END IF;
  
  IF OLD.current_points IS DISTINCT FROM NEW.current_points THEN
    RAISE EXCEPTION 'current_points 변경 권한이 없습니다';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 기존 트리거가 있다면 삭제 후 재생성
DROP TRIGGER IF EXISTS prevent_sensitive_profile_update_trigger ON public.profiles;

CREATE TRIGGER prevent_sensitive_profile_update_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sensitive_profile_update();

-- B. 코치 권한을 "담당 사용자만"으로 강제 - RLS 정책 수정

-- health_records: 코치는 담당 사용자만 조회 가능하도록 수정
DROP POLICY IF EXISTS "Users can view own health records" ON public.health_records;
CREATE POLICY "Users can view own health records" ON public.health_records
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin')
  OR (
    has_role(auth.uid(), 'coach')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = health_records.user_id
      AND profiles.assigned_coach_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM guardian_connections
    WHERE guardian_connections.guardian_id = auth.uid()
    AND guardian_connections.user_id = health_records.user_id
  )
);

-- inbody_records: 코치는 담당 사용자만 조회 가능
DROP POLICY IF EXISTS "Coaches can view assigned user inbody records" ON public.inbody_records;
CREATE POLICY "Coaches can view assigned user inbody records" ON public.inbody_records
FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  OR (
    has_role(auth.uid(), 'coach')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = inbody_records.user_id
      AND profiles.assigned_coach_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM guardian_connections
    WHERE guardian_connections.guardian_id = auth.uid()
    AND guardian_connections.user_id = inbody_records.user_id
  )
);

-- meal_records: 코치는 담당 사용자만 조회 가능
DROP POLICY IF EXISTS "Coaches can view assigned user meal records" ON public.meal_records;
CREATE POLICY "Coaches can view assigned user meal records" ON public.meal_records
FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  OR (
    has_role(auth.uid(), 'coach')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = meal_records.user_id
      AND profiles.assigned_coach_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM guardian_connections
    WHERE guardian_connections.guardian_id = auth.uid()
    AND guardian_connections.user_id = meal_records.user_id
  )
);

-- gym_records: 코치는 담당 사용자만 조회 가능
DROP POLICY IF EXISTS "Coaches can view assigned user gym records" ON public.gym_records;
CREATE POLICY "Coaches can view assigned user gym records" ON public.gym_records
FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  OR (
    has_role(auth.uid(), 'coach')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = gym_records.user_id
      AND profiles.assigned_coach_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM guardian_connections
    WHERE guardian_connections.guardian_id = auth.uid()
    AND guardian_connections.user_id = gym_records.user_id
  )
);

-- water_logs: 코치는 담당 사용자만 조회 가능
DROP POLICY IF EXISTS "Coaches can view assigned user water logs" ON public.water_logs;
CREATE POLICY "Coaches can view assigned user water logs" ON public.water_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  OR (
    has_role(auth.uid(), 'coach')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = water_logs.user_id
      AND profiles.assigned_coach_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM guardian_connections
    WHERE guardian_connections.guardian_id = auth.uid()
    AND guardian_connections.user_id = water_logs.user_id
  )
);

-- weight_records: 코치는 담당 사용자만 조회 가능
DROP POLICY IF EXISTS "Coaches can view assigned user weight records" ON public.weight_records;
CREATE POLICY "Coaches can view assigned user weight records" ON public.weight_records
FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  OR (
    has_role(auth.uid(), 'coach')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = weight_records.user_id
      AND profiles.assigned_coach_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM guardian_connections
    WHERE guardian_connections.guardian_id = auth.uid()
    AND guardian_connections.user_id = weight_records.user_id
  )
);

-- health_checkup_records: 코치는 담당 사용자만 조회 가능
DROP POLICY IF EXISTS "Coaches can view assigned user health checkup records" ON public.health_checkup_records;
CREATE POLICY "Coaches can view assigned user health checkup records" ON public.health_checkup_records
FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  OR (
    has_role(auth.uid(), 'coach')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = health_checkup_records.user_id
      AND profiles.assigned_coach_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM guardian_connections
    WHERE guardian_connections.guardian_id = auth.uid()
    AND guardian_connections.user_id = health_checkup_records.user_id
  )
);

-- daily_logs: 코치는 담당 사용자만 조회 가능
DROP POLICY IF EXISTS "Users can view own daily logs" ON public.daily_logs;
CREATE POLICY "Users can view own daily logs" ON public.daily_logs
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin')
  OR (
    has_role(auth.uid(), 'coach')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = daily_logs.user_id
      AND profiles.assigned_coach_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM guardian_connections
    WHERE guardian_connections.guardian_id = auth.uid()
    AND guardian_connections.user_id = daily_logs.user_id
  )
);

-- profiles: 코치/관리자 조회 권한 추가 (담당 사용자만)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR has_role(auth.uid(), 'admin')
  OR (
    has_role(auth.uid(), 'coach')
    AND assigned_coach_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM guardian_connections
    WHERE guardian_connections.guardian_id = auth.uid()
    AND guardian_connections.user_id = profiles.id
  )
);