/**
 * 주간 영양 리포트 시트 컴포넌트
 * - 주간 식단 기반 AI 분석
 */

import { useState, useCallback, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertCircle, TrendingUp, Award, Target, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNutritionSettings } from "@/hooks/useNutritionSettings";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ko } from "date-fns/locale";

interface WeeklyNutritionReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WeeklyReport {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextWeekActions: string[];
  healthNotes: string[];
}

export function WeeklyNutritionReportSheet({
  open,
  onOpenChange,
}: WeeklyNutritionReportSheetProps) {
  const { user } = useAuth();
  const { settings, getGoals } = useNutritionSettings();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekRange, setWeekRange] = useState<string>("");

  const generateReport = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      
      setWeekRange(`${format(weekStart, "M.d", { locale: ko })} ~ ${format(weekEnd, "M.d", { locale: ko })}`);

      // 주간 식단 기록 조회
      const { data: mealRecords, error: fetchError } = await supabase
        .from("meal_records")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"));

      if (fetchError) throw fetchError;

      if (!mealRecords || mealRecords.length === 0) {
        setError("이번 주 식단 기록이 없습니다.\n식사를 기록하고 다시 시도해주세요.");
        return;
      }

      const goals = getGoals();

      // Edge Function 호출
      const { data, error: fnError } = await supabase.functions.invoke("weekly-diet-report", {
        body: {
          mealRecords,
          userProfile: {
            age: settings?.age || null,
            heightCm: settings?.heightCm || null,
            currentWeight: settings?.currentWeight || null,
            targetWeight: settings?.goalWeight || null,
            conditions: settings?.conditions || [],
          },
          goals,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setReport(data.report);
    } catch (err) {
      console.error("Weekly report error:", err);
      setError("리포트 생성 중 오류가 발생했습니다.\n다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [user, settings, getGoals]);

  // 시트 열릴 때 자동 생성
  useEffect(() => {
    if (open && !report && !loading && !error) {
      generateReport();
    }
  }, [open, report, loading, error, generateReport]);

  // 시트 닫힐 때 초기화
  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setReport(null);
      setError(null);
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    return "D";
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            주간 영양 리포트
            {weekRange && <span className="text-sm font-normal text-muted-foreground">({weekRange})</span>}
          </SheetTitle>
        </SheetHeader>

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-[60%]">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="font-medium">AI가 주간 식단을 분석하고 있어요...</p>
          </div>
        )}

        {/* 에러 */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-[60%] text-center px-4">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <p className="text-muted-foreground whitespace-pre-line mb-4">{error}</p>
            <Button onClick={generateReport}>다시 시도</Button>
          </div>
        )}

        {/* 리포트 결과 */}
        {report && !loading && (
          <div className="space-y-5 pb-8 overflow-y-auto max-h-[calc(85vh-100px)]">
            {/* 점수 카드 */}
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-5 text-white text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Award className="w-8 h-8" />
                <span className="text-5xl font-bold">{report.score}</span>
                <span className="text-2xl font-semibold bg-white/20 px-3 py-1 rounded-full">
                  {getScoreGrade(report.score)}
                </span>
              </div>
              <p className="text-white/80">이번 주 식단 점수</p>
            </div>

            {/* 종합 평가 */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-semibold">한 줄 총평</span>
              </div>
              <p className="text-muted-foreground">{report.summary}</p>
            </div>

            {/* 잘한 점 */}
            {report.strengths.length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">👍</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">좋았던 점</span>
                </div>
                <ul className="space-y-2">
                  {report.strengths.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <span className="text-emerald-800 dark:text-emerald-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 개선점 */}
            {report.improvements.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold text-amber-700 dark:text-amber-400">개선할 점</span>
                </div>
                <ul className="space-y-2">
                  {report.improvements.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span className="text-amber-800 dark:text-amber-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 다음 주 행동 추천 */}
            {report.nextWeekActions.length > 0 && (
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-primary" />
                  <span className="font-semibold">다음 주 행동 추천</span>
                </div>
                <ul className="space-y-2">
                  {report.nextWeekActions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5 font-bold">{idx + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 건강 주의사항 */}
            {report.healthNotes.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="font-semibold text-red-700 dark:text-red-400">건강 상태 기반 주의사항</span>
                </div>
                <ul className="space-y-2">
                  {report.healthNotes.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-red-500 mt-0.5">⚠</span>
                      <span className="text-red-800 dark:text-red-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 다시 분석 버튼 */}
            <Button variant="outline" className="w-full" onClick={generateReport} disabled={loading}>
              <Sparkles className="w-4 h-4 mr-2" />
              다시 분석하기
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
