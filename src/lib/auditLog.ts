/**
 * Audit Log 유틸리티
 * 관리자 활동 로그 기록 (주문상태변경, 코치배정, 티켓상태변경)
 */

import { supabase } from '@/integrations/supabase/client';

export type AuditActionType = 
  | 'order_status_change'
  | 'coach_assign'
  | 'ticket_status_change'
  | 'user_role_change'
  | 'user_block'
  | 'coaching_session_update';

interface AuditLogParams {
  actionType: AuditActionType;
  targetTable: string;
  targetId: string;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Audit 로그 기록
 * @param params 로그 파라미터
 * @returns 성공 여부
 */
export async function createAuditLog(params: AuditLogParams): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('Audit log failed: No authenticated user');
    return false;
  }

  const { error } = await supabase
    .from('admin_audit_logs')
    .insert([{
      admin_id: user.id,
      action_type: params.actionType,
      target_table: params.targetTable,
      target_id: params.targetId,
      before_value: params.beforeValue || null,
      after_value: params.afterValue || null,
      metadata: params.metadata || {}
    }] as any);

  if (error) {
    console.error('Audit log error:', error);
    return false;
  }

  return true;
}

/**
 * 주문 상태 변경 로그
 */
export async function logOrderStatusChange(
  orderId: string,
  beforeStatus: string,
  afterStatus: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  return createAuditLog({
    actionType: 'order_status_change',
    targetTable: 'orders',
    targetId: orderId,
    beforeValue: { status: beforeStatus },
    afterValue: { status: afterStatus },
    metadata
  });
}

/**
 * 코치 배정 로그
 */
export async function logCoachAssign(
  sessionId: string,
  beforeCoachId: string | null,
  afterCoachId: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  return createAuditLog({
    actionType: 'coach_assign',
    targetTable: 'coaching_sessions',
    targetId: sessionId,
    beforeValue: { coach_id: beforeCoachId },
    afterValue: { coach_id: afterCoachId },
    metadata
  });
}

/**
 * 티켓 상태 변경 로그
 */
export async function logTicketStatusChange(
  ticketId: string,
  beforeStatus: string,
  afterStatus: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  return createAuditLog({
    actionType: 'ticket_status_change',
    targetTable: 'support_tickets',
    targetId: ticketId,
    beforeValue: { status: beforeStatus },
    afterValue: { status: afterStatus },
    metadata
  });
}

/**
 * 사용자 역할 변경 로그
 */
export async function logUserRoleChange(
  userId: string,
  beforeRole: string | null,
  afterRole: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  return createAuditLog({
    actionType: 'user_role_change',
    targetTable: 'user_roles',
    targetId: userId,
    beforeValue: { role: beforeRole },
    afterValue: { role: afterRole },
    metadata
  });
}
