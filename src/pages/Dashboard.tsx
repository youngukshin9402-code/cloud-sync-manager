import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyData } from "@/contexts/DailyDataContext";
import { useNutritionSettings } from "@/hooks/useNutritionSettings";
import { useTodayMealRecords } from "@/hooks/useMealRecordsQuery";
import { useGoalAchievement } from "@/hooks/useGoalAchievement";
import { useHealthAgeStorage } from "@/hooks/useHealthAgeStorage";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Droplets,
  Dumbbell,
  ChevronRight,
  Target,
  TrendingUp,
  Heart,
} from "lucide-react";
import { getTodayString } from "@/lib/localStorage";

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const {
    todayWater,
    waterGoal,
    refreshWater,
    refreshPoints,
  } = useDailyData();

  const { getGoals, loading: settingsLoading, refetch: refetchSettings } = useNutritionSettings();
  const {
    totals,
    records: todayMealRecords,
    loading: mealsLoading,
    refetch: refetchMeals,
  } = useTodayMealRecords();
  const { checkAndNotify } = useGoalAchievement();
  const { result: healthAgeResult } = useHealthAgeStorage();

  const goals = getGoals();
  const todayCalories = totals.totalCalories;
  const calorieGoal = goals?.calorieGoal ?? 0;
  const goalsReady = goals !== null;
  const caloriesReady = goalsReady && (todayMealRecords.length > 0 || !mealsLoading);
  const caloriesMet = caloriesReady && calorieGoal > 0 && todayCalories >= calorieGoal;

  const today = getTodayString();

  // Refresh data on mount and focus
  useEffect(() => {
    refreshWater();
    refreshPoints();
    refetchMeals();
    refetchSettings();
  }, [refreshWater, refreshPoints, refetchMeals, refetchSettings]);

  useEffect(() => {
    const handleFocus = () => {
      refreshWater();
      refreshPoints();
      refetchMeals();
      refetchSettings();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshWater, refreshPoints, refetchMeals, refetchSettings]);

  // 목표 달성 체크 및 알림
  useEffect(() => {
    const caloriesMet = caloriesReady && calorieGoal > 0 && todayCalories >= calorieGoal;
    const waterMet = todayWater >= waterGoal;
    
    checkAndNotify(caloriesMet, waterMet, false);
  }, [caloriesReady, todayCalories, calorieGoal, todayWater, waterGoal, checkAndNotify]);

  if (!profile) return null;

  const isGuardian = profile?.user_type === "guardian";

  // 건강나이 데이터 존재 여부
  const hasHealthAge = healthAgeResult !== null;
  const actualAge = healthAgeResult?.actualAge;
  const healthAge = healthAgeResult?.healthAge;

  return (
    <div className="flex flex-col h-full pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            안녕하세요, {profile?.nickname || "회원"}님!
          </h1>
          <p className="text-muted-foreground">오늘도 건강한 하루 보내세요 🌟</p>
        </div>
      </div>

      {/* Today's Summary KPIs */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-primary" />
          오늘 요약
        </h2>
        
        <div className="grid grid-cols-2 gap-3 flex-1">
          {/* Calories */}
          <Link to="/nutrition" className="block">
            <div className="bg-card rounded-2xl border border-border p-3 h-full hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1.5 gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-health-orange/10 flex items-center justify-center shrink-0">
                    <Flame className="w-3 h-3 text-health-orange" />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap truncate">섭취 칼로리</span>
                </div>
                {caloriesReady && caloriesMet && (
                  <Badge className="bg-health-green text-white text-[9px] px-1 py-0 shrink-0">
                    달성
                  </Badge>
                )}
              </div>
              <p className="text-lg font-bold tabular-nums">
                {goalsReady && !mealsLoading ? `${todayCalories.toLocaleString()} kcal` : "…"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                목표 {goalsReady ? calorieGoal.toLocaleString() : "…"} kcal
              </p>
              <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-health-orange transition-all"
                  style={{
                    width: `${
                      goalsReady && calorieGoal > 0
                        ? Math.min((todayCalories / calorieGoal) * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </Link>

          {/* Water */}
          <Link to="/water" className="block">
            <div className="bg-card rounded-2xl border border-border p-3 h-full hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1.5 gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-health-blue/10 flex items-center justify-center shrink-0">
                    <Droplets className="w-3 h-3 text-health-blue" />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap truncate">물 섭취</span>
                </div>
                {todayWater >= waterGoal && (
                  <Badge className="bg-health-green text-white text-[9px] px-1 py-0 shrink-0">
                    달성
                  </Badge>
                )}
              </div>
              <p className="text-lg font-bold">{todayWater.toLocaleString()}ml</p>
              <p className="text-[10px] text-muted-foreground">목표 {waterGoal.toLocaleString()}ml</p>
              <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-health-blue transition-all"
                  style={{ width: `${Math.min((todayWater / waterGoal) * 100, 100)}%` }}
                />
              </div>
            </div>
          </Link>

          {/* 걸음수 카드 */}
          <Link to="/exercise" className="block">
            <div className="bg-card rounded-2xl border border-border p-3 h-full hover:shadow-md transition-shadow">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-health-green/10 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-3 h-3 text-health-green" />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap truncate">걸음수</span>
              </div>
              <p className="text-lg font-bold">0 걸음</p>
              <p className="text-[10px] text-muted-foreground">연동 준비중</p>
              <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-health-green transition-all" style={{ width: '0%' }} />
              </div>
            </div>
          </Link>

          {/* 건강나이 카드 */}
          <div 
            className="bg-card rounded-2xl border border-border p-3 h-full hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/medical')}
          >
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-health-purple/10 flex items-center justify-center shrink-0">
                  <Heart className="w-3 h-3 text-health-purple" />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap truncate">건강나이</span>
              </div>
              {hasHealthAge && healthAge !== undefined && actualAge !== undefined && healthAge < actualAge && (
                <Badge className="bg-health-green text-white text-[9px] px-1 py-0 shrink-0">
                  달성
                </Badge>
              )}
            </div>
            <p className="text-lg font-bold">
              {hasHealthAge ? `${actualAge}세 / ${healthAge}세` : "- / -"}
            </p>
            <p className="text-[10px] text-muted-foreground">실제나이 / 건강나이</p>
            <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-health-purple transition-all" 
                style={{ 
                  width: hasHealthAge ? '100%' : '0%' 
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Guardian Family Section - 보호자만 표시 */}
      {isGuardian && (
        <Link to="/guardian" className="block mt-4">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-primary">연결된 가족 현황</p>
                <p className="text-sm text-muted-foreground">건강 요약 보기</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-primary" />
          </div>
        </Link>
      )}
    </div>
  );
}
