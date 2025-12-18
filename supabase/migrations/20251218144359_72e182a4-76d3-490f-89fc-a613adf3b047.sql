-- P1: admin_audit_logs 테이블 생성 (운영 로그)
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action_type text NOT NULL,
  target_table text NOT NULL,
  target_id uuid NOT NULL,
  before_value jsonb,
  after_value jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 관리자만 조회 가능
CREATE POLICY "Admins can view all audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- RLS 정책: 관리자/코치만 기록 가능
CREATE POLICY "Admins and coaches can create audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coach'));

-- 인덱스 (조회 성능)
CREATE INDEX idx_audit_logs_target ON public.admin_audit_logs(target_table, target_id);
CREATE INDEX idx_audit_logs_admin ON public.admin_audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created ON public.admin_audit_logs(created_at DESC);

-- P1: support_ticket_replies 정책 수정
-- 기존: 사용자도 replies 작성 가능 → 변경: admin만 replies 작성 가능

-- 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS "Users can create replies on own tickets" ON public.support_ticket_replies;

-- 새 INSERT 정책: admin만 replies(답변) 작성 가능
CREATE POLICY "Only admins can create replies"
ON public.support_ticket_replies
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') AND
  auth.uid() = user_id
);

-- support_tickets 테이블에 user_additional_message 컬럼 추가 (사용자 추가 메시지)
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS additional_messages jsonb DEFAULT '[]';

-- 코멘트 추가
COMMENT ON TABLE public.admin_audit_logs IS '관리자 활동 로그 (주문상태변경, 코치배정, 티켓상태변경)';
COMMENT ON COLUMN public.admin_audit_logs.action_type IS 'order_status_change, coach_assign, ticket_status_change 등';
COMMENT ON COLUMN public.support_tickets.additional_messages IS '사용자의 추가 메시지 배열 [{message, created_at}]';