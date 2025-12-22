/**
 * 영양 요약 카드 컴포넌트
 * - 섭취/목표 kcal 크게 표시
 * - 탄/단/지 진행률 및 g 표시
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
}

export function NutritionSummaryCard({ totals, goals, hasSettings }: NutritionSummaryCardProps) {
  const caloriePercent = calculatePercentage(totals.totalCalories, goals.calorieGoal);
  const carbPercent = calculatePercentage(totals.totalCarbs, goals.carbGoalG);
  const proteinPercent = calculatePercentage(totals.totalProtein, goals.proteinGoalG);
  const fatPercent = calculatePercentage(totals.totalFat, goals.fatGoalG);
  const remaining = calculateRemainingCalories(totals.totalCalories, goals.calorieGoal);

  // 설정 없으면 설정 유도
  if (!hasSettings) {
    return <NutritionSettingsForm />;
  }

  return (
    <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-5 text-white space-y-4">
      {/* 상단: 섭취/목표 */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-white/80 text-sm mb-1">오늘 섭취</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">{totals.totalCalories.toLocaleString()}</span>
            <span className="text-lg text-white/80">/ {goals.calorieGoal.toLocaleString()} kcal</span>
          </div>
        </div>
        <NutritionSettingsForm compact />
      </div>

      {/* 칼로리 프로그레스 */}
      <div>
        <Progress 
          value={caloriePercent} 
          className="h-3 bg-white/20"
        />
        <p className="text-sm text-white/80 mt-2 flex items-center gap-1">
          <Flame className="w-4 h-4" />
          {totals.totalCalories}kcal 섭취 | {remaining}kcal 더 먹을 수 있어요
        </p>
      </div>

      {/* 탄단지 요약 */}
      <div className="grid grid-cols-3 gap-3">
        {/* 탄수화물 */}
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <Wheat className="w-4 h-4" />
            <span className="text-xs">탄수화물</span>
          </div>
          <Progress value={carbPercent} className="h-1.5 bg-white/20 mb-1" />
          <p className="text-sm font-semibold">
            {totals.totalCarbs}g / {goals.carbGoalG}g
          </p>
          <p className="text-xs text-white/70">{carbPercent}%</p>
        </div>

        {/* 단백질 */}
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <Beef className="w-4 h-4" />
            <span className="text-xs">단백질</span>
          </div>
          <Progress value={proteinPercent} className="h-1.5 bg-white/20 mb-1" />
          <p className="text-sm font-semibold">
            {totals.totalProtein}g / {goals.proteinGoalG}g
          </p>
          <p className="text-xs text-white/70">{proteinPercent}%</p>
        </div>

        {/* 지방 */}
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <Droplet className="w-4 h-4" />
            <span className="text-xs">지방</span>
          </div>
          <Progress value={fatPercent} className="h-1.5 bg-white/20 mb-1" />
          <p className="text-sm font-semibold">
            {totals.totalFat}g / {goals.fatGoalG}g
          </p>
          <p className="text-xs text-white/70">{fatPercent}%</p>
        </div>
      </div>
    </div>
  );
}
