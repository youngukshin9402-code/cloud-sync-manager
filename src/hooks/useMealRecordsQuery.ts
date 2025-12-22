/**
 * Meal Records Query Hook
 * - 단일 소스 원칙: 날짜별 meal_records 조회/저장/삭제
 * - 쿼리 키: mealRecords:{userId}:{YYYY-MM-DD}
 * - Nutrition과 Dashboard에서 동일하게 사용
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';
import { MealFood, MealType, MealRecordServer } from '@/hooks/useServerSync';
import { calculateNutritionTotals, NutritionTotals, getKSTDateString } from '@/lib/nutritionUtils';

// 쿼리 키 생성
export function getMealRecordsQueryKey(userId: string, dateStr: string): string {
  return `mealRecords:${userId}:${dateStr}`;
}

function parseMealRecord(row: {
  id: string;
  date: string;
  meal_type: string;
  image_url: string | null;
  foods: Json;
  total_calories: number | null;
  created_at: string | null;
  user_id: string;
}): MealRecordServer {
  return {
    id: row.id,
    date: row.date,
    meal_type: row.meal_type as MealType,
    image_url: row.image_url,
    foods: (Array.isArray(row.foods) ? row.foods : []) as unknown as MealFood[],
    total_calories: row.total_calories || 0,
    created_at: row.created_at || new Date().toISOString(),
  };
}

export interface UseMealRecordsQueryOptions {
  dateStr: string;
  enabled?: boolean;
  skipImageResolve?: boolean; // 이미지 URL resolve 스킵 (Dashboard용)
}

export function useMealRecordsQuery({ dateStr, enabled = true, skipImageResolve = false }: UseMealRecordsQueryOptions) {
  const { user } = useAuth();
  const [records, setRecords] = useState<MealRecordServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryKey = useMemo(() => 
    user ? getMealRecordsQueryKey(user.id, dateStr) : null, 
    [user, dateStr]
  );

  // Helper to resolve image URLs
  const resolveImageUrl = useCallback(async (imageUrl: string | null): Promise<string | null> => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('data:')) return imageUrl;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    
    try {
      const { data, error } = await supabase.storage
        .from('food-logs')
        .createSignedUrl(imageUrl, 3600);
      
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  }, []);

  // Fetch records for the date
  const fetch = useCallback(async () => {
    if (!user || !enabled) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('meal_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const parsed = (data || []).map(parseMealRecord);
      
      // skipImageResolve가 true면 이미지 resolve 스킵 (Dashboard에서 빠른 로딩)
      if (skipImageResolve) {
        setRecords(parsed);
      } else {
        // Resolve image URLs
        const withImages = await Promise.all(
          parsed.map(async (record) => ({
            ...record,
            image_url: await resolveImageUrl(record.image_url),
          }))
        );
        setRecords(withImages);
      }
    } catch (err) {
      console.error('Error fetching meal records:', err);
      setError('식사 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, dateStr, enabled, resolveImageUrl, skipImageResolve]);

  // Add a meal record
  const add = useCallback(async (
    input: {
      mealType: MealType;
      foods: MealFood[];
      totalCalories: number;
      imageFile?: File | Blob;
    }
  ): Promise<{ success: boolean; record?: MealRecordServer; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setSyncing(true);
    setError(null);

    try {
      let imageUrl: string | null = null;
      let storagePath: string | null = null;

      // Upload image if provided
      if (input.imageFile) {
        const { uploadMealImage } = await import('@/lib/imageUpload');
        const localId = `upload_${Date.now()}`;
        const result = await uploadMealImage(user.id, input.imageFile, localId);
        imageUrl = result.url;
        storagePath = result.path;
      }

      const { data: newRecord, error: insertError } = await supabase
        .from('meal_records')
        .insert({
          user_id: user.id,
          date: dateStr,
          meal_type: input.mealType,
          foods: input.foods as unknown as Json,
          total_calories: input.totalCalories,
          image_url: storagePath,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const parsed = parseMealRecord(newRecord);
      parsed.image_url = imageUrl;

      // 즉시 로컬 상태 업데이트
      setRecords(prev => [...prev, parsed]);

      return { success: true, record: parsed };
    } catch (err) {
      const errorMsg = '저장 중 오류가 발생했습니다.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setSyncing(false);
    }
  }, [user, dateStr]);

  // Remove a meal record
  const remove = useCallback(async (recordId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setSyncing(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('meal_records')
        .delete()
        .eq('id', recordId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // 즉시 로컬 상태 업데이트
      setRecords(prev => prev.filter(r => r.id !== recordId));

      return { success: true };
    } catch (err) {
      const errorMsg = '삭제 중 오류가 발생했습니다.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setSyncing(false);
    }
  }, [user]);

  // Update a meal record
  const update = useCallback(async (
    recordId: string,
    input: {
      mealType?: MealType;
      foods?: MealFood[];
      totalCalories?: number;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setSyncing(true);
    setError(null);

    try {
      const updates: Record<string, unknown> = {};
      if (input.mealType) updates.meal_type = input.mealType;
      if (input.foods) updates.foods = input.foods as unknown as Json;
      if (input.totalCalories !== undefined) updates.total_calories = input.totalCalories;

      const { data: updatedRecord, error: updateError } = await supabase
        .from('meal_records')
        .update(updates)
        .eq('id', recordId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const parsed = parseMealRecord(updatedRecord);

      // 즉시 로컬 상태 업데이트
      setRecords(prev => prev.map(r => r.id === recordId ? parsed : r));

      return { success: true };
    } catch (err) {
      const errorMsg = '수정 중 오류가 발생했습니다.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setSyncing(false);
    }
  }, [user]);

  // 총 영양소 계산 (공통 함수 사용)
  const totals: NutritionTotals = useMemo(() => {
    return calculateNutritionTotals(records);
  }, [records]);

  // 끼니별 기록
  const recordsByMealType = useMemo(() => {
    const result: Record<MealType, MealRecordServer[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const record of records) {
      result[record.meal_type].push(record);
    }
    return result;
  }, [records]);

  // 끼니별 칼로리
  const caloriesByMealType = useMemo(() => {
    const result: Record<MealType, number> = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
    };
    for (const record of records) {
      result[record.meal_type] += record.total_calories;
    }
    return result;
  }, [records]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Realtime 구독: meal_records 변경 시 즉시 반영
  useEffect(() => {
    if (!user || !enabled) return;

    const channel = supabase
      .channel(`meal_records_${user.id}_${dateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_records',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // INSERT/UPDATE/DELETE 모두 refetch로 동기화
          await fetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, dateStr, enabled, fetch]);

  return {
    records,
    loading,
    syncing,
    error,
    queryKey,
    totals,
    recordsByMealType,
    caloriesByMealType,
    add,
    remove,
    update,
    refetch: fetch,
  };
}

// 오늘 기록 전용 훅 (Dashboard에서 사용) - 이미지 resolve 스킵으로 빠른 로딩
export function useTodayMealRecords() {
  const todayStr = getKSTDateString();
  return useMealRecordsQuery({ dateStr: todayStr, skipImageResolve: true });
}
