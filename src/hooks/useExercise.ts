import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Mission {
  id: string;
  content: string;
  points: number;
  isCompleted: boolean;
}

export interface WeeklyStats {
  completedMissions: number;
  totalMissions: number;
  totalPoints: number;
  streakDays: number;
  dailyBreakdown: {
    date: string;
    completed: number;
    total: number;
  }[];
}

export function useExercise() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [todayPoints, setTodayPoints] = useState(0);
  const [healthTags, setHealthTags] = useState<string[]>([]);

  // Fetch user's health tags
  const fetchHealthTags = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("health_records")
        .select("health_tags")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.health_tags) {
        setHealthTags(data.health_tags as string[]);
      }
    } catch (error) {
      console.log("No health records found");
    }
  }, [user]);

  // Fetch today's missions
  const fetchMissions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get today's missions from mission_templates
      const { data: missionTemplates, error: missionError } = await supabase
        .from("mission_templates")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      if (missionError) throw missionError;

      // Get completed missions from daily_logs
      const { data: completedLogs } = await supabase
        .from("daily_logs")
        .select("content, points_earned")
        .eq("user_id", user.id)
        .eq("log_type", "mission")
        .eq("log_date", today);

      const completedContents = new Set(completedLogs?.map((l) => l.content) || []);
      const pointsEarned = completedLogs?.reduce((sum, l) => sum + (l.points_earned || 0), 0) || 0;
      setTodayPoints(pointsEarned);

      if (missionTemplates && missionTemplates.length > 0) {
        const mappedMissions: Mission[] = missionTemplates.map((m) => ({
          id: m.id,
          content: m.content,
          points: m.points,
          isCompleted: completedContents.has(m.content),
        }));
        setMissions(mappedMissions);
      } else {
        // Generate new missions if none exist
        await generateMissions();
      }
    } catch (error) {
      console.error("Error fetching missions:", error);
      toast.error("미션을 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Generate AI missions
  const generateMissions = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-daily-missions", {
        body: { userId: user.id, healthTags },
      });

      if (error) throw error;

      if (data.missions) {
        const mappedMissions: Mission[] = data.missions.map((m: any) => ({
          id: m.id,
          content: m.content,
          points: m.points,
          isCompleted: false,
        }));
        setMissions(mappedMissions);

        if (data.isNew) {
          toast.success("오늘의 미션이 생성되었어요!");
        }
      }
    } catch (error) {
      console.error("Error generating missions:", error);
      toast.error("미션 생성에 실패했습니다");
      // Set default missions as fallback
      setMissions([
        { id: "1", content: "아침 스트레칭 10분", points: 10, isCompleted: false },
        { id: "2", content: "물 8잔 마시기", points: 10, isCompleted: false },
        { id: "3", content: "저녁 산책 30분", points: 10, isCompleted: false },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle mission completion
  const toggleMission = async (missionId: string) => {
    if (!user) return;

    const mission = missions.find((m) => m.id === missionId);
    if (!mission) return;

    const newCompleted = !mission.isCompleted;
    const today = new Date().toISOString().split("T")[0];

    try {
      if (newCompleted) {
        // Mark as completed - add to daily_logs
        const { error: logError } = await supabase.from("daily_logs").insert([{
          user_id: user.id,
          log_type: "mission" as const,
          log_date: today,
          content: mission.content,
          points_earned: mission.points,
          is_completed: true,
        }]);

        if (logError) throw logError;

        // Update user points
        const { data: profile } = await supabase
          .from("profiles")
          .select("current_points")
          .eq("id", user.id)
          .single();

        await supabase
          .from("profiles")
          .update({ current_points: (profile?.current_points || 0) + mission.points })
          .eq("id", user.id);

        await supabase.from("point_history").insert([{
          user_id: user.id,
          amount: mission.points,
          reason: `미션 완료: ${mission.content}`,
        }]);

        setTodayPoints((prev) => prev + mission.points);
        toast.success(`+${mission.points} 포인트! 미션 완료`);
      } else {
        // Uncomplete - remove from daily_logs
        const { error: deleteError } = await supabase
          .from("daily_logs")
          .delete()
          .eq("user_id", user.id)
          .eq("log_type", "mission")
          .eq("log_date", today)
          .eq("content", mission.content);

        if (deleteError) throw deleteError;

        // Deduct points
        const { data: profile } = await supabase
          .from("profiles")
          .select("current_points")
          .eq("id", user.id)
          .single();

        await supabase
          .from("profiles")
          .update({ current_points: Math.max(0, (profile?.current_points || 0) - mission.points) })
          .eq("id", user.id);

        setTodayPoints((prev) => Math.max(0, prev - mission.points));
      }

      // Update local state
      setMissions((prev) =>
        prev.map((m) => (m.id === missionId ? { ...m, isCompleted: newCompleted } : m))
      );
    } catch (error) {
      console.error("Error toggling mission:", error);
      toast.error("미션 상태 변경에 실패했습니다");
    }
  };

  // Log exercise (free text)
  const logExercise = async (content: string) => {
    if (!user || !content.trim()) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const pointsEarned = 20;

      const { error: logError } = await supabase.from("daily_logs").insert([{
        user_id: user.id,
        log_type: "mission" as const,
        log_date: today,
        content: `운동 기록: ${content}`,
        points_earned: pointsEarned,
        is_completed: true,
      }]);

      if (logError) throw logError;

      // Update points
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_points")
        .eq("id", user.id)
        .single();

      await supabase
        .from("profiles")
        .update({ current_points: (profile?.current_points || 0) + pointsEarned })
        .eq("id", user.id);

      await supabase.from("point_history").insert([{
        user_id: user.id,
        amount: pointsEarned,
        reason: `운동 기록: ${content}`,
      }]);

      setTodayPoints((prev) => prev + pointsEarned);
      toast.success(`+${pointsEarned} 포인트! 운동 기록 완료`);
    } catch (error) {
      console.error("Error logging exercise:", error);
      toast.error("운동 기록에 실패했습니다");
    }
  };

  // Fetch weekly stats
  const fetchWeeklyStats = useCallback(async () => {
    if (!user) return;

    try {
      // Get start of week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const startDate = startOfWeek.toISOString().split("T")[0];
      const endDate = now.toISOString().split("T")[0];

      // Get completed missions this week
      const { data: weeklyLogs } = await supabase
        .from("daily_logs")
        .select("log_date, points_earned")
        .eq("user_id", user.id)
        .eq("log_type", "mission")
        .gte("log_date", startDate)
        .lte("log_date", endDate);

      // Get total missions this week
      const { data: weeklyMissions } = await supabase
        .from("mission_templates")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`);

      // Calculate streak days
      let streak = 0;
      const checkDate = new Date();
      for (let i = 0; i < 30; i++) {
        const dateStr = checkDate.toISOString().split("T")[0];
        const { data: dayLogs } = await supabase
          .from("daily_logs")
          .select("id")
          .eq("user_id", user.id)
          .eq("log_type", "mission")
          .eq("log_date", dateStr)
          .limit(1);

        if (dayLogs && dayLogs.length > 0) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      setStreakDays(streak);

      // Build daily breakdown
      const dailyMap = new Map<string, number>();
      weeklyLogs?.forEach((log) => {
        const current = dailyMap.get(log.log_date) || 0;
        dailyMap.set(log.log_date, current + 1);
      });

      const dailyBreakdown = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        dailyBreakdown.push({
          date: dateStr,
          completed: dailyMap.get(dateStr) || 0,
          total: 3, // Assuming 3 missions per day
        });
      }

      setWeeklyStats({
        completedMissions: weeklyLogs?.length || 0,
        totalMissions: weeklyMissions?.length || 0,
        totalPoints: weeklyLogs?.reduce((sum, l) => sum + (l.points_earned || 0), 0) || 0,
        streakDays: streak,
        dailyBreakdown,
      });
    } catch (error) {
      console.error("Error fetching weekly stats:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchHealthTags();
      fetchMissions();
      fetchWeeklyStats();
    }
  }, [user, fetchHealthTags, fetchMissions, fetchWeeklyStats]);

  return {
    missions,
    isLoading,
    isGenerating,
    weeklyStats,
    streakDays,
    todayPoints,
    toggleMission,
    logExercise,
    generateMissions,
    fetchMissions,
    fetchWeeklyStats,
  };
}
