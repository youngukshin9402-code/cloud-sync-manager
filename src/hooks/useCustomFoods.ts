/**
 * Custom Foods Hook
 * - 사용자 커스텀 음식 관리
 * - 검색 기능 포함
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CustomFood {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  createdAt: string;
}

export function useCustomFoods() {
  const { user } = useAuth();
  const [foods, setFoods] = useState<CustomFood[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setFoods([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('custom_foods')
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
        createdAt: row.created_at || '',
      })));
    } catch (err) {
      console.error('Error fetching custom foods:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const add = useCallback(async (input: {
    name: string;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  }): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('custom_foods')
        .insert({
          user_id: user.id,
          name: input.name,
          calories: input.calories,
          carbs: input.carbs,
          protein: input.protein,
          fat: input.fat,
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
        createdAt: data.created_at || '',
      }, ...prev]);

      return true;
    } catch (err) {
      console.error('Error adding custom food:', err);
      return false;
    }
  }, [user]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('custom_foods')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setFoods(prev => prev.filter(f => f.id !== id));
      return true;
    } catch (err) {
      console.error('Error removing custom food:', err);
      return false;
    }
  }, [user]);

  const search = useCallback((query: string): CustomFood[] => {
    if (!query.trim()) return foods.slice(0, 10);
    
    const lowerQuery = query.toLowerCase();
    return foods.filter(food => 
      food.name.toLowerCase().includes(lowerQuery)
    );
  }, [foods]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    foods,
    loading,
    add,
    remove,
    search,
    refetch: fetch,
  };
}
