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

// 지병 기반 추천 데이터
const CONDITION_RECOMMENDATIONS: Record<string, { avoid: string[]; prefer: string[] }> = {
  '당뇨': { avoid: ['단 음료', '과자', '정제탄수'], prefer: ['통곡물', '채소', '단백질'] },
  '고혈압': { avoid: ['짠 음식', '가공식품', '절임류'], prefer: ['저염식', '칼륨 풍부 과일', '채소'] },
  '고지혈증': { avoid: ['튀김', '포화지방', '가공육'], prefer: ['생선', '견과류', '올리브오일'] },
  '신장질환': { avoid: ['고단백', '고나트륨', '가공식품'], prefer: ['저염식', '적절한 수분'] },
  '통풍': { avoid: ['내장류', '맥주', '붉은 고기'], prefer: ['채소', '저지방 유제품', '물'] },
};

function getRecommendationsForConditions(conditions: string[]): { avoid: string[]; prefer: string[] } {
  const avoid = new Set<string>();
  const prefer = new Set<string>();

  conditions.forEach(condition => {
    const recs = CONDITION_RECOMMENDATIONS[condition];
    if (recs) {
      recs.avoid.forEach(item => avoid.add(item));
      recs.prefer.forEach(item => prefer.add(item));
    }
  });

  return {
    avoid: Array.from(avoid).slice(0, 3),
    prefer: Array.from(prefer).slice(0, 3),
  };
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
      const today = new Date().toISOString().split('T')[0];
      const dateFormatted = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

      // 오늘 데이터 조회 (병렬)
      const [mealResult, waterResult, waterSettingsResult, nutritionSettingsResult, weightResult, gymResult] = await Promise.all([
        supabase.from('meal_records').select('total_calories, foods').eq('user_id', user.id).eq('date', today),
        supabase.from('water_logs').select('amount').eq('user_id', user.id).eq('date', today),
        supabase.from('water_settings').select('daily_goal').eq('user_id', user.id).maybeSingle(),
        supabase.from('nutrition_settings').select('calorie_goal, carb_goal_g, protein_goal_g, fat_goal_g, current_weight, goal_weight, conditions').eq('user_id', user.id).maybeSingle(),
        supabase.from('weight_records').select('weight').eq('user_id', user.id).order('date', { ascending: false }).limit(1),
        supabase.from('gym_records').select('exercises').eq('user_id', user.id).eq('date', today),
      ]);

      // 데이터 집계
      const meals = mealResult.data || [];
      const totalCalories = meals.reduce((sum, m) => sum + (m.total_calories || 0), 0);
      
      // 매크로 집계
      let totalCarbs = 0, totalProtein = 0, totalFat = 0;
      meals.forEach(meal => {
        const foods = meal.foods as Array<{ carbs?: number; protein?: number; fat?: number }> || [];
        foods.forEach(food => {
          totalCarbs += food.carbs || 0;
          totalProtein += food.protein || 0;
          totalFat += food.fat || 0;
        });
      });

      const waterLogs = waterResult.data || [];
      const totalWater = waterLogs.reduce((sum, w) => sum + (w.amount || 0), 0);
      const waterGoal = waterSettingsResult.data?.daily_goal || 2000;

      const ns = nutritionSettingsResult.data;
      const calorieGoal = ns?.calorie_goal || 2000;
      const currentWeight = weightResult.data?.[0]?.weight || ns?.current_weight || null;
      const goalWeight = ns?.goal_weight || null;
      const conditions = (ns?.conditions as string[]) || [];

      // 운동 데이터
      const gymRecords = gymResult.data || [];
      interface ExerciseItem { name?: string; sets?: number; reps?: number; weight?: number }
      const exercises: ExerciseItem[] = gymRecords.flatMap(r => (r.exercises as ExerciseItem[]) || []);

      const hasAnyData = meals.length > 0 || waterLogs.length > 0 || exercises.length > 0;

      // 메시지 생성
      const conditionEmoji = ['😫', '😕', '😐', '🙂', '😊'][data.conditionScore - 1] || '😐';
      const caloriePercent = calorieGoal > 0 ? Math.round((totalCalories / calorieGoal) * 100) : 0;

      let message = `[오늘 체크인] ${profile?.nickname || '사용자'} / ${dateFormatted}\n\n`;

      if (!hasAnyData) {
        message += `📭 오늘 기록이 아직 없습니다.\n물/식사/운동 기록을 남겨주세요.\n\n`;
      } else {
        message += `✅ 칼로리: ${totalCalories.toLocaleString()}/${calorieGoal.toLocaleString()}kcal (${caloriePercent}%)\n`;
        message += `🍚 탄/단/지: ${Math.round(totalCarbs)}g / ${Math.round(totalProtein)}g / ${Math.round(totalFat)}g\n`;
        message += `💧 물: ${totalWater.toLocaleString()}/${waterGoal.toLocaleString()}ml\n`;

        if (exercises.length > 0) {
          message += `🏋️ 운동:\n`;
          exercises.slice(0, 3).forEach(ex => {
            const parts = [ex.name || '운동'];
            if (ex.sets) parts.push(`${ex.sets}세트`);
            if (ex.reps) parts.push(`${ex.reps}회`);
            if (ex.weight) parts.push(`${ex.weight}kg`);
            message += `- ${parts.join(' ')}\n`;
          });
          if (exercises.length > 3) message += `- ...외 ${exercises.length - 3}개\n`;
        } else {
          message += `🏋️ 운동: 오늘 운동 기록 없음\n`;
        }

        if (currentWeight !== null) {
          message += `⚖️ 체중: ${currentWeight}kg`;
          if (goalWeight !== null) message += ` (목표 ${goalWeight}kg)`;
          message += `\n`;
        }
      }

      message += `\n${conditionEmoji} 컨디션: ${data.conditionScore}/5점\n`;
      message += `😴 수면: ${data.sleepHours}시간\n`;
      message += data.exerciseDone ? `✅ 운동 완료\n` : `❌ 운동 안함\n`;
      message += `🍽️ 식사 횟수: ${data.mealCount}회\n`;
      message += `📝 메모: ${data.notes?.trim() || '-'}\n`;

      if (conditions.length > 0) {
        message += `\n🔎 지병: ${conditions.join(' · ')}\n`;
        const recs = getRecommendationsForConditions(conditions);
        if (recs.avoid.length > 0 || recs.prefer.length > 0) {
          message += `📌 지병 기반 추천:\n`;
          if (recs.avoid.length > 0) message += `- 피하기: ${recs.avoid.join(', ')}\n`;
          if (recs.prefer.length > 0) message += `- 권장: ${recs.prefer.join(', ')}\n`;
          message += `(※ 참고용이며 진단/치료 대체 아님)\n`;
        }
      }

      // 구조화된 요약 생성 (checkin_reports용)
      const summary = {
        kcal: { intake: totalCalories, goal: calorieGoal, percent: caloriePercent },
        macros: { carbs: Math.round(totalCarbs), protein: Math.round(totalProtein), fat: Math.round(totalFat) },
        water: { intake_ml: totalWater, goal_ml: waterGoal },
        workout: exercises.slice(0, 5),
        weight: currentWeight !== null || goalWeight !== null ? { current: currentWeight, goal: goalWeight } : null,
        conditions: conditions.length > 0 ? conditions : null,
        recommendations: conditions.length > 0 ? getRecommendationsForConditions(conditions) : null,
        checkin: {
          conditionScore: data.conditionScore,
          sleepHours: data.sleepHours,
          exerciseDone: data.exerciseDone,
          mealCount: data.mealCount,
        },
        memo: data.notes?.trim() || null,
      };

      // 데이터 저장 (병렬)
      await Promise.all([
        supabase.from('chat_messages').insert({
          sender_id: user.id,
          receiver_id: profile.assigned_coach_id,
          message,
          message_type: 'text',
        }),
        supabase.from('checkin_templates').insert({
          user_id: user.id,
          condition_score: data.conditionScore,
          sleep_hours: data.sleepHours,
          exercise_done: data.exerciseDone,
          meal_count: data.mealCount,
          notes: data.notes,
        }),
      ]);

      // checkin_reports 별도 insert (타입이 아직 자동 생성되지 않음)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('checkin_reports') as any).insert({
        user_id: user.id,
        coach_id: profile.assigned_coach_id,
        report_date: today,
        summary,
      });

      toast({ title: '체크인 전송 완료' });
      return true;
    } catch (error) {
      console.error('Checkin error:', error);
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
