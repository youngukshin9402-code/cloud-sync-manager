-- 1. pg_cron과 pg_net 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. 푸시 토큰 저장 테이블 생성
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- RLS 활성화
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 푸시 토큰만 관리 가능
CREATE POLICY "Users can manage own push tokens"
ON public.push_tokens
FOR ALL
USING (auth.uid() = user_id);

-- 3. 사용자 마지막 활동 시간 추적 테이블
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 활동 기록만 관리 가능
CREATE POLICY "Users can manage own activity"
ON public.user_activity
FOR ALL
USING (auth.uid() = user_id);

-- 4. notification_settings 테이블에 기본 알림 컬럼 추가
ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS default_reminder BOOLEAN DEFAULT true;

-- 5. notifications 테이블에 삭제 기능 추가
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 사용자가 자신의 알림 삭제(soft delete) 가능
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- 6. realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity;