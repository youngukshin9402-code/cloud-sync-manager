/**
 * AI 음식 분석 결과 확인/수정 시트
 * - 음식명 + 인분 선택(0.5/1/1.5/2) + g 입력칸만 표시
 * - 칼로리/탄단지/총칼로리는 숨김
 * - 저장 시 AI가 영양정보 계산
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
  grams?: number; // g 입력용
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
  // 인분 변경
  const handlePortionChange = (index: number, portionValue: number) => {
    const updated = analyzedFoods.map((f, i) => {
      if (i !== index) return f;
      return {
        ...f,
        portion: `${portionValue}인분`,
        grams: undefined, // 인분 선택 시 g 입력 초기화
      };
    });
    onFoodsChange(updated);
  };

  // g 입력 변경
  const handleGramsChange = (index: number, grams: string) => {
    const gramsNum = grams ? parseInt(grams) : undefined;
    const updated = analyzedFoods.map((f, i) => {
      if (i !== index) return f;
      return {
        ...f,
        grams: gramsNum,
        portion: gramsNum ? `${gramsNum}g` : f.portion, // g 입력 시 portion을 g로 표시
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
    onFoodsChange(analyzedFoods.filter((_, i) => i !== index));
  };

  // 현재 portion에서 multiplier 추출
  const getPortionMultiplier = (portion: string): number | null => {
    // "1인분" 형태에서 숫자 추출
    const match = portion.match(/^(\d+\.?\d*)인분$/);
    return match ? parseFloat(match[1]) : null;
  };

  // 시트 닫힐 때 정리
  useEffect(() => {
    if (!open) {
      // 필요한 정리 작업
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] h-[85dvh] rounded-t-3xl w-full max-w-[420px] mx-auto left-1/2 -translate-x-1/2 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]"
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

          {/* 분석된 음식 목록 - 간소화된 UI */}
          <div className="space-y-3">
            {analyzedFoods.map((food, index) => {
              const currentMultiplier = getPortionMultiplier(food.portion);
              const hasGrams = food.grams !== undefined;
              
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

                  {/* 인분 선택 - 모바일에서 한 줄 4등분 */}
                  <div className="mb-3">
                    <label className="text-xs text-muted-foreground">인분 선택</label>
                    <div className="grid grid-cols-4 gap-1 mt-1">
                      {PORTION_OPTIONS.map((opt) => (
                        <Button
                          key={opt.value}
                          variant={currentMultiplier === opt.value && !hasGrams ? "default" : "outline"}
                          size="sm"
                          className="h-9 px-2 text-xs"
                          onClick={() => handlePortionChange(index, opt.value)}
                        >
                          {opt.label}인분
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* g 입력칸 */}
                  <div>
                    <label className="text-xs text-muted-foreground">또는 중량 (g)</label>
                    <Input
                      type="number"
                      placeholder="예: 300"
                      value={food.grams ?? ""}
                      onChange={(e) => handleGramsChange(index, e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 안내 문구 + 저장 버튼 */}
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground text-center mb-3">
              저장하면 AI가 영양정보를 자동 계산해요
            </p>
            <Button 
              className="w-full h-12" 
              onClick={onSave}
              disabled={saving || analyzedFoods.length === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI 분석 및 저장 중...
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
