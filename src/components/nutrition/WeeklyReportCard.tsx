/**
 * Weekly Report Card Component
 * - 주간 리포트 요약 표시
 */

import { BarChart3, TrendingUp, TrendingDown, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { WeeklyReport } from '@/hooks/useWeeklyReport';
import { cn } from '@/lib/utils';

interface WeeklyReportCardProps {
  report: WeeklyReport | null;
  loading: boolean;
  onViewDetails?: () => void;
}

export function WeeklyReportCard({ report, loading, onViewDetails }: WeeklyReportCardProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">주간 리포트</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          이번 주 기록이 없어요. 식사를 기록하면 리포트가 생성됩니다.
        </p>
      </div>
    );
  }

  const isCalorieGood = report.calorieGoalRate >= 80 && report.calorieGoalRate <= 120;
  const isProteinGood = report.proteinGoalRate >= 80;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">주간 리포트</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {report.weekStart} ~ {report.weekEnd}
        </span>
      </div>

      {/* 목표 달성률 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">칼로리</span>
            <span className={cn(
              "text-sm font-medium",
              isCalorieGood ? "text-emerald-600" : "text-amber-600"
            )}>
              {report.calorieGoalRate}%
            </span>
          </div>
          <Progress 
            value={Math.min(report.calorieGoalRate, 100)} 
            className="h-2"
            indicatorClassName={isCalorieGood ? "bg-emerald-500" : "bg-amber-500"}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">단백질</span>
            <span className={cn(
              "text-sm font-medium",
              isProteinGood ? "text-emerald-600" : "text-amber-600"
            )}>
              {report.proteinGoalRate}%
            </span>
          </div>
          <Progress 
            value={Math.min(report.proteinGoalRate, 100)} 
            className="h-2"
            indicatorClassName={isProteinGood ? "bg-emerald-500" : "bg-amber-500"}
          />
        </div>
      </div>

      {/* 평균 섭취 */}
      <div className="bg-muted/50 rounded-xl p-3">
        <p className="text-xs text-muted-foreground mb-2">일 평균 섭취</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{report.avgCalories}</p>
            <p className="text-xs text-muted-foreground">kcal</p>
          </div>
          <div>
            <p className="text-lg font-bold">{report.avgCarbs}g</p>
            <p className="text-xs text-muted-foreground">탄수화물</p>
          </div>
          <div>
            <p className="text-lg font-bold">{report.avgProtein}g</p>
            <p className="text-xs text-muted-foreground">단백질</p>
          </div>
          <div>
            <p className="text-lg font-bold">{report.avgFat}g</p>
            <p className="text-xs text-muted-foreground">지방</p>
          </div>
        </div>
      </div>

      {/* 많이 먹은 음식 TOP */}
      {report.topFoods.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">자주 먹은 음식</p>
          <div className="flex flex-wrap gap-2">
            {report.topFoods.slice(0, 5).map((food, idx) => (
              <span
                key={idx}
                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
              >
                {food.name} ({food.count}회)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 개선 포인트 */}
      {report.improvements.length > 0 && (
        <div className="space-y-2">
          {report.improvements.map((improvement, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-sm"
            >
              <TrendingUp className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{improvement}</span>
            </div>
          ))}
        </div>
      )}

      {/* 추천 */}
      {report.recommendations.length > 0 && (
        <div className="bg-primary/5 rounded-xl p-3">
          <div className="flex items-center gap-1 text-sm font-medium text-primary mb-2">
            <Sparkles className="w-4 h-4" />
            추천
          </div>
          <ul className="space-y-1">
            {report.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-muted-foreground">
                • {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
