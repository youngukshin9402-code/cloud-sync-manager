import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyData } from "@/contexts/DailyDataContext";
import { useNutritionSettings } from "@/hooks/useNutritionSettings";
import { useTodayMealRecords } from "@/hooks/useMealRecordsQuery";
import { useGoalAchievement } from "@/hooks/useGoalAchievement";
import { useHealthAgeStorage } from "@/hooks/useHealthAgeStorage";
import { Badge } from "@/components/ui/badge";
import YanggaengCharacter from "@/components/YanggaengCharacter";
import {
  Flame,
  Droplets,
  Dumbbell,
  ChevronRight,
  TrendingUp,
  Heart,
  Target,
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

  // 자정 초기화를 위한 현재 날짜 상태
  const [currentDate, setCurrentDate] = useState(getTodayString());

  // 자정 초기화 감지
  useEffect(() => {
    const checkMidnight = () => {
      const today = getTodayString();
      if (today !== currentDate) {
        setCurrentDate(today);
        // 데이터 새로고침
        refreshWater();
        refetchMeals();
        refetchSettings();
      }
    };

    // 1분마다 체크
    const interval = setInterval(checkMidnight, 60000);
    
    return () => clearInterval(interval);
  }, [currentDate, refreshWater, refetchMeals, refetchSettings]);

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

  // 달성 개수 계산 (실시간)
  const calculateAchievementCount = useCallback(() => {
    let count = 0;
    
    // 1. 건강나이 달성 (건강나이 < 실제나이)
    if (hasHealthAge && healthAge !== undefined && actualAge !== undefined && healthAge < actualAge) {
      count++;
    }
    
    // 2. 칼로리 달성
    if (caloriesReady && calorieGoal > 0 && todayCalories >= calorieGoal) {
      count++;
    }
    
    // 3. 물 달성
    if (todayWater >= waterGoal) {
      count++;
    }
    
    // 4. 걸음수 (현재 연동 준비중 - 항상 미달성)
    // const stepsMet = steps >= stepsGoal;
    
    return count;
  }, [hasHealthAge, healthAge, actualAge, caloriesReady, calorieGoal, todayCalories, todayWater, waterGoal]);

  const achievementCount = calculateAchievementCount();

  return (
    <div className="flex flex-col h-full pb-2 overflow-hidden">
      {/* 인사말 */}
      <div className="text-center py-2">
        <p className="text-base font-medium text-foreground">
          안녕하세요, {profile?.nickname || "회원"}님! 오늘도 건강한 하루 보내세요 🌟
        </p>
      </div>

      {/* 영양갱 캐릭터 */}
      <div className="flex justify-center py-2">
        <YanggaengCharacter achievementCount={achievementCount} />
      </div>

      {/* Today's Summary KPIs */}
      <div className="flex-1 flex flex-col min-h-0">
        <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-2 px-1">
          <Target className="w-4 h-4 text-primary" />
          오늘 요약
        </h2>
        
        <div className="grid grid-cols-2 gap-2 flex-1">
          {/* Calories */}
          <Link to="/nutrition" className="block">
            <div className="bg-card rounded-xl border border-border p-2.5 h-full hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1 gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-health-orange/10 flex items-center justify-center shrink-0">
                    <Flame className="w-2.5 h-2.5 text-health-orange" />
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap truncate">섭취 칼로리</span>
                </div>
                {caloriesReady && caloriesMet && (
                  <Badge className="bg-health-green text-white text-[8px] px-1 py-0 shrink-0">
                    달성
                  </Badge>
                )}
              </div>
              <p className="text-base font-bold tabular-nums">
                {goalsReady && !mealsLoading ? todayCalories.toLocaleString() : "…"}
              </p>
              <p className="text-[9px] text-muted-foreground">
                목표 {goalsReady ? calorieGoal.toLocaleString() : "…"} kcal
              </p>
              <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
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
            <div className="bg-card rounded-xl border border-border p-2.5 h-full hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1 gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-health-blue/10 flex items-center justify-center shrink-0">
                    <Droplets className="w-2.5 h-2.5 text-health-blue" />
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap truncate">물 섭취</span>
                </div>
                {todayWater >= waterGoal && (
                  <Badge className="bg-health-green text-white text-[8px] px-1 py-0 shrink-0">
                    달성
                  </Badge>
                )}
              </div>
              <p className="text-base font-bold">{todayWater.toLocaleString()}ml</p>
              <p className="text-[9px] text-muted-foreground">목표 {waterGoal.toLocaleString()}ml</p>
              <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-health-blue transition-all"
                  style={{ width: `${Math.min((todayWater / waterGoal) * 100, 100)}%` }}
                />
              </div>
            </div>
          </Link>

          {/* 걸음수 카드 */}
          <Link to="/exercise" className="block">
            <div className="bg-card rounded-xl border border-border p-2.5 h-full hover:shadow-md transition-shadow">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-5 h-5 rounded-full bg-health-green/10 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-2.5 h-2.5 text-health-green" />
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap truncate">걸음수</span>
              </div>
              <p className="text-base font-bold">0</p>
              <p className="text-[9px] text-muted-foreground">연동 준비중</p>
              <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-health-green transition-all" style={{ width: '0%' }} />
              </div>
            </div>
          </Link>

          {/* 건강나이 카드 */}
          <div 
            className="bg-card rounded-xl border border-border p-2.5 h-full hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/medical')}
          >
            <div className="flex items-center justify-between mb-1 gap-1">
              <div className="flex items-center gap-1 min-w-0">
                <div className="w-5 h-5 rounded-full bg-health-purple/10 flex items-center justify-center shrink-0">
                  <Heart className="w-2.5 h-2.5 text-health-purple" />
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap truncate">건강나이</span>
              </div>
              {hasHealthAge && healthAge !== undefined && actualAge !== undefined && healthAge < actualAge && (
                <Badge className="bg-health-green text-white text-[8px] px-1 py-0 shrink-0">
                  달성
                </Badge>
              )}
            </div>
            <p className="text-base font-bold">
              {hasHealthAge ? `${actualAge}세 / ${healthAge}세` : "- / -"}
            </p>
            <p className="text-[9px] text-muted-foreground">실제나이 / 건강나이</p>
            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-health-purple transition-all" 
                style={{ 
                  width: hasHealthAge && actualAge && healthAge
                    ? `${Math.min(100, Math.max(0, (1 - (healthAge - actualAge) / 10) * 100))}%`
                    : '0%' 
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Guardian Family Section - 보호자만 표시 */}
      {isGuardian && (
        <Link to="/guardian" className="block mt-2">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-3 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-primary text-sm">연결된 가족 현황</p>
                <p className="text-xs text-muted-foreground">건강 요약 보기</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-primary" />
          </div>
        </Link>
      )}
    </div>
  );
}
