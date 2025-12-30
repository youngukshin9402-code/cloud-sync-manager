-- 1. support_ticket_replies 테이블 확장 (사용자도 메시지를 보낼 수 있도록)
-- sender_type: 'user' 또는 'admin'
-- soft delete 필드 추가
ALTER TABLE public.support_ticket_replies 
ADD COLUMN IF NOT EXISTS sender_type text NOT NULL DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 2. 문의 메시지 수정 이력 테이블
CREATE TABLE IF NOT EXISTS public.support_ticket_message_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.support_ticket_replies(id) ON DELETE CASCADE,
  previous_message text NOT NULL,
  edited_by uuid NOT NULL,
  edited_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. support_tickets 테이블에 soft delete 필드 추가
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- 4. RLS 정책 업데이트

-- support_ticket_replies: 사용자도 INSERT 가능하도록 정책 추가
DROP POLICY IF EXISTS "Only admins can create replies" ON public.support_ticket_replies;

CREATE POLICY "Users can create replies on own tickets"
ON public.support_ticket_replies
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- 자신의 티켓에만 답글 가능
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = support_ticket_replies.ticket_id 
      AND user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
  )
);

-- support_ticket_replies: UPDATE 정책 추가 (수정용)
CREATE POLICY "Users can update own replies"
ON public.support_ticket_replies
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND sender_type = 'user'
  AND is_deleted = false
);

-- support_ticket_replies: soft delete된 것은 조회에서 제외 (기존 SELECT 정책 대체)
DROP POLICY IF EXISTS "Users can view replies on own tickets" ON public.support_ticket_replies;

CREATE POLICY "Users can view non-deleted replies on own tickets"
ON public.support_ticket_replies
FOR SELECT
USING (
  is_deleted = false
  AND EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_replies.ticket_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- 관리자는 삭제된 것도 볼 수 있음
CREATE POLICY "Admins can view all replies including deleted"
ON public.support_ticket_replies
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- support_ticket_message_history RLS
ALTER TABLE public.support_ticket_message_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create history for own messages"
ON public.support_ticket_message_history
FOR INSERT
WITH CHECK (auth.uid() = edited_by);

CREATE POLICY "Admins can view all message history"
ON public.support_ticket_message_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 5. Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_replies;