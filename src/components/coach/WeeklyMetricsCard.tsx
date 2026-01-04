/**
 * 코치 대시보드용 - 배정 사용자 지표 카드
 * 체중: 내정보수정(nutrition_settings)의 current_weight
 * 운동: D-7 ~ D-1 기간 동안 운동한 날짜 수
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Scale, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';

interface UserMetrics {
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
        // 1. 현재 체중 - nutrition_settings에서 가져오기 (내정보수정의 현재 체중)
        // maybeSingle() 사용하여 데이터가 없어도 에러 발생하지 않음
        const { data: nutritionSettings, error: nutritionError } = await supabase
          .from('nutrition_settings')
          .select('current_weight')
          .eq('user_id', userId)
          .maybeSingle();

        if (nutritionError) {
          console.error('Error fetching nutrition settings:', nutritionError);
        }

        // 2. 운동 기록 - D-7 ~ D-1 기간 동안 운동한 '날짜 수' (하루 최대 1회만 카운트)
        const { data: exercises, error: exerciseError } = await supabase
          .from('gym_records')
          .select('date')
          .eq('user_id', userId)
          .gte('date', weekStart)
          .lte('date', weekEnd);

        if (exerciseError) {
          console.error('Error fetching gym records:', exerciseError);
        }

        // 현재 체중 (nutrition_settings.current_weight)
        const currentWeight = nutritionSettings?.current_weight 
          ? Number(nutritionSettings.current_weight) 
          : null;

        // 운동 일수 (unique dates) - 같은 날짜에 여러 기록이 있어도 1일로만 카운트
        const uniqueExerciseDates = new Set((exercises || []).map(e => e.date));
        const exerciseDays = uniqueExerciseDates.size;

        setMetrics({
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
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="font-medium text-sm mb-3">{nickname}</p>
      <div className="grid grid-cols-2 gap-3">
        {/* 현재 체중 (내정보수정 > 현재 체중) */}
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Scale className="w-5 h-5 mx-auto text-purple-500 mb-1" />
          <p className="text-xs text-muted-foreground">체중</p>
          <p className="font-semibold text-base">
            {metrics.currentWeight ? `${metrics.currentWeight}kg` : '-'}
          </p>
        </div>

        {/* 운동 일수 (D-7 ~ D-1) */}
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Dumbbell className="w-5 h-5 mx-auto text-green-500 mb-1" />
          <p className="text-xs text-muted-foreground">운동</p>
          <p className="font-semibold text-base">{metrics.exerciseDays}일</p>
        </div>
      </div>
    </div>
  );
}
