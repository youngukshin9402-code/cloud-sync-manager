import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyData } from "@/contexts/DailyDataContext";
import { useNutritionSettings } from "@/hooks/useNutritionSettings";
import { useTodayMealRecords } from "@/hooks/useMealRecordsQuery";
import { useHealthAgeStorage } from "@/hooks/useHealthAgeStorage";
import { TurtleCharacter } from "@/components/dashboard/TurtleCharacter";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { ChevronRight, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { profile } = useAuth();
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
  const { result: healthAgeResult } = useHealthAgeStorage();

  const goals = getGoals();
  const todayCalories = totals.totalCalories;
  const calorieGoal = goals?.calorieGoal ?? 0;
  const goalsReady = goals !== null;

  // 걸음수 (추후 연동 대비 - 현재는 placeholder)
  const todaySteps = 0;
  const stepsGoal = 10000;

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
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshWater, refreshPoints, refetchMeals, refetchSettings]);

  if (!profile) return null;

  // 달성 개수 계산 (실시간)
  const calculateAchievements = (): 0 | 1 | 2 | 3 | 4 => {
    let count = 0;

    // 1. 인바디 - 데이터 있으면 달성
    if (healthAgeResult?.healthAge) count++;

    // 2. 칼로리 - 목표 이상이면 달성
    if (goalsReady && calorieGoal > 0 && todayCalories >= calorieGoal) count++;

    // 3. 걸음수 - 목표 이상이면 달성
    if (todaySteps >= stepsGoal) count++;

    // 4. 물 - 목표 이상이면 달성
    if (todayWater >= waterGoal) count++;

    return Math.min(4, count) as 0 | 1 | 2 | 3 | 4;
  };

  const isGuardian = profile?.user_type === "guardian";
  const achievementCount = calculateAchievements();

  const nickname = profile?.nickname || "회원";

  return (
    <div className="flex flex-col h-full min-h-[calc(100dvh-120px)]">
      {/* 인사 문구 */}
      <div className="text-center py-1 shrink-0">
        <p className="text-base font-semibold text-foreground">
          안녕하세요, {nickname}님!
        </p>
        <p className="text-xs text-muted-foreground">
          오늘도 건강한 하루 보내세요!
        </p>
      </div>

      {/* 거북이 캐릭터 카드 - 메인 영역 (flex-1로 확장) */}
      <div className="flex-1 flex items-center justify-center py-2">
        <TurtleCharacter achievementCount={achievementCount} />
      </div>

      {/* 오늘 요약 2×2 그리드 - 하단 고정 */}
      <div className="grid grid-cols-2 gap-2 shrink-0 pb-2">
        {/* 1열 1행 - 인바디 & 신체 나이 */}
        <SummaryCard
          type="inbody"
          actualAge={healthAgeResult?.actualAge}
          healthAge={healthAgeResult?.healthAge}
          hasInbodyData={!!healthAgeResult?.healthAge}
        />

        {/* 2열 1행 - 섭취 칼로리 */}
        <SummaryCard
          type="calories"
          currentCalories={todayCalories}
          calorieGoal={calorieGoal}
          caloriesLoading={!goalsReady || mealsLoading}
        />

        {/* 1열 2행 - 걸음 수 */}
        <SummaryCard
          type="steps"
          currentSteps={todaySteps}
          stepsGoal={stepsGoal}
        />

        {/* 2열 2행 - 물 섭취 */}
        <SummaryCard
          type="water"
          currentWater={todayWater}
          waterGoal={waterGoal}
        />
      </div>

      {/* Guardian Family Section - 보호자만 표시 */}
      {isGuardian && (
        <Link to="/guardian" className="block shrink-0 pb-2">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-3 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-primary text-sm">연결된 가족 현황</p>
                <p className="text-xs text-muted-foreground">건강 요약 보기</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-primary" />
          </div>
        </Link>
      )}
    </div>
  );
}
