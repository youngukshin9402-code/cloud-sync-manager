/**
 * Recent Foods Hook
 * - 최근 기록한 음식 20개 (meal_records에서 추출)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MealFood } from '@/hooks/useServerSync';

export interface RecentFood extends MealFood {
  lastUsed: string;
  count: number;
}

export function useRecentFoods() {
  const { user } = useAuth();
  const [foods, setFoods] = useState<RecentFood[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setFoods([]);
      setLoading(false);
      return;
    }

    try {
      // 최근 30일 meal_records에서 foods 추출
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('meal_records')
        .select('foods, created_at')
        .eq('user_id', user.id)
        .gte('date', dateStr)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 음식별 사용 횟수 및 최근 사용일 집계
      const foodMap = new Map<string, RecentFood>();

      (data || []).forEach(record => {
        const recordFoods = Array.isArray(record.foods) ? record.foods : [];
        recordFoods.forEach((food: any) => {
          const key = food.name?.toLowerCase();
          if (!key) return;

          if (foodMap.has(key)) {
            const existing = foodMap.get(key)!;
            existing.count += 1;
          } else {
            foodMap.set(key, {
              name: food.name,
              calories: food.calories || 0,
              carbs: food.carbs || 0,
              protein: food.protein || 0,
              fat: food.fat || 0,
              portion: food.portion || '1인분',
              lastUsed: record.created_at || '',
              count: 1,
            });
          }
        });
      });

      // 사용 횟수로 정렬, 상위 20개
      const sorted = Array.from(foodMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      setFoods(sorted);
    } catch (err) {
      console.error('Error fetching recent foods:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    foods,
    loading,
    refetch: fetch,
  };
}
