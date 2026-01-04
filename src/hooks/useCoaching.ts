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
  notes?: string;
}

interface SnapshotData {
  // 사용자 입력
  checkin: {
    conditionScore: number;
    sleepHours: number;
  };
  memo: string | null;
  
  // 홈탭 요약
  home: {
    calories: { current: number; goal: number; percent: number };
    water: { current: number; goal: number; percent: number };
    healthAge: { actual: number | null; health: number | null } | null;
  };
  
  // 건강탭 - 최근 기록 1건
  health: {
    id: string;
    exam_date: string | null;
    health_age: number | null;
    health_tags: string[] | null;
    parsed_data: any;
    created_at: string;
  } | null;
  
  // 영양탭 - 오늘 기록 전체
  nutrition: {
    totalCalories: number;
    macros: { carbs: number; protein: number; fat: number };
    meals: Array<{
      meal_type: string;
      total_calories: number;
      foods: any[];
      image_url: string | null;
      created_at: string;
    }>;
  };
  
  // 운동탭 - 오늘 기록 전체
  exercise: {
    records: Array<{
      id: string;
      exercises: any[];
      images: string[] | null;
      created_at: string;
    }>;
  };
  
  // 메타데이터
  sentAt: string;
  timezone: string;
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

  // 디버깅 로그
  console.log('[useCoaching] profile:', profile);
  console.log('[useCoaching] assigned_coach_id:', profile?.assigned_coach_id);
  console.log('[useCoaching] hasCoach:', !!profile?.assigned_coach_id);

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
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const sentAt = now.toISOString();

      // 모든 필요 데이터 병렬 조회
      const [
        mealResult, 
        waterResult, 
        waterSettingsResult, 
        nutritionSettingsResult, 
        healthRecordResult,
        gymResult,
        adminResult,
        versionResult,
        healthAgeResult, // 인바디 기반 건강나이
      ] = await Promise.all([
        // 오늘 식사 기록 전체
        supabase.from('meal_records')
          .select('id, meal_type, total_calories, foods, image_url, created_at')
          .eq('user_id', user.id)
          .eq('date', today)
          .order('created_at', { ascending: true }),
        // 오늘 물 섭취
        supabase.from('water_logs')
          .select('amount')
          .eq('user_id', user.id)
          .eq('date', today),
        // 물 목표
        supabase.from('water_settings')
          .select('daily_goal')
          .eq('user_id', user.id)
          .maybeSingle(),
        // 영양 설정 (칼로리 목표 등)
        supabase.from('nutrition_settings')
          .select('calorie_goal, carb_goal_g, protein_goal_g, fat_goal_g')
          .eq('user_id', user.id)
          .maybeSingle(),
        // 최근 건강 기록 1건 (건강검진 데이터 - 건강나이 제외)
        supabase.from('health_records')
          .select('id, exam_date, health_tags, parsed_data, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        // 오늘 운동 기록 전체
        supabase.from('gym_records')
          .select('id, exercises, images, created_at')
          .eq('user_id', user.id)
          .eq('date', today),
        // 관리자 목록 (role=admin)
        supabase.from('user_roles')
          .select('user_id')
          .eq('role', 'admin'),
        // 오늘 같은 날짜 리포트 버전 확인
        (supabase.from('checkin_reports') as any)
          .select('version_number')
          .eq('user_id', user.id)
          .eq('report_date', today)
          .order('version_number', { ascending: false })
          .limit(1),
        // 인바디 기반 건강나이 (health_age_results 테이블에서)
        supabase.from('health_age_results')
          .select('actual_age, health_age')
          .eq('user_id', user.id)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // 데이터 집계
      const meals = mealResult.data || [];
      const totalCalories = meals.reduce((sum, m) => sum + (m.total_calories || 0), 0);
      
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
      const calorieGoal = nutritionSettingsResult.data?.calorie_goal || 2000;

      const healthRecord = healthRecordResult.data?.[0] || null;
      const gymRecords = gymResult.data || [];
      const adminIds = (adminResult.data || []).map(r => r.user_id);
      
      // 인바디 기반 건강나이 (건강검진 건강나이와 분리)
      const inbodyHealthAge = healthAgeResult.data;

      // 버전 번호 계산
      const lastVersion = versionResult.data?.[0]?.version_number || 0;
      const newVersion = lastVersion + 1;

      // 스냅샷 데이터 생성
      const snapshotData: SnapshotData = {
        checkin: {
          conditionScore: data.conditionScore,
          sleepHours: data.sleepHours,
        },
        memo: data.notes?.trim() || null,
        
        home: {
          calories: {
            current: totalCalories,
            goal: calorieGoal,
            percent: calorieGoal > 0 ? Math.round((totalCalories / calorieGoal) * 100) : 0,
          },
          water: {
            current: totalWater,
            goal: waterGoal,
            percent: waterGoal > 0 ? Math.round((totalWater / waterGoal) * 100) : 0,
          },
          // 인바디 기반 건강나이만 사용 (건강검진 건강나이 사용 안함)
          healthAge: inbodyHealthAge ? {
            actual: inbodyHealthAge.actual_age,
            health: inbodyHealthAge.health_age,
          } : null,
        },
        
        // 건강검진 데이터 (건강나이 필드는 null로 설정 - 인바디 건강나이와 분리)
        health: healthRecord ? {
          id: healthRecord.id,
          exam_date: healthRecord.exam_date,
          health_age: null, // 건강검진 건강나이는 활동 공유에 포함하지 않음
          health_tags: healthRecord.health_tags,
          parsed_data: healthRecord.parsed_data,
          created_at: healthRecord.created_at,
        } : null,
        
        nutrition: {
          totalCalories,
          macros: {
            carbs: Math.round(totalCarbs),
            protein: Math.round(totalProtein),
            fat: Math.round(totalFat),
          },
          meals: meals.map(m => ({
            meal_type: m.meal_type,
            total_calories: m.total_calories || 0,
            foods: m.foods as any[] || [],
            image_url: m.image_url,
            created_at: m.created_at || '',
          })),
        },
        
        exercise: {
          records: gymRecords.map(r => ({
            id: r.id,
            exercises: r.exercises as any[] || [],
            images: r.images,
            created_at: r.created_at || '',
          })),
        },
        
        sentAt,
        timezone: 'Asia/Seoul',
      };

      // 요약 (기존 호환성 유지)
      const summary = {
        kcal: snapshotData.home.calories,
        macros: snapshotData.nutrition.macros,
        water: { intake_ml: totalWater, goal_ml: waterGoal },
        workout: gymRecords.flatMap(r => (r.exercises as any[]) || []).slice(0, 5),
        checkin: snapshotData.checkin,
        memo: snapshotData.memo,
      };

      // 코치에게 리포트 저장
      const reportInserts: Promise<any>[] = [];
      
      // 코치용 리포트
      reportInserts.push(
        (supabase.from('checkin_reports') as any).insert({
          user_id: user.id,
          coach_id: profile.assigned_coach_id,
          report_date: today,
          sent_at: sentAt,
          version_number: newVersion,
          summary,
          snapshot_data: snapshotData,
        })
      );

      // 관리자들에게도 리포트 저장 (코치와 중복이면 제외)
      const uniqueAdminIds = adminIds.filter(id => id !== profile.assigned_coach_id && id !== user.id);
      for (const adminId of uniqueAdminIds) {
        reportInserts.push(
          (supabase.from('checkin_reports') as any).insert({
            user_id: user.id,
            coach_id: adminId, // admin도 coach_id 필드 사용
            admin_id: adminId,
            report_date: today,
            sent_at: sentAt,
            version_number: newVersion,
            summary,
            snapshot_data: snapshotData,
          })
        );
      }

      // 채팅 메시지 (코치에게만)
      const conditionEmoji = ['😫', '😕', '😐', '🙂', '😊'][data.conditionScore - 1] || '😐';
      const dateFormatted = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
      
      let message = `[오늘의 활동 v${newVersion}] ${profile?.nickname || '사용자'} / ${dateFormatted}\n\n`;
      message += `${conditionEmoji} 컨디션: ${data.conditionScore}/5점\n`;
      message += `😴 수면: ${data.sleepHours}시간\n`;
      message += `✅ 칼로리: ${totalCalories.toLocaleString()}/${calorieGoal.toLocaleString()}kcal\n`;
      message += `💧 물: ${totalWater.toLocaleString()}/${waterGoal.toLocaleString()}ml\n`;
      if (gymRecords.length > 0) {
        message += `🏋️ 운동: ${gymRecords.length}건 기록\n`;
      }
      if (data.notes?.trim()) {
        message += `📝 메모: ${data.notes.trim()}\n`;
      }
      message += `\n📊 상세 리포트는 대시보드에서 확인하세요.`;

      // 병렬 저장
      await Promise.all([
        ...reportInserts,
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
          notes: data.notes,
        }),
      ]);

      const versionText = newVersion > 1 ? ` (재전송 #${newVersion})` : '';
      toast({ title: `체크인 전송 완료${versionText}` });
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
