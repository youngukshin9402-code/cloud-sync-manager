import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AssignedUser {
  id: string;
  nickname: string | null;
  phone: string | null;
  current_points: number;
  subscription_tier: "basic" | "premium";
  created_at: string;
  healthStatus: "good" | "caution" | "warning" | "unknown";
  missionRate: number;
  lastActive: string;
  pendingReview: boolean;
  latestHealthRecord: any | null;
}

interface HealthRecord {
  id: string;
  user_id: string;
  raw_image_urls: string[];
  parsed_data: any;
  health_age: number | null;
  health_tags: string[] | null;
  status: string;
  created_at: string;
  coach_comment: string | null;
  user?: { nickname: string | null };
}

interface CoachingSession {
  id: string;
  user_id: string;
  scheduled_at: string;
  status: string;
  video_room_id: string | null;
  user?: { nickname: string | null };
}

export function useCoachData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [pendingReviews, setPendingReviews] = useState<HealthRecord[]>([]);
  const [todaySessions, setTodaySessions] = useState<CoachingSession[]>([]);
  const [loading, setLoading] = useState(true);

  // 담당 회원 목록 가져오기
  const fetchAssignedUsers = async () => {
    if (!user) return;

    // 코치에게 배정된 회원들 조회
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("assigned_coach_id", user.id);

    if (error) {
      console.error("Error fetching assigned users:", error);
      return;
    }

    // 각 회원의 건강 기록과 미션 달성률 계산
    const usersWithDetails = await Promise.all(
      (profiles || []).map(async (profile) => {
        // 최신 건강 기록
        const { data: healthRecords } = await supabase
          .from("health_records")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1);

        // 최근 7일 미션 완료율
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const { data: missions } = await supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", profile.id)
          .eq("log_type", "mission")
          .gte("log_date", weekAgo.toISOString().split("T")[0]);

        const { data: missionTemplates } = await supabase
          .from("mission_templates")
          .select("*")
          .eq("user_id", profile.id)
          .eq("is_active", true);

        const completedMissions = missions?.filter((m) => m.is_completed).length || 0;
        const totalExpected = (missionTemplates?.length || 3) * 7;
        const missionRate = totalExpected > 0 ? Math.round((completedMissions / totalExpected) * 100) : 0;

        // 건강 상태 결정
        const latestRecord = healthRecords?.[0];
        let healthStatus: "good" | "caution" | "warning" | "unknown" = "unknown";
        
        if (latestRecord?.health_tags) {
          const dangerTags = ["high_bp", "diabetes", "liver_issue", "kidney_issue"];
          const cautionTags = ["borderline_bp", "borderline_sugar", "high_cholesterol"];
          
          if (latestRecord.health_tags.some((t: string) => dangerTags.includes(t))) {
            healthStatus = "warning";
          } else if (latestRecord.health_tags.some((t: string) => cautionTags.includes(t))) {
            healthStatus = "caution";
          } else {
            healthStatus = "good";
          }
        }

        // 마지막 활동 시간
        const { data: lastLog } = await supabase
          .from("daily_logs")
          .select("created_at")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1);

        let lastActive = "활동 없음";
        if (lastLog?.[0]) {
          const diff = Date.now() - new Date(lastLog[0].created_at).getTime();
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          if (days === 0) lastActive = "오늘";
          else if (days === 1) lastActive = "어제";
          else lastActive = `${days}일 전`;
        }

        // 검토 대기 여부
        const pendingReview = latestRecord?.status === "pending_review";

        return {
          ...profile,
          healthStatus,
          missionRate,
          lastActive,
          pendingReview,
          latestHealthRecord: latestRecord || null,
        } as AssignedUser;
      })
    );

    setAssignedUsers(usersWithDetails);
  };

  // 검토 대기 건강검진 가져오기
  const fetchPendingReviews = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("health_records")
      .select(`
        *,
        profiles!health_records_user_id_fkey(nickname)
      `)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending reviews:", error);
      return;
    }

    const formatted = (data || []).map((record) => ({
      ...record,
      user: { nickname: (record as any).profiles?.nickname },
    }));

    setPendingReviews(formatted);
  };

  // 오늘 코칭 세션 가져오기
  const fetchTodaySessions = async () => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    
    const { data, error } = await supabase
      .from("coaching_sessions")
      .select(`
        *,
        profiles!coaching_sessions_user_id_fkey(nickname)
      `)
      .eq("coach_id", user.id)
      .gte("scheduled_at", `${today}T00:00:00`)
      .lt("scheduled_at", `${today}T23:59:59`)
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error("Error fetching today sessions:", error);
      return;
    }

    const formatted = (data || []).map((session) => ({
      ...session,
      user: { nickname: (session as any).profiles?.nickname },
    }));

    setTodaySessions(formatted);
  };

  // 건강검진 검토 완료
  const reviewHealthRecord = async (
    recordId: string,
    comment: string,
    status: "completed" | "rejected"
  ) => {
    if (!user) return false;

    const { error } = await supabase
      .from("health_records")
      .update({
        status,
        coach_comment: comment,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", recordId);

    if (error) {
      toast({
        title: "검토 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: status === "completed" ? "검토 완료" : "반려 완료",
      description: "건강검진 검토가 완료되었습니다.",
    });

    await fetchPendingReviews();
    await fetchAssignedUsers();
    return true;
  };

  // 미션 추가/수정
  const updateMission = async (
    userId: string,
    missionContent: string,
    points: number = 10
  ) => {
    if (!user) return false;

    const { error } = await supabase.from("mission_templates").insert({
      user_id: userId,
      coach_id: user.id,
      content: missionContent,
      points,
      is_active: true,
    });

    if (error) {
      toast({
        title: "미션 추가 실패",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "미션 추가 완료",
      description: "새 미션이 추가되었습니다.",
    });

    return true;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAssignedUsers(),
        fetchPendingReviews(),
        fetchTodaySessions(),
      ]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  return {
    assignedUsers,
    pendingReviews,
    todaySessions,
    loading,
    reviewHealthRecord,
    updateMission,
    refreshData: () => {
      fetchAssignedUsers();
      fetchPendingReviews();
      fetchTodaySessions();
    },
  };
}
