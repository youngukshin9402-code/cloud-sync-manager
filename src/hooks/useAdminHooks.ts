import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { OrderStatus } from './useServerSync';

// ========================
// Admin Orders Hook
// ========================

interface AdminOrder {
  id: string;
  user_id: string;
  user_nickname?: string;
  product_name: string;
  product_type: string;
  price: number;
  status: OrderStatus | null;
  payment_method: string | null;
  created_at: string | null;
}

export function useOrdersAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      // Fetch orders with user info
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id(nickname)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((o: any) => ({
        ...o,
        user_nickname: o.profiles?.nickname || '알 수 없음'
      }));
      setOrders(mapped);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      toast({ title: '주문 상태가 변경되었습니다' });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({ title: '상태 변경 실패', variant: 'destructive' });
    }
  };

  return { orders, loading, updateOrderStatus, refetch: fetchOrders };
}

// ========================
// Admin Coaching Hook
// ========================

interface AdminCoachingSession {
  id: string;
  user_id: string;
  coach_id: string | null;
  user_nickname?: string;
  coach_nickname?: string;
  scheduled_at: string;
  status: string | null;
}

export function useCoachingAdmin() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<AdminCoachingSession[]>([]);
  const [coaches, setCoaches] = useState<{ id: string; nickname: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('coaching_sessions')
        .select(`
          *,
          user:user_id(nickname),
          coach:coach_id(nickname)
        `)
        .order('scheduled_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const mapped = (sessionsData || []).map((s: any) => ({
        ...s,
        user_nickname: s.user?.nickname || '알 수 없음',
        coach_nickname: s.coach?.nickname || '미배정'
      }));
      setSessions(mapped);

      // Fetch coaches
      const { data: coachData } = await supabase
        .from('profiles')
        .select('id, nickname')
        .eq('user_type', 'coach');

      setCoaches(coachData || []);
    } catch (error) {
      console.error('Error fetching coaching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const assignCoach = async (sessionId: string, coachId: string) => {
    try {
      const { error } = await supabase
        .from('coaching_sessions')
        .update({ coach_id: coachId })
        .eq('id', sessionId);

      if (error) throw error;

      const coachName = coaches.find(c => c.id === coachId)?.nickname || '미배정';
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, coach_id: coachId, coach_nickname: coachName } : s
      ));
      toast({ title: '코치가 배정되었습니다' });
    } catch (error) {
      console.error('Error assigning coach:', error);
      toast({ title: '코치 배정 실패', variant: 'destructive' });
    }
  };

  return { sessions, coaches, loading, assignCoach, refetch: fetchSessions };
}

// ========================
// Admin Tickets Hook
// ========================

interface AdminTicketReply {
  id: string;
  message: string;
  is_admin: boolean;
  sender_type: string;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
}

interface AdminTicket {
  id: string;
  user_id: string;
  user_nickname?: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  is_deleted: boolean;
  replies?: AdminTicketReply[];
}

export function useTicketsAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          profiles:user_id(nickname),
          replies:support_ticket_replies(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((t: any) => ({
        ...t,
        user_nickname: t.profiles?.nickname || '알 수 없음',
        replies: t.replies || []
      }));
      setTickets(mapped);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();

    // Realtime 구독: 문의/답변 INSERT/UPDATE/DELETE 시 자동 갱신
    const channel = supabase
      .channel('admin-tickets-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => fetchTickets()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_ticket_replies' },
        () => fetchTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTickets]);

  const updateStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);

      if (error) throw error;

      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
      toast({ title: '상태가 변경되었습니다' });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({ title: '상태 변경 실패', variant: 'destructive' });
    }
  };

  const addReply = async (ticketId: string, message: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('support_ticket_replies')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          message,
          is_admin: true,
          sender_type: 'admin'
        })
        .select()
        .single();

      if (error) throw error;

      // Update status to in_progress if it was open
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket?.status === 'open') {
        await updateStatus(ticketId, 'in_progress');
      }

      toast({ title: '답변이 등록되었습니다' });
    } catch (error) {
      console.error('Error adding reply:', error);
      toast({ title: '답변 등록 실패', variant: 'destructive' });
    }
  };

  // 문의 원본 메시지 수정 (티켓 자체)
  const updateTicketMessage = async (ticketId: string, newMessage: string) => {
    if (!user) return;

    try {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return;

      // 기존 메시지 히스토리 저장 (support_ticket_message_history 대신 별도 처리)
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          message: newMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({ title: '문의가 수정되었습니다' });
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({ title: '문의 수정 실패', variant: 'destructive' });
    }
  };

  // 문의 삭제 (soft delete)
  const deleteTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({ title: '문의가 삭제되었습니다' });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast({ title: '문의 삭제 실패', variant: 'destructive' });
    }
  };

  // 답글 수정
  const updateReply = async (replyId: string, newMessage: string) => {
    if (!user) return;

    try {
      // 히스토리에 이전 메시지 저장
      const reply = tickets.flatMap(t => t.replies || []).find(r => r.id === replyId);
      if (reply) {
        await supabase
          .from('support_ticket_message_history')
          .insert({
            message_id: replyId,
            previous_message: reply.message,
            edited_by: user.id
          });
      }

      const { error } = await supabase
        .from('support_ticket_replies')
        .update({ 
          message: newMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', replyId);

      if (error) throw error;

      toast({ title: '답글이 수정되었습니다' });
    } catch (error) {
      console.error('Error updating reply:', error);
      toast({ title: '답글 수정 실패', variant: 'destructive' });
    }
  };

  // 답글 삭제 (soft delete)
  const deleteReply = async (replyId: string) => {
    try {
      const { error } = await supabase
        .from('support_ticket_replies')
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', replyId);

      if (error) throw error;

      toast({ title: '답글이 삭제되었습니다' });
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast({ title: '답글 삭제 실패', variant: 'destructive' });
    }
  };

  return { 
    tickets, 
    loading, 
    updateStatus, 
    addReply, 
    updateTicketMessage,
    deleteTicket,
    updateReply,
    deleteReply,
    refetch: fetchTickets 
  };
}

// ========================
// User Support Tickets Hook
// ========================

export function useSupportTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          replies:support_ticket_replies(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = async (subject: string, message: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject,
          message
        })
        .select()
        .single();

      if (error) throw error;

      setTickets(prev => [{ ...data, replies: [] }, ...prev]);
      toast({ title: '문의가 접수되었습니다' });
      return { data, error: null };
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({ title: '문의 접수 실패', variant: 'destructive' });
      return { data: null, error };
    }
  };

  const addReply = async (ticketId: string, message: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('support_ticket_replies')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          message,
          is_admin: false
        })
        .select()
        .single();

      if (error) throw error;

      setTickets(prev => prev.map(t => 
        t.id === ticketId 
          ? { ...t, replies: [...(t.replies || []), data] }
          : t
      ));
      toast({ title: '답변이 등록되었습니다' });
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  return { tickets, loading, createTicket, addReply, refetch: fetchTickets };
}
