/**
 * 코치 대시보드용 - 배정 사용자 7일 지표 카드
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Beef, Scale, Dumbbell, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface UserMetrics {
  avgCalories: number;
  avgProtein: number;
  latestWeight: number | null;
  weightChange: number | null;
  exerciseDays: number;
}

interface WeeklyMetricsCardProps {
  userId: string;
  nickname: string;
}

export function WeeklyMetricsCard({ userId, nickname }: WeeklyMetricsCardProps) {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      try {
        // 식사 기록 (7일간)
        const { data: meals } = await supabase
          .from('meal_records')
          .select('foods, total_calories, date')
          .eq('user_id', userId)
          .gte('date', weekAgoStr);

        // 체중 기록 (최근 2개)
        const { data: weights } = await supabase
          .from('weight_records')
          .select('weight, date')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(2);

        // 운동 기록 (7일간 unique days)
        const { data: exercises } = await supabase
          .from('gym_records')
          .select('date')
          .eq('user_id', userId)
          .gte('date', weekAgoStr);

        // 칼로리/단백질 평균 계산
        let totalCalories = 0;
        let totalProtein = 0;
        let mealDays = new Set<string>();

        (meals || []).forEach(meal => {
          totalCalories += meal.total_calories || 0;
          mealDays.add(meal.date);
          
          const foods = meal.foods as Array<{ protein?: number }>;
          (foods || []).forEach(f => {
            totalProtein += f.protein || 0;
          });
        });

        const daysCount = Math.max(mealDays.size, 1);
        const avgCalories = Math.round(totalCalories / daysCount);
        const avgProtein = Math.round(totalProtein / daysCount);

        // 체중 변화
        let latestWeight: number | null = null;
        let weightChange: number | null = null;
        if (weights && weights.length > 0) {
          latestWeight = Number(weights[0].weight);
          if (weights.length > 1) {
            weightChange = Number(weights[0].weight) - Number(weights[1].weight);
          }
        }

        // 운동 일수
        const exerciseDays = new Set((exercises || []).map(e => e.date)).size;

        setMetrics({
          avgCalories,
          avgProtein,
          latestWeight,
          weightChange,
          exerciseDays,
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="grid grid-cols-4 gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const WeightTrend = () => {
    if (metrics.weightChange === null) return <Minus className="w-3 h-3 text-muted-foreground" />;
    if (metrics.weightChange > 0) return <TrendingUp className="w-3 h-3 text-red-500" />;
    if (metrics.weightChange < 0) return <TrendingDown className="w-3 h-3 text-green-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="font-medium text-sm mb-3">{nickname} - 최근 7일</p>
      <div className="grid grid-cols-4 gap-2">
        {/* 평균 칼로리 */}
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <Flame className="w-4 h-4 mx-auto text-orange-500 mb-1" />
          <p className="text-xs text-muted-foreground">칼로리</p>
          <p className="font-semibold text-sm">{metrics.avgCalories}</p>
        </div>

        {/* 평균 단백질 */}
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <Beef className="w-4 h-4 mx-auto text-red-500 mb-1" />
          <p className="text-xs text-muted-foreground">단백질</p>
          <p className="font-semibold text-sm">{metrics.avgProtein}g</p>
        </div>

        {/* 체중 */}
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <Scale className="w-4 h-4 mx-auto text-blue-500 mb-1" />
          <p className="text-xs text-muted-foreground">체중</p>
          <div className="flex items-center justify-center gap-1">
            <p className="font-semibold text-sm">
              {metrics.latestWeight ? `${metrics.latestWeight}kg` : '-'}
            </p>
            <WeightTrend />
          </div>
        </div>

        {/* 운동 */}
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <Dumbbell className="w-4 h-4 mx-auto text-green-500 mb-1" />
          <p className="text-xs text-muted-foreground">운동</p>
          <p className="font-semibold text-sm">{metrics.exerciseDays}일</p>
        </div>
      </div>
    </div>
  );
}
