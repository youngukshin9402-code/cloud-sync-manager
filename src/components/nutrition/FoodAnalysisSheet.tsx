/**
 * AI 음식 분석 결과 확인/수정 시트
 * - 인분 선택 시 실시간 칼로리 계산
 * - baseCalories 기준으로 multiplier 적용
 */

import { useState, useRef, useEffect } from "react";
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

// 인분 옵션 (0.5, 1, 1.5, 2만)
const PORTION_OPTIONS = [
  { label: "0.5", value: 0.5 },
  { label: "1", value: 1 },
  { label: "1.5", value: 1.5 },
  { label: "2", value: 2 },
];

interface AnalyzedFood {
  name: string;
  portion: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

// 기준값을 저장하기 위한 타입
interface BaseFoodData {
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
  // 기준값 저장 (최초 1인분 기준)
  const baseFoodsRef = useRef<Map<number, BaseFoodData>>(new Map());
  
  // 초기 기준값 설정
  useEffect(() => {
    if (analyzedFoods.length > 0 && baseFoodsRef.current.size === 0) {
      analyzedFoods.forEach((food, idx) => {
        baseFoodsRef.current.set(idx, {
          calories: food.calories,
          carbs: food.carbs,
          protein: food.protein,
          fat: food.fat,
        });
      });
    }
  }, [analyzedFoods]);

  // 인분 변경 시 실시간 계산
  const handlePortionChange = (index: number, portionValue: number) => {
    const baseData = baseFoodsRef.current.get(index);
    if (!baseData) return;

    const updated = analyzedFoods.map((f, i) => {
      if (i !== index) return f;
      
      return {
        ...f,
        portion: `${portionValue}인분`,
        calories: Math.round(baseData.calories * portionValue),
        carbs: Math.round(baseData.carbs * portionValue),
        protein: Math.round(baseData.protein * portionValue),
        fat: Math.round(baseData.fat * portionValue),
      };
    });
    onFoodsChange(updated);
  };

  const handleFoodNameChange = (index: number, value: string) => {
    const updated = analyzedFoods.map((f, i) => 
      i === index ? { ...f, name: value } : f
    );
    onFoodsChange(updated);
  };

  const handleRemoveFood = (index: number) => {
    baseFoodsRef.current.delete(index);
    onFoodsChange(analyzedFoods.filter((_, i) => i !== index));
  };

  // 현재 portion에서 multiplier 추출
  const getPortionMultiplier = (portion: string): number => {
    const match = portion.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 1;
  };

  const totalCalories = analyzedFoods.reduce((sum, f) => sum + f.calories, 0);

  // 시트 닫힐 때 기준값 초기화
  useEffect(() => {
    if (!open) {
      baseFoodsRef.current.clear();
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl w-full max-w-[420px] mx-auto left-1/2 -translate-x-1/2 overflow-y-auto"
      >
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
            {analyzedFoods.map((food, index) => {
              const currentMultiplier = getPortionMultiplier(food.portion);
              
              return (
                <div key={index} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Input
                      value={food.name}
                      onChange={(e) => handleFoodNameChange(index, e.target.value)}
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

                  {/* 인분 선택 - 한 줄로 나열, 줄바꿈 없음 */}
                  <div className="mb-3">
                    <label className="text-xs text-muted-foreground">인분 선택</label>
                    <div className="flex flex-nowrap gap-2 mt-1 overflow-x-auto">
                      {PORTION_OPTIONS.map((opt) => (
                        <Button
                          key={opt.value}
                          variant={currentMultiplier === opt.value ? "default" : "outline"}
                          size="sm"
                          className="h-9 px-4 text-sm shrink-0"
                          onClick={() => handlePortionChange(index, opt.value)}
                        >
                          {opt.label}인분
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 영양 정보 표시 (읽기 전용) */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-muted-foreground">칼로리</p>
                      <p className="font-semibold text-primary">{food.calories}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-muted-foreground">탄수화물</p>
                      <p className="font-semibold">{food.carbs}g</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-muted-foreground">단백질</p>
                      <p className="font-semibold">{food.protein}g</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-muted-foreground">지방</p>
                      <p className="font-semibold">{food.fat}g</p>
                    </div>
                  </div>
                </div>
              );
            })}
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