/**
 * 끼니 2x2 카드 그리드 컴포넌트
 */

import { Plus } from "lucide-react";
import { MealType, MealRecordServer } from "@/hooks/useServerSync";
import { cn } from "@/lib/utils";

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍪",
};

interface MealCardsGridProps {
  recordsByMealType: Record<MealType, MealRecordServer[]>;
  caloriesByMealType: Record<MealType, number>;
  onAddMeal: (mealType: MealType) => void;
}

export function MealCardsGrid({ 
  recordsByMealType, 
  caloriesByMealType, 
  onAddMeal 
}: MealCardsGridProps) {
  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <div className="grid grid-cols-2 gap-3">
      {mealTypes.map((mealType) => {
        const records = recordsByMealType[mealType];
        const calories = caloriesByMealType[mealType];
        const hasRecords = records.length > 0;

        return (
          <div
            key={mealType}
            className={cn(
              "relative bg-card rounded-2xl border border-border p-4 min-h-[120px] transition-all",
              "hover:shadow-md hover:border-primary/30 cursor-pointer"
            )}
            onClick={() => onAddMeal(mealType)}
          >
            {/* 추가 버튼 */}
            <button
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onAddMeal(mealType);
              }}
            >
              <Plus className="w-4 h-4 text-primary" />
            </button>

            {/* 아이콘 및 제목 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{MEAL_TYPE_ICONS[mealType]}</span>
              <span className="font-semibold">{MEAL_TYPE_LABELS[mealType]}</span>
            </div>

            {/* 칼로리 */}
            <p className={cn(
              "text-2xl font-bold",
              hasRecords ? "text-primary" : "text-muted-foreground"
            )}>
              {calories} <span className="text-sm font-normal">kcal</span>
            </p>

            {/* 기록 요약 */}
            {hasRecords ? (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {records.flatMap(r => r.foods.map(f => f.name)).slice(0, 3).join(", ")}
                {records.flatMap(r => r.foods).length > 3 && " 외"}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                터치하여 추가
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
