/**
 * Weekly Report Hook
 * - 주간 리포트 생성 및 조회
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';
import { NutritionGoals } from '@/lib/nutritionUtils';

export interface WeeklyReport {
  id: string;
  weekStart: string;
  weekEnd: string;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  calorieGoalRate: number;
  proteinGoalRate: number;
  topFoods: { name: string; count: number }[];
  improvements: string[];
  recommendations: string[];
  createdAt: string;
}

export function useWeeklyReport(goals: NutritionGoals) {
  const { user } = useAuth();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  // 이번 주 리포트 생성
  const generateCurrentWeekReport = useCallback(async (): Promise<WeeklyReport | null> => {
    if (!user) return null;

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    try {
      // 이번 주 meal_records 조회
      const { data: records, error } = await supabase
        .from('meal_records')
        .select('foods, total_calories, date')
        .eq('user_id', user.id)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr);

      if (error) throw error;

      if (!records || records.length === 0) {
        return null;
      }

      // 일별 집계
      const dailyData = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
      const foodCounts = new Map<string, number>();

      records.forEach(record => {
        const date = record.date;
        if (!dailyData.has(date)) {
          dailyData.set(date, { calories: 0, protein: 0, carbs: 0, fat: 0 });
        }
        const day = dailyData.get(date)!;
        day.calories += record.total_calories || 0;

        const foods = Array.isArray(record.foods) ? record.foods : [];
        foods.forEach((food: any) => {
          day.protein += food.protein || 0;
          day.carbs += food.carbs || 0;
          day.fat += food.fat || 0;

          const name = food.name?.toLowerCase();
          if (name) {
            foodCounts.set(name, (foodCounts.get(name) || 0) + 1);
          }
        });
      });

      const days = Array.from(dailyData.values());
      const dayCount = days.length || 1;

      const avgCalories = Math.round(days.reduce((s, d) => s + d.calories, 0) / dayCount);
      const avgProtein = Math.round(days.reduce((s, d) => s + d.protein, 0) / dayCount);
      const avgCarbs = Math.round(days.reduce((s, d) => s + d.carbs, 0) / dayCount);
      const avgFat = Math.round(days.reduce((s, d) => s + d.fat, 0) / dayCount);

      const calorieGoalRate = Math.round((avgCalories / goals.calorieGoal) * 100);
      const proteinGoalRate = Math.round((avgProtein / goals.proteinGoalG) * 100);

      // Top 5 음식
      const topFoods = Array.from(foodCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      // 개선 포인트
      const improvements: string[] = [];
      if (calorieGoalRate < 80) improvements.push('칼로리 섭취가 목표 대비 부족해요');
      if (calorieGoalRate > 120) improvements.push('칼로리 섭취가 목표를 초과했어요');
      if (proteinGoalRate < 80) improvements.push('단백질 섭취를 늘려보세요');

      // 추천
      const recommendations: string[] = [];
      if (proteinGoalRate < 80) {
        recommendations.push('닭가슴살, 계란, 두부 등 단백질 음식을 추가해보세요');
      }
      if (avgCarbs > goals.carbGoalG * 1.2) {
        recommendations.push('탄수화물 섭취를 조금 줄여보세요');
      }

      const reportData: WeeklyReport = {
        id: '',
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        avgCalories,
        avgProtein,
        avgCarbs,
        avgFat,
        calorieGoalRate,
        proteinGoalRate,
        topFoods,
        improvements,
        recommendations,
        createdAt: new Date().toISOString(),
      };

      return reportData;
    } catch (err) {
      console.error('Error generating weekly report:', err);
      return null;
    }
  }, [user, goals]);

  const fetch = useCallback(async () => {
    if (!user) {
      setReport(null);
      setLoading(false);
      return;
    }

    // 저장된 리포트가 있으면 불러오고, 없으면 새로 생성
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');

    try {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setReport({
          id: data.id,
          weekStart: data.week_start,
          weekEnd: data.week_end,
          avgCalories: data.avg_calories || 0,
          avgProtein: data.avg_protein || 0,
          avgCarbs: data.avg_carbs || 0,
          avgFat: data.avg_fat || 0,
          calorieGoalRate: data.calorie_goal_rate || 0,
          proteinGoalRate: data.protein_goal_rate || 0,
          topFoods: (data.top_foods as any) || [],
          improvements: (data.improvements as any) || [],
          recommendations: (data.recommendations as any) || [],
          createdAt: data.created_at,
        });
      } else {
        // 새로 생성
        const generated = await generateCurrentWeekReport();
        setReport(generated);
      }
    } catch (err) {
      console.error('Error fetching weekly report:', err);
    } finally {
      setLoading(false);
    }
  }, [user, generateCurrentWeekReport]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    report,
    loading,
    refetch: fetch,
    regenerate: generateCurrentWeekReport,
  };
}
