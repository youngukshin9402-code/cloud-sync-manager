/**
 * 영양 요약 카드 컴포넌트
 * - 섭취/목표 kcal 크게 표시
 * - 탄/단/지 진행률 및 g 표시
 * - 낙관적 업데이트 지원
 */

import { Flame, Beef, Wheat, Droplet } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { NutritionGoals } from "@/lib/nutritionUtils";
import { NutritionTotals, calculatePercentage, calculateRemainingCalories } from "@/lib/nutritionUtils";
import { NutritionSettingsForm } from "./NutritionSettingsForm";

interface NutritionSummaryCardProps {
  totals: NutritionTotals;
  goals: NutritionGoals;
  hasSettings: boolean;
  onGoalsUpdate?: (goals: NutritionGoals) => void;
}

export function NutritionSummaryCard({ totals, goals, hasSettings, onGoalsUpdate }: NutritionSummaryCardProps) {
  const caloriePercent = calculatePercentage(totals.totalCalories, goals.calorieGoal);
  const carbPercent = calculatePercentage(totals.totalCarbs, goals.carbGoalG);
  const proteinPercent = calculatePercentage(totals.totalProtein, goals.proteinGoalG);
  const fatPercent = calculatePercentage(totals.totalFat, goals.fatGoalG);
  const remaining = calculateRemainingCalories(totals.totalCalories, goals.calorieGoal);

  // 설정 없으면 설정 유도
  if (!hasSettings) {
    return <NutritionSettingsForm onGoalsUpdate={onGoalsUpdate} />;
  }

  return (
    <div className="bg-gradient-to-br from-[#ff9f43] to-[#ffb76b] rounded-3xl p-4 text-white space-y-3">
      {/* 상단: 섭취/목표 */}
      <div>
        <p className="text-white/80 text-xs mb-0.5">오늘 섭취</p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{totals.totalCalories.toLocaleString()}</span>
          <span className="text-base text-white/80">/ {goals.calorieGoal.toLocaleString()} kcal</span>
        </div>
      </div>

      {/* 칼로리 프로그레스 */}
      <div>
        <Progress 
          value={caloriePercent} 
          className="h-2 bg-white/20"
          indicatorClassName="bg-white/70"
        />
        <p className="text-xs text-white/80 mt-1.5 flex items-center gap-1">
          <Flame className="w-3 h-3" />
          {remaining > 0 ? `${remaining}kcal 더 먹을 수 있어요` : "목표 달성!"}
        </p>
      </div>

      {/* 탄단지 요약 - 한 줄 표시 */}
      <div className="grid grid-cols-3 gap-2">
        {/* 탄수화물 */}
        <div className="bg-white/10 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Wheat className="w-3 h-3 shrink-0" />
            <span className="text-[10px] whitespace-nowrap">탄수화물</span>
          </div>
          <Progress value={carbPercent} className="h-1 bg-white/20 mb-0.5" indicatorClassName="bg-white/70" />
          <p className="text-xs font-semibold whitespace-nowrap">{totals.totalCarbs}/{goals.carbGoalG}g</p>
        </div>

        {/* 단백질 */}
        <div className="bg-white/10 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Beef className="w-3 h-3 shrink-0" />
            <span className="text-[10px] whitespace-nowrap">단백질</span>
          </div>
          <Progress value={proteinPercent} className="h-1 bg-white/20 mb-0.5" indicatorClassName="bg-white/70" />
          <p className="text-xs font-semibold whitespace-nowrap">{totals.totalProtein}/{goals.proteinGoalG}g</p>
        </div>

        {/* 지방 */}
        <div className="bg-white/10 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Droplet className="w-3 h-3 shrink-0" />
            <span className="text-[10px] whitespace-nowrap">지방</span>
          </div>
          <Progress value={fatPercent} className="h-1 bg-white/20 mb-0.5" indicatorClassName="bg-white/70" />
          <p className="text-xs font-semibold whitespace-nowrap">{totals.totalFat}/{goals.fatGoalG}g</p>
        </div>
      </div>
    </div>
  );
}
