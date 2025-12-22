/**
 * AI 식단 피드백 시트 컴포넌트
 * - 오늘 기록 기반 AI 평가
 */

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertCircle, CheckCircle, TrendingUp, Utensils } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { NutritionTotals, NutritionGoals, calculatePercentage } from "@/lib/nutritionUtils";
import { MealType, MealRecordServer } from "@/hooks/useServerSync";
import { supabase } from "@/integrations/supabase/client";

interface AIDietFeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totals: NutritionTotals;
  goals: NutritionGoals;
  recordsByMealType: Record<MealType, MealRecordServer[]>;
}

interface AIFeedback {
  summary: string;
  balanceEvaluation: string;
  improvements: string[];
  recommendations: string[];
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export function AIDietFeedbackSheet({
  open,
  onOpenChange,
  totals,
  goals,
  recordsByMealType,
}: AIDietFeedbackSheetProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasRecords = totals.totalCalories > 0;
  const caloriePercent = calculatePercentage(totals.totalCalories, goals.calorieGoal);

  const generateFeedback = async () => {
    if (!hasRecords) return;

    setLoading(true);
    setError(null);

    try {
      // 끼니별 데이터 생성
      const meals = (["breakfast", "lunch", "dinner", "snack"] as MealType[])
        .map((mealType) => {
          const records = recordsByMealType[mealType];
          if (records.length === 0) return null;
          return {
            mealType: MEAL_TYPE_LABELS[mealType],
            foods: records.flatMap((r) => r.foods.map((f) => f.name)),
            calories: records.reduce((sum, r) => sum + (r.total_calories || 0), 0),
          };
        })
        .filter(Boolean);

      const { data, error: fnError } = await supabase.functions.invoke('diet-feedback', {
        body: {
          nutritionData: {
            meals,
            totals,
            goals,
          },
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setFeedback(data.feedback);
    } catch (err) {
      console.error("AI feedback error:", err);
      setError("피드백 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 시트 열릴 때마다 새로 피드백 생성
  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && hasRecords && !loading) {
      // 시트 열릴 때 항상 새로 분석
      setFeedback(null);
      setError(null);
      generateFeedback();
    }
    if (!isOpen) {
      // 닫힐 때 상태 초기화
      setFeedback(null);
      setError(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            오늘의 식단 AI 코치 피드백
          </SheetTitle>
        </SheetHeader>

        {/* 기록 없음 */}
        {!hasRecords && (
          <div className="flex flex-col items-center justify-center h-[60%] text-center px-4">
            <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">오늘 기록이 없어요</h3>
            <p className="text-muted-foreground">
              아침/점심/저녁/간식을 추가하면
              <br />
              AI가 맞춤 피드백을 드릴게요!
            </p>
          </div>
        )}

        {/* 로딩 */}
        {hasRecords && loading && (
          <div className="flex flex-col items-center justify-center h-[60%]">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="font-medium">AI가 식단을 분석하고 있어요...</p>
          </div>
        )}

        {/* 에러 */}
        {hasRecords && error && !loading && (
          <div className="flex flex-col items-center justify-center h-[60%] text-center px-4">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={generateFeedback}>다시 시도</Button>
          </div>
        )}

        {/* 피드백 결과 */}
        {hasRecords && feedback && !loading && (
          <div className="space-y-5 pb-8 overflow-y-auto max-h-[calc(85vh-100px)]">
            {/* 칼로리 요약 */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80">오늘 섭취</span>
                <span className="text-lg font-bold">
                  {totals.totalCalories} / {goals.calorieGoal} kcal
                </span>
              </div>
              <Progress value={caloriePercent} className="h-2 bg-white/20" />
              <p className="text-sm text-white/80 mt-2">{caloriePercent}% 달성</p>
            </div>

            {/* 종합 평가 */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span className="font-semibold">종합 평가</span>
              </div>
              <p className="text-muted-foreground">{feedback.summary}</p>
            </div>

            {/* 탄단지 균형 */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Utensils className="w-5 h-5 text-primary" />
                <span className="font-semibold">탄단지 균형 평가</span>
              </div>
              <p className="text-muted-foreground text-sm mb-3">{feedback.balanceEvaluation}</p>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-bold text-primary">{totals.totalCarbs}g</div>
                  <div className="text-xs text-muted-foreground">탄수화물</div>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-bold text-primary">{totals.totalProtein}g</div>
                  <div className="text-xs text-muted-foreground">단백질</div>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-bold text-primary">{totals.totalFat}g</div>
                  <div className="text-xs text-muted-foreground">지방</div>
                </div>
              </div>
            </div>

            {/* 개선점 */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <span className="font-semibold">개선할 점</span>
              </div>
              <ul className="space-y-2">
                {feedback.improvements.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 추천 */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-semibold">오늘 추천</span>
              </div>
              <ul className="space-y-2">
                {feedback.recommendations.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 다시 분석 버튼 */}
            <Button
              variant="outline"
              className="w-full"
              onClick={generateFeedback}
              disabled={loading}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              다시 분석하기
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
