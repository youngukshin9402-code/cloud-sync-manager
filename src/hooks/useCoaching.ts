import { useState, useEffect } from "react";
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

export function useCoaching() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [availableSlots, setAvailableSlots] = useState<CoachAvailability[]>([]);
  const [mySessions, setMySessions] = useState<CoachingSession[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // 사용 가능한 코치 슬롯 가져오기
  const fetchAvailableSlots = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    const { data, error } = await supabase
      .from("coach_availability")
      .select("*")
      .gte("available_date", today)
      .eq("is_booked", false)
      .order("available_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching slots:", error);
      return;
    }

    setAvailableSlots(data || []);
  };

  // 내 코칭 세션 가져오기
  const fetchMySessions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("coaching_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error("Error fetching sessions:", error);
      return;
    }

    setMySessions(data || []);
  };

  // 코치 목록 가져오기
  const fetchCoaches = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nickname")
      .eq("user_type", "coach");

    if (error) {
      console.error("Error fetching coaches:", error);
      return;
    }

    setCoaches(data || []);
  };

  // 코칭 세션 예약하기
  const bookSession = async (slotId: string, coachId: string, scheduledAt: string) => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "코칭을 예약하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      return false;
    }

    if (profile?.subscription_tier !== "premium") {
      toast({
        title: "프리미엄 전용",
        description: "1:1 코칭은 프리미엄 회원만 이용할 수 있습니다.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // 슬롯을 예약됨으로 표시
      const { error: slotError } = await supabase
        .from("coach_availability")
        .update({ is_booked: true })
        .eq("id", slotId);

      if (slotError) throw slotError;

      // 비디오 룸 ID 생성
      const videoRoomId = `coaching_${user.id}_${Date.now()}`;

      // 코칭 세션 생성
      const { error: sessionError } = await supabase
        .from("coaching_sessions")
        .insert({
          coach_id: coachId,
          user_id: user.id,
          scheduled_at: scheduledAt,
          status: "scheduled",
          video_room_id: videoRoomId,
        });

      if (sessionError) throw sessionError;

      toast({
        title: "예약 완료! 🎉",
        description: "코칭 세션이 성공적으로 예약되었습니다.",
      });

      await fetchAvailableSlots();
      await fetchMySessions();
      return true;
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        title: "예약 실패",
        description: "예약 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
      return false;
    }
  };

  // 세션 취소
  const cancelSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("coaching_sessions")
        .update({ status: "cancelled" })
        .eq("id", sessionId);

      if (error) throw error;

      toast({
        title: "취소 완료",
        description: "코칭 세션이 취소되었습니다.",
      });

      await fetchMySessions();
      return true;
    } catch (error) {
      console.error("Cancel error:", error);
      toast({
        title: "취소 실패",
        description: "취소 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      return false;
    }
  };

  // 다음 예정된 세션 가져오기
  const getUpcomingSession = () => {
    const now = new Date();
    return mySessions.find(
      (s) => s.status === "scheduled" && new Date(s.scheduled_at) > now
    );
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAvailableSlots(),
        fetchMySessions(),
        fetchCoaches(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [user]);

  return {
    availableSlots,
    mySessions,
    coaches,
    loading,
    bookSession,
    cancelSession,
    getUpcomingSession,
    refreshSlots: fetchAvailableSlots,
    refreshSessions: fetchMySessions,
  };
}
