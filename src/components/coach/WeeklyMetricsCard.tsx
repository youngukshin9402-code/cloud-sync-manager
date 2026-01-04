/**
 * 코치 대시보드용 - 배정 사용자 7일 지표 카드
 * 지표 기준: 일요일 시작 ~ 토요일 종료 (지난 7일)
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Droplets, Scale, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';

interface UserMetrics {
  avgCalories: number;
  avgWater: number;
  currentWeight: number | null;
  exerciseDays: number;
}

interface WeeklyMetricsCardProps {
  userId: string;
  nickname: string;
}

// D-7 ~ D-1 기간 계산 (오늘 제외, 지난 7일)
function getLast7DaysRange() {
  const today = new Date();
  // D-7: 7일 전
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7);
  // D-1: 1일 전 (어제)
  const endDate = new Date(today);
  endDate.setDate(today.getDate() - 1);
  
  return {
    start: format(startDate, 'yyyy-MM-dd'),
    end: format(endDate, 'yyyy-MM-dd'),
  };
}

export function WeeklyMetricsCard({ userId, nickname }: WeeklyMetricsCardProps) {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      const { start: weekStart, end: weekEnd } = getLast7DaysRange();

      try {
        // 1. 식사 기록 - 7일간 평균 칼로리
        const { data: meals } = await supabase
          .from('meal_records')
          .select('total_calories, date')
          .eq('user_id', userId)
          .gte('date', weekStart)
          .lte('date', weekEnd);

        // 2. 물 기록 - 7일간 평균 수분 섭취량
        const { data: waterLogs } = await supabase
          .from('water_logs')
          .select('amount, date')
          .eq('user_id', userId)
          .gte('date', weekStart)
          .lte('date', weekEnd);

        // 3. 현재 체중 - nutrition_settings에서 가져오기 (실시간 반영)
        const { data: nutritionSettings } = await supabase
          .from('nutrition_settings')
          .select('current_weight')
          .eq('user_id', userId)
          .single();

        // 4. 운동 기록 - 7일간 운동한 '날짜 수' (하루 최대 1회만 카운트)
        // 같은 날짜에 여러 기록이 있어도 1일로만 계산
        const { data: exercises } = await supabase
          .from('gym_records')
          .select('date')
          .eq('user_id', userId)
          .gte('date', weekStart)
          .lte('date', weekEnd);

        // 칼로리 평균 계산 (날짜별로 합산 후 평균)
        const caloriesByDate = new Map<string, number>();
        (meals || []).forEach(meal => {
          const date = meal.date;
          const current = caloriesByDate.get(date) || 0;
          caloriesByDate.set(date, current + (meal.total_calories || 0));
        });
        
        let avgCalories = 0;
        if (caloriesByDate.size > 0) {
          const totalCalories = Array.from(caloriesByDate.values()).reduce((a, b) => a + b, 0);
          avgCalories = Math.round(totalCalories / caloriesByDate.size);
        }

        // 물 평균 계산 (날짜별로 합산 후 평균)
        const waterByDate = new Map<string, number>();
        (waterLogs || []).forEach(log => {
          const date = log.date;
          const current = waterByDate.get(date) || 0;
          waterByDate.set(date, current + (log.amount || 0));
        });
        
        let avgWater = 0;
        if (waterByDate.size > 0) {
          const totalWater = Array.from(waterByDate.values()).reduce((a, b) => a + b, 0);
          avgWater = Math.round(totalWater / waterByDate.size);
        }

        // 현재 체중
        const currentWeight = nutritionSettings?.current_weight 
          ? Number(nutritionSettings.current_weight) 
          : null;

        // 운동 일수 (unique dates) - 같은 날짜에 여러 기록이 있어도 1일로만 카운트
        const uniqueExerciseDates = new Set((exercises || []).map(e => e.date));
        const exerciseDays = uniqueExerciseDates.size;

        setMetrics({
          avgCalories,
          avgWater,
          currentWeight,
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

        {/* 평균 수분 섭취량 */}
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <Droplets className="w-4 h-4 mx-auto text-blue-500 mb-1" />
          <p className="text-xs text-muted-foreground">물</p>
          <p className="font-semibold text-sm">{metrics.avgWater}ml</p>
        </div>

        {/* 현재 체중 (nutrition_settings에서) */}
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <Scale className="w-4 h-4 mx-auto text-purple-500 mb-1" />
          <p className="text-xs text-muted-foreground">체중</p>
          <p className="font-semibold text-sm">
            {metrics.currentWeight ? `${metrics.currentWeight}kg` : '-'}
          </p>
        </div>

        {/* 운동 일수 */}
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <Dumbbell className="w-4 h-4 mx-auto text-green-500 mb-1" />
          <p className="text-xs text-muted-foreground">운동</p>
          <p className="font-semibold text-sm">{metrics.exerciseDays}일</p>
        </div>
      </div>
    </div>
  );
}
