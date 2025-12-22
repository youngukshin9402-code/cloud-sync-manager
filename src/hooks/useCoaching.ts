import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CoachAvailability {
  id: string;
  coach_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface CoachingSession {
  id: string;
  coach_id: string;
  user_id: string;
  scheduled_at: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  video_room_id: string | null;
  coach_notes: string | null;
}

interface CoachProfile {
  id: string;
  nickname: string | null;
}

interface CheckinData {
  conditionScore: number;
  sleepHours: number;
  exerciseDone: boolean;
  mealCount: number;
  notes?: string;
}

export function useCoaching() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [availableSlots, setAvailableSlots] = useState<CoachAvailability[]>([]);
  const [mySessions, setMySessions] = useState<CoachingSession[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchAvailableSlots = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("coach_availability")
      .select("*")
      .gte("available_date", today)
      .eq("is_booked", false)
      .order("available_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (!error) setAvailableSlots(data || []);
  };

  const fetchMySessions = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("coaching_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true });
    if (!error) setMySessions(data || []);
  };

  const fetchCoaches = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nickname")
      .eq("user_type", "coach");
    if (!error) setCoaches(data || []);
  };

  const bookSession = async (slotId: string, coachId: string, scheduledAt: string) => {
    if (!user) return false;
    if (profile?.subscription_tier !== "premium") {
      toast({ title: "프리미엄 전용", variant: "destructive" });
      return false;
    }
    try {
      await supabase.from("coach_availability").update({ is_booked: true }).eq("id", slotId);
      await supabase.from("coaching_sessions").insert({
        coach_id: coachId,
        user_id: user.id,
        scheduled_at: scheduledAt,
        status: "scheduled",
        video_room_id: `coaching_${user.id}_${Date.now()}`,
      });
      toast({ title: "예약 완료!" });
      await fetchAvailableSlots();
      await fetchMySessions();
      return true;
    } catch {
      toast({ title: "예약 실패", variant: "destructive" });
      return false;
    }
  };

  const cancelSession = async (sessionId: string) => {
    try {
      await supabase.from("coaching_sessions").update({ status: "cancelled" }).eq("id", sessionId);
      toast({ title: "취소 완료" });
      await fetchMySessions();
      return true;
    } catch {
      return false;
    }
  };

  const getUpcomingSession = () => {
    const now = new Date();
    return mySessions.find((s) => s.status === "scheduled" && new Date(s.scheduled_at) > now);
  };

  const sendCheckin = useCallback(async (data: CheckinData): Promise<boolean> => {
    if (!user || !profile?.assigned_coach_id) {
      toast({ title: '코치가 배정되지 않았습니다', variant: 'destructive' });
      return false;
    }
    setSending(true);
    try {
      const conditionEmoji = ['😫', '😕', '😐', '🙂', '😊'][data.conditionScore - 1] || '😐';
      const message = `📋 오늘의 체크인\n\n${conditionEmoji} 컨디션: ${data.conditionScore}/5점\n😴 수면: ${data.sleepHours}시간\n${data.exerciseDone ? '✅ 운동 완료' : '❌ 운동 안함'}\n🍽️ 식사 횟수: ${data.mealCount}회${data.notes ? `\n📝 메모: ${data.notes}` : ''}`;

      await supabase.from('chat_messages').insert({
        sender_id: user.id,
        receiver_id: profile.assigned_coach_id,
        message,
        message_type: 'text',
      });
      await supabase.from('checkin_templates').insert({
        user_id: user.id,
        condition_score: data.conditionScore,
        sleep_hours: data.sleepHours,
        exercise_done: data.exerciseDone,
        meal_count: data.mealCount,
        notes: data.notes,
      });
      toast({ title: '체크인 전송 완료' });
      return true;
    } catch {
      toast({ title: '전송 실패', variant: 'destructive' });
      return false;
    } finally {
      setSending(false);
    }
  }, [user, profile, toast]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAvailableSlots(), fetchMySessions(), fetchCoaches()]);
      setLoading(false);
    };
    loadData();
  }, [user]);

  return {
    availableSlots, mySessions, coaches, loading, sending,
    bookSession, cancelSession, getUpcomingSession,
    refreshSlots: fetchAvailableSlots, refreshSessions: fetchMySessions,
    sendCheckin, hasCoach: !!profile?.assigned_coach_id,
  };
}
