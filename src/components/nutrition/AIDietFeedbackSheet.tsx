/**
 * AI 식단 피드백 시트 컴포넌트
 * - 오늘 기록 기반 AI 평가
 * - 점수, 냉정 평가, 권장/주의 음식, 주의사항 포함
 */

import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertCircle, CheckCircle, TrendingUp, Utensils, ThumbsUp, Ban } from "lucide-react";
import { NutritionTotals, NutritionGoals } from "@/lib/nutritionUtils";
import { MealType, MealRecordServer } from "@/hooks/useServerSync";
import { supabase } from "@/integrations/supabase/client";
import { useNutritionSettings } from "@/hooks/useNutritionSettings";

interface AIDietFeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totals: NutritionTotals;
  goals: NutritionGoals;
  recordsByMealType: Record<MealType, MealRecordServer[]>;
}

interface AIFeedback {
  score: number;
  summary: string;
  harshEvaluation: string;
  balanceEvaluation: string;
  improvements: string[];
  recommendedFoods: string[];
  cautionFoods: string[];
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

function getScoreGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  return "D";
}

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
  const { settings } = useNutritionSettings();

  const hasRecords = totals.totalCalories > 0;

  // 기록/목표가 바뀌면 새로운 분석이 필요하므로 시그니처로 추적
  const mealSignature = useMemo(() => {
    const byMeal = (['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mealType) => {
      const records = recordsByMealType[mealType] || [];
      return {
        mealType,
        count: records.length,
        calories: records.reduce((sum, r) => sum + (r.total_calories || 0), 0),
        foodsCount: records.reduce((sum, r) => sum + (r.foods?.length || 0), 0),
      };
    });

    return JSON.stringify({
      totals: {
        kcal: totals.totalCalories,
        carbs: totals.totalCarbs,
        protein: totals.totalProtein,
        fat: totals.totalFat,
      },
      goals: {
        kcal: goals.calorieGoal,
        carbs: goals.carbGoalG,
        protein: goals.proteinGoalG,
        fat: goals.fatGoalG,
      },
      byMeal,
    });
  }, [
    recordsByMealType,
    totals.totalCalories,
    totals.totalCarbs,
    totals.totalProtein,
    totals.totalFat,
    goals.calorieGoal,
    goals.carbGoalG,
    goals.proteinGoalG,
    goals.fatGoalG,
  ]);

  const lastRequestedSignatureRef = useRef<string | null>(null);

  const generateFeedback = useCallback(async () => {
    if (!hasRecords) return;

    setLoading(true);
    setError(null);

    try {
      // 끼니별 데이터 생성 (한 끼라도 있으면 분석)
      const meals = (["breakfast", "lunch", "dinner", "snack"] as MealType[])
        .map((mealType) => {
          const records = recordsByMealType[mealType];
          if (!records || records.length === 0) return null;
          return {
            mealType: MEAL_TYPE_LABELS[mealType],
            foods: records.flatMap((r) => r.foods.map((f) => f.name)),
            calories: records.reduce((sum, r) => sum + (r.total_calories || 0), 0),
          };
        })
        .filter(Boolean);

      // 사용자 프로필 데이터 구성
      const userProfile = settings ? {
        age: settings.age,
        heightCm: settings.heightCm,
        currentWeight: settings.currentWeight,
        goalWeight: settings.goalWeight,
        conditions: settings.conditions,
      } : undefined;

      const { data, error: fnError } = await supabase.functions.invoke("diet-feedback", {
        body: {
          nutritionData: {
            meals,
            totals,
            goals,
          },
          userProfile,
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
  }, [hasRecords, recordsByMealType, totals, goals, settings]);

  // 시트 닫힐 때 상태 초기화
  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      lastRequestedSignatureRef.current = null;
      setFeedback(null);
      setError(null);
      setLoading(false);
    }
  };

  // ✅ 핵심: open 상태/기록 변경을 감지해서 자동으로 재분석
  useEffect(() => {
    if (!open) return;

    // 기록 없으면 안내 화면만
    if (!hasRecords) {
      lastRequestedSignatureRef.current = null;
      setFeedback(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (loading) return;

    // 동일한 시그니처면 재호출하지 않음
    if (lastRequestedSignatureRef.current === mealSignature) return;
    lastRequestedSignatureRef.current = mealSignature;

    const t = window.setTimeout(() => {
      generateFeedback();
    }, 150);

    return () => window.clearTimeout(t);
  }, [open, hasRecords, loading, mealSignature, generateFeedback]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] h-[85dvh] rounded-t-3xl w-full max-w-[420px] mx-auto left-1/2 -translate-x-1/2 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
             <p className="text-lg font-semibold mb-2 whitespace-pre-line">
               {"피드백을 만들 수 없어요\n오늘 기록이 없어 피드백을 만들 수 없어요.\n아침/점심/저녁/간식을 추가해 주세요."}
             </p>
           </div>
         )}

         {/* 자동 분석 대기(빈 화면 방지) */}
         {hasRecords && !loading && !error && !feedback && (
           <div className="flex flex-col items-center justify-center h-[60%] text-center px-4">
             <Sparkles className="w-12 h-12 text-primary mb-4" />
             <p className="font-medium mb-3">오늘 기록을 바탕으로 피드백을 만들고 있어요…</p>
             <Button variant="outline" onClick={generateFeedback}>
               바로 분석하기
             </Button>
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
            {/* 점수 카드 */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
              <p className="text-sm text-muted-foreground mb-2">오늘의 식단 점수</p>
              <div className="flex items-center justify-center gap-3">
                <span className={`text-5xl font-bold ${getScoreColor(feedback.score)}`}>
                  {feedback.score}
                </span>
                <span className={`text-2xl font-semibold ${getScoreColor(feedback.score)}`}>
                  / 100
                </span>
                <Badge variant="outline" className={`text-lg px-3 py-1 ${getScoreColor(feedback.score)}`}>
                  {getScoreGrade(feedback.score)}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-2">{feedback.summary}</p>
            </div>

            {/* 종합 평가 (구 냉정한 평가) */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span className="font-semibold">종합 평가</span>
              </div>
              <p className="text-muted-foreground leading-relaxed break-keep">{feedback.harshEvaluation}</p>
            </div>

            {/* 탄단지 균형 */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Utensils className="w-5 h-5 text-primary" />
                <span className="font-semibold">탄단지 균형 평가</span>
              </div>
              <p className="text-muted-foreground leading-relaxed break-keep mb-3">{feedback.balanceEvaluation}</p>
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
            {feedback.improvements && feedback.improvements.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-semibold">개선할 점</span>
                </div>
                <ul className="space-y-3">
                  {feedback.improvements.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 flex-shrink-0">💡</span>
                      <p className="text-muted-foreground leading-relaxed break-keep">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 권장 음식 - 최하단으로 이동 */}
            {feedback.recommendedFoods && feedback.recommendedFoods.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ThumbsUp className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-green-700 dark:text-green-400">내일 추천 음식</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {feedback.recommendedFoods.map((food, idx) => (
                    <Badge key={idx} variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                      {food}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 주의 음식 - 최하단으로 이동 */}
            {feedback.cautionFoods && feedback.cautionFoods.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Ban className="w-5 h-5 text-red-500" />
                  <span className="font-semibold text-red-700 dark:text-red-400">줄이면 좋을 음식</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {feedback.cautionFoods.map((food, idx) => (
                    <Badge key={idx} variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">
                      {food}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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
