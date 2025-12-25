/**
 * Nutrition Settings Hook
 * - nutrition_settings 테이블에서 사용자 설정 관리
 * - 목표 칼로리/매크로 자동 계산
 * - stale-while-revalidate 캐시로 플리커 방지
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateNutritionGoals, NutritionGoals } from '@/lib/nutritionUtils';

export interface NutritionSettingsData {
  userId: string;
  age: number | null;
  heightCm: number | null;
  currentWeight: number | null;
  goalWeight: number | null;
  conditions: string[] | null;
  gender: string | null;
  activityLevel: string | null;
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
  conditions?: string[];
  gender?: string;
  activityLevel?: string;
}

const DEFAULT_GOALS: NutritionGoals = {
  calorieGoal: 2000,
  carbGoalG: 300,
  proteinGoalG: 100,
  fatGoalG: 44,
};

// Stale-while-revalidate 캐시 (앱 전역)
const nutritionSettingsCache = new Map<string, { settings: NutritionSettingsData | null; cachedAt: number }>();

export function useNutritionSettings() {
  const { user } = useAuth();
  const queryKey = `nutritionSettings:${user?.id || 'anon'}`;
  
  // 캐시에서 초기값 가져오기
  const cachedEntry = nutritionSettingsCache.get(queryKey);
  const initialSettings = cachedEntry?.settings || null;
  const hasCachedData = !!cachedEntry;
  
  const [settings, setSettings] = useState<NutritionSettingsData | null>(initialSettings);
  // 캐시가 있으면 loading=false로 시작 (stale-while-revalidate)
  const [loading, setLoading] = useState(!hasCachedData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    // 캐시가 없을 때만 로딩 표시
    if (!nutritionSettingsCache.has(queryKey)) {
      setLoading(true);
    }
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('nutrition_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!isMountedRef.current) return;

      if (data) {
        const newSettings: NutritionSettingsData = {
          userId: data.user_id,
          age: data.age,
          heightCm: data.height_cm,
          currentWeight: data.current_weight ? Number(data.current_weight) : null,
          goalWeight: data.goal_weight ? Number(data.goal_weight) : null,
          conditions: (data as any).conditions || null,
          gender: (data as any).gender || null,
          activityLevel: (data as any).activity_level || null,
          calorieGoal: data.calorie_goal || DEFAULT_GOALS.calorieGoal,
          carbGoalG: data.carb_goal_g || DEFAULT_GOALS.carbGoalG,
          proteinGoalG: data.protein_goal_g || DEFAULT_GOALS.proteinGoalG,
          fatGoalG: data.fat_goal_g || DEFAULT_GOALS.fatGoalG,
          updatedAt: data.updated_at || new Date().toISOString(),
        };
        
        // 캐시 업데이트
        nutritionSettingsCache.set(queryKey, { settings: newSettings, cachedAt: Date.now() });
        setSettings(newSettings);
      } else {
        // 설정 없음 - null로 캐시
        nutritionSettingsCache.set(queryKey, { settings: null, cachedAt: Date.now() });
        setSettings(null);
      }
    } catch (err) {
      console.error('Error fetching nutrition settings:', err);
      if (isMountedRef.current) {
        setError('설정을 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, queryKey]);

  // 설정 저장 (upsert)
  const save = useCallback(async (input: NutritionSettingsInput): Promise<boolean> => {
    if (!user) return false;

    setSaving(true);
    setError(null);

    try {
      // 목표 자동 계산 (성별, 활동수준 포함)
      const goals = calculateNutritionGoals({
        age: input.age,
        heightCm: input.heightCm,
        currentWeight: input.currentWeight,
        goalWeight: input.goalWeight,
        gender: input.gender,
        activityLevel: input.activityLevel,
      });

      const upsertData: any = {
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
      };
      
      if (input.conditions !== undefined) {
        upsertData.conditions = input.conditions;
      }
      if (input.gender !== undefined) {
        upsertData.gender = input.gender;
      }
      if (input.activityLevel !== undefined) {
        upsertData.activity_level = input.activityLevel;
      }

      const { error: upsertError } = await supabase
        .from('nutrition_settings')
        .upsert(upsertData, {
          onConflict: 'user_id',
        });

      if (upsertError) throw upsertError;

      const newSettings: NutritionSettingsData = {
        userId: user.id,
        age: input.age || null,
        heightCm: input.heightCm || null,
        currentWeight: input.currentWeight || null,
        goalWeight: input.goalWeight || null,
        conditions: input.conditions ?? settings?.conditions ?? null,
        gender: input.gender ?? settings?.gender ?? null,
        activityLevel: input.activityLevel ?? settings?.activityLevel ?? null,
        ...goals,
        updatedAt: new Date().toISOString(),
      };
      
      // 즉시 캐시 및 상태 업데이트
      nutritionSettingsCache.set(queryKey, { settings: newSettings, cachedAt: Date.now() });
      setSettings(newSettings);

      return true;
    } catch (err) {
      console.error('Error saving nutrition settings:', err);
      setError('설정 저장 중 오류가 발생했습니다.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, queryKey]);

  // 목표값 반환 (설정 없으면 기본값, 단 loading 중이고 캐시가 없으면 null 반환)
  const getGoals = useCallback((): NutritionGoals | null => {
    // 로딩 중이고 캐시도 없으면 null (기본값 사용하지 않음)
    if (loading && !settings) return null;
    if (!settings) return DEFAULT_GOALS;
    return {
      calorieGoal: settings.calorieGoal,
      carbGoalG: settings.carbGoalG,
      proteinGoalG: settings.proteinGoalG,
      fatGoalG: settings.fatGoalG,
    };
  }, [settings, loading]);

  // 설정이 있는지 확인
  const hasSettings = settings !== null && 
    settings.currentWeight !== null && 
    settings.currentWeight > 0;

  useEffect(() => {
    isMountedRef.current = true;
    fetch();
    return () => {
      isMountedRef.current = false;
    };
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
