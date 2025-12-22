/**
 * Nutrition Settings Hook
 * - nutrition_settings 테이블에서 사용자 설정 관리
 * - 목표 칼로리/매크로 자동 계산
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateNutritionGoals, NutritionGoals } from '@/lib/nutritionUtils';

export interface NutritionSettingsData {
  userId: string;
  age: number | null;
  heightCm: number | null;
  currentWeight: number | null;
  goalWeight: number | null;
  calorieGoal: number;
  carbGoalG: number;
  proteinGoalG: number;
  fatGoalG: number;
  updatedAt: string;
}

export interface NutritionSettingsInput {
  age?: number;
  heightCm?: number;
  currentWeight?: number;
  goalWeight?: number;
}

const DEFAULT_GOALS: NutritionGoals = {
  calorieGoal: 2000,
  carbGoalG: 300,
  proteinGoalG: 100,
  fatGoalG: 44,
};

export function useNutritionSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NutritionSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 쿼리 키 (React Query 스타일)
  const queryKey = `nutritionSettings:${user?.id || 'anon'}`;

  const fetch = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('nutrition_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSettings({
          userId: data.user_id,
          age: data.age,
          heightCm: data.height_cm,
          currentWeight: data.current_weight ? Number(data.current_weight) : null,
          goalWeight: data.goal_weight ? Number(data.goal_weight) : null,
          calorieGoal: data.calorie_goal || DEFAULT_GOALS.calorieGoal,
          carbGoalG: data.carb_goal_g || DEFAULT_GOALS.carbGoalG,
          proteinGoalG: data.protein_goal_g || DEFAULT_GOALS.proteinGoalG,
          fatGoalG: data.fat_goal_g || DEFAULT_GOALS.fatGoalG,
          updatedAt: data.updated_at || new Date().toISOString(),
        });
      } else {
        // 설정 없음 - null로 설정
        setSettings(null);
      }
    } catch (err) {
      console.error('Error fetching nutrition settings:', err);
      setError('설정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 설정 저장 (upsert)
  const save = useCallback(async (input: NutritionSettingsInput): Promise<boolean> => {
    if (!user) return false;

    setSaving(true);
    setError(null);

    try {
      // 목표 자동 계산
      const goals = calculateNutritionGoals({
        currentWeight: input.currentWeight,
        goalWeight: input.goalWeight,
      });

      const { error: upsertError } = await supabase
        .from('nutrition_settings')
        .upsert({
          user_id: user.id,
          age: input.age || null,
          height_cm: input.heightCm || null,
          current_weight: input.currentWeight || null,
          goal_weight: input.goalWeight || null,
          calorie_goal: goals.calorieGoal,
          carb_goal_g: goals.carbGoalG,
          protein_goal_g: goals.proteinGoalG,
          fat_goal_g: goals.fatGoalG,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) throw upsertError;

      // 로컬 상태 업데이트
      setSettings({
        userId: user.id,
        age: input.age || null,
        heightCm: input.heightCm || null,
        currentWeight: input.currentWeight || null,
        goalWeight: input.goalWeight || null,
        ...goals,
        updatedAt: new Date().toISOString(),
      });

      return true;
    } catch (err) {
      console.error('Error saving nutrition settings:', err);
      setError('설정 저장 중 오류가 발생했습니다.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user]);

  // 목표값 반환 (설정 없으면 기본값)
  const getGoals = useCallback((): NutritionGoals => {
    if (!settings) return DEFAULT_GOALS;
    return {
      calorieGoal: settings.calorieGoal,
      carbGoalG: settings.carbGoalG,
      proteinGoalG: settings.proteinGoalG,
      fatGoalG: settings.fatGoalG,
    };
  }, [settings]);

  // 설정이 있는지 확인
  const hasSettings = settings !== null && 
    settings.currentWeight !== null && 
    settings.currentWeight > 0;

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    settings,
    loading,
    saving,
    error,
    save,
    refetch: fetch,
    getGoals,
    hasSettings,
    queryKey,
  };
}
