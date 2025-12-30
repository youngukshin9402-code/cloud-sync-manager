-- =========================
-- SUPPORT TICKETS / REPLIES: Production Fix Pack
-- =========================

-- 0) 컬럼 누락 방지 (이미 있으면 스킵됨)
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS additional_messages jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.support_ticket_replies
ADD COLUMN IF NOT EXISTS sender_type text NOT NULL DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 1) support_tickets: 정책 정리 (기존 정책 드랍 후 재생성)
DROP POLICY IF EXISTS "Users can create own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON public.support_tickets;

-- 유저: 본인 티켓 생성
CREATE POLICY "Users can create own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 유저: 본인 티켓 조회는 삭제되지 않은 것만 / admin은 전체(삭제 포함)
CREATE POLICY "Users can view own tickets"
ON public.support_tickets
FOR SELECT
USING (
  (auth.uid() = user_id AND is_deleted = false)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 유저: 본인 티켓 업데이트(삭제되지 않은 것만) / admin은 전체 업데이트
CREATE POLICY "Users can update own tickets"
ON public.support_tickets
FOR UPDATE
USING (
  (auth.uid() = user_id AND is_deleted = false)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2) support_ticket_replies: SELECT 정책 정리
DROP POLICY IF EXISTS "Users can view replies on own tickets" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "Users can view non-deleted replies on own tickets" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "Admins can view all replies including deleted" ON public.support_ticket_replies;

-- 유저: 본인 티켓의 삭제되지 않은 reply만
CREATE POLICY "Users can view non-deleted replies on own tickets"
ON public.support_ticket_replies
FOR SELECT
USING (
  is_deleted = false
  AND EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = support_ticket_replies.ticket_id
      AND (t.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- admin: 삭제 포함 전체 reply 조회
CREATE POLICY "Admins can view all replies including deleted"
ON public.support_ticket_replies
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) support_ticket_replies: INSERT 정책 정리
DROP POLICY IF EXISTS "Only admins can create replies" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "Users can create replies on own tickets" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "Admins can create replies on any ticket" ON public.support_ticket_replies;

-- 유저: 본인 티켓에만, sender_type='user'로만 INSERT
CREATE POLICY "Users can create replies on own tickets"
ON public.support_ticket_replies
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND sender_type = 'user'
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_ticket_replies.ticket_id
      AND t.user_id = auth.uid()
      AND t.is_deleted = false
  )
);

-- admin/coach: 어떤 티켓이든 sender_type='admin'으로 INSERT
CREATE POLICY "Admins can create replies on any ticket"
ON public.support_ticket_replies
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coach'::app_role))
  AND sender_type = 'admin'
  AND auth.uid() = user_id
);

-- 4) support_ticket_replies: UPDATE 정책 정리 (핵심)
DROP POLICY IF EXISTS "Users can update own replies" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "Admins can update any replies" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "Admins can update any reply" ON public.support_ticket_replies;

-- 유저: 본인 reply 중 sender_type='user'만 수정 가능
CREATE POLICY "Users can update own replies"
ON public.support_ticket_replies
FOR UPDATE
USING (auth.uid() = user_id AND sender_type = 'user')
WITH CHECK (auth.uid() = user_id AND sender_type = 'user');

-- admin/coach: 모든 reply 수정 가능 (admin 답변도 포함)
CREATE POLICY "Admins can update any replies"
ON public.support_ticket_replies
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coach'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coach'::app_role));

-- 5) notifications: 실수로 열린 permissive 정책 제거(보안)
DROP POLICY IF EXISTS "Users can create support notifications" ON public.notifications;

-- 6) realtime 보강
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_ticket_replies REPLICA IDENTITY FULL;