/**
 * Meal Sets Hook
 * - 식사 세트 관리 (아침 루틴 등)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MealFood, MealType } from '@/hooks/useServerSync';
import { Json } from '@/integrations/supabase/types';

export interface MealSet {
  id: string;
  name: string;
  mealType: MealType;
  foods: MealFood[];
  totalCalories: number;
  createdAt: string;
  updatedAt: string;
}

export function useMealSets() {
  const { user } = useAuth();
  const [sets, setSets] = useState<MealSet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setSets([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('meal_sets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setSets((data || []).map(row => ({
        id: row.id,
        name: row.name,
        mealType: row.meal_type as MealType,
        foods: (Array.isArray(row.foods) ? row.foods : []) as unknown as MealFood[],
        totalCalories: row.total_calories,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching meal sets:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const add = useCallback(async (input: {
    name: string;
    mealType: MealType;
    foods: MealFood[];
  }): Promise<boolean> => {
    if (!user) return false;

    const totalCalories = input.foods.reduce((sum, f) => sum + f.calories, 0);

    try {
      const { data, error } = await supabase
        .from('meal_sets')
        .insert({
          user_id: user.id,
          name: input.name,
          meal_type: input.mealType,
          foods: input.foods as unknown as Json,
          total_calories: totalCalories,
        })
        .select()
        .single();

      if (error) throw error;

      setSets(prev => [{
        id: data.id,
        name: data.name,
        mealType: data.meal_type as MealType,
        foods: (Array.isArray(data.foods) ? data.foods : []) as unknown as MealFood[],
        totalCalories: data.total_calories,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }, ...prev]);

      return true;
    } catch (err) {
      console.error('Error adding meal set:', err);
      return false;
    }
  }, [user]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('meal_sets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSets(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (err) {
      console.error('Error removing meal set:', err);
      return false;
    }
  }, [user]);

  const getByMealType = useCallback((mealType: MealType): MealSet[] => {
    return sets.filter(s => s.mealType === mealType);
  }, [sets]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    sets,
    loading,
    add,
    remove,
    getByMealType,
    refetch: fetch,
  };
}
