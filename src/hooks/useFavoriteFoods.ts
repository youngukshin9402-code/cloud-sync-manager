/**
 * Favorite Foods Hook
 * - 즐겨찾기 음식 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MealFood } from '@/hooks/useServerSync';

export interface FavoriteFood extends MealFood {
  id: string;
  createdAt: string;
}

export function useFavoriteFoods() {
  const { user } = useAuth();
  const [foods, setFoods] = useState<FavoriteFood[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setFoods([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorite_foods')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFoods((data || []).map(row => ({
        id: row.id,
        name: row.name,
        calories: row.calories,
        carbs: Number(row.carbs),
        protein: Number(row.protein),
        fat: Number(row.fat),
        portion: row.portion || '1인분',
        createdAt: row.created_at,
      })));
    } catch (err) {
      console.error('Error fetching favorite foods:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const add = useCallback(async (food: MealFood): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('favorite_foods')
        .insert({
          user_id: user.id,
          name: food.name,
          calories: food.calories,
          carbs: food.carbs || 0,
          protein: food.protein || 0,
          fat: food.fat || 0,
          portion: food.portion || '1인분',
        })
        .select()
        .single();

      if (error) throw error;

      setFoods(prev => [{
        id: data.id,
        name: data.name,
        calories: data.calories,
        carbs: Number(data.carbs),
        protein: Number(data.protein),
        fat: Number(data.fat),
        portion: data.portion || '1인분',
        createdAt: data.created_at,
      }, ...prev]);

      return true;
    } catch (err) {
      console.error('Error adding favorite food:', err);
      return false;
    }
  }, [user]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('favorite_foods')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setFoods(prev => prev.filter(f => f.id !== id));
      return true;
    } catch (err) {
      console.error('Error removing favorite food:', err);
      return false;
    }
  }, [user]);

  const isFavorite = useCallback((name: string): boolean => {
    return foods.some(f => f.name.toLowerCase() === name.toLowerCase());
  }, [foods]);

  const getFavoriteId = useCallback((name: string): string | null => {
    const found = foods.find(f => f.name.toLowerCase() === name.toLowerCase());
    return found?.id || null;
  }, [foods]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    foods,
    loading,
    add,
    remove,
    isFavorite,
    getFavoriteId,
    refetch: fetch,
  };
}
