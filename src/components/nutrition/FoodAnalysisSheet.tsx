/**
 * AI 음식 분석 결과 확인/수정 시트
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Save, Loader2 } from "lucide-react";
import { MealType, MealFood } from "@/hooks/useServerSync";

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

const PORTION_OPTIONS = ["0.5인분", "1인분", "1.5인분", "2인분"];

interface AnalyzedFood {
  name: string;
  portion: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

interface FoodAnalysisSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: MealType;
  onMealTypeChange: (type: MealType) => void;
  imageUrl: string | null;
  analyzedFoods: AnalyzedFood[];
  onFoodsChange: (foods: AnalyzedFood[]) => void;
  onSave: () => void;
  saving: boolean;
}

export function FoodAnalysisSheet({
  open,
  onOpenChange,
  mealType,
  onMealTypeChange,
  imageUrl,
  analyzedFoods,
  onFoodsChange,
  onSave,
  saving,
}: FoodAnalysisSheetProps) {
  const handleFoodChange = (index: number, field: keyof AnalyzedFood, value: string | number) => {
    const updated = analyzedFoods.map((f, i) => 
      i === index ? { ...f, [field]: value } : f
    );
    onFoodsChange(updated);
  };

  const handleRemoveFood = (index: number) => {
    onFoodsChange(analyzedFoods.filter((_, i) => i !== index));
  };

  const totalCalories = analyzedFoods.reduce((sum, f) => sum + f.calories, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl w-full max-w-[420px] mx-auto left-1/2 -translate-x-1/2 overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>음식 정보 확인</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* 이미지 미리보기 */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="업로드된 음식"
              className="w-full h-40 object-cover rounded-xl bg-muted"
            />
          )}

          {/* 식사 종류 선택 */}
          <div>
            <label className="text-sm font-medium">식사 종류</label>
            <Select value={mealType} onValueChange={(v) => onMealTypeChange(v as MealType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(MEAL_TYPE_LABELS) as [MealType, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 분석된 음식 목록 */}
          <div className="space-y-3">
            {analyzedFoods.map((food, index) => (
              <div key={index} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <Input
                    value={food.name}
                    onChange={(e) => handleFoodChange(index, "name", e.target.value)}
                    className="font-semibold border-0 p-0 h-auto text-lg focus-visible:ring-0"
                    placeholder="음식명"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleRemoveFood(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* 양 선택 - 인분만 */}
                <div className="mb-3">
                  <label className="text-xs text-muted-foreground">양</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {PORTION_OPTIONS.map((opt) => (
                      <Button
                        key={opt}
                        variant={food.portion === opt ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleFoodChange(index, "portion", opt)}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* g 입력 */}
                <div className="mb-3">
                  <label className="text-xs text-muted-foreground">중량 (g)</label>
                  <Input
                    type="number"
                    placeholder="예: 300"
                    className="h-8 mt-1"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 합계 및 저장 */}
          <div className="bg-primary/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">총 칼로리</span>
              <span className="text-2xl font-bold text-primary">{totalCalories} kcal</span>
            </div>
            <Button 
              className="w-full h-12" 
              onClick={onSave}
              disabled={saving || analyzedFoods.length === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  저장하기
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
