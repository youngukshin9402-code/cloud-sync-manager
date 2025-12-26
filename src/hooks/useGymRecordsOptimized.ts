/**
 * Optimized Gym Records Hook
 * - Month view: fetches only headers (id, date, created_at) - no exercises
 * - Day view: fetches full record on demand
 * - Uses IndexedDB for caching instead of localStorage
 * - Stale-while-revalidate pattern for faster perceived loading
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';
import {
  GymRecordHeader,
  GymRecordFull,
  getGymMonthHeaders,
  setGymMonthHeaders,
  getGymRecordByDate,
  setGymRecordByDate,
} from '@/lib/idbStorage';

export interface GymSet {
  reps: number;
  weight: number;
}

export interface GymExercise {
  id: string;
  name: string;
  sets: GymSet[];
  imageUrl?: string;
  images?: string[];    // 사진 경로 목록
  duration?: number;    // 총 운동시간 (분)
  memo?: string;        // 메모
}

export interface GymRecordServer {
  id: string;
  localId?: string;
  date: string;
  exercises: GymExercise[];
  created_at: string;
}

// Parse server row to typed record
function parseGymRecord(row: {
  id: string;
  date: string;
  exercises: Json;
  created_at: string | null;
}): GymRecordServer {
  return {
    id: row.id,
    date: row.date,
    exercises: (Array.isArray(row.exercises) ? row.exercises : []) as unknown as GymExercise[],
    created_at: row.created_at || new Date().toISOString(),
  };
}

/**
 * Hook for month headers (lightweight calendar view)
 */
export function useGymMonthHeaders(month: string) {
  const { user } = useAuth();
  const [headers, setHeaders] = useState<GymRecordHeader[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHeaders = useCallback(async () => {
    if (!user) {
      setHeaders([]);
      setLoading(false);
      return;
    }

    // 1. Show cached first (stale-while-revalidate)
    const cached = await getGymMonthHeaders(month);
    if (cached.length > 0) {
      setHeaders(cached);
      setLoading(false);
    }

    // 2. Fetch fresh from server (only id, date, created_at - no exercises!)
    const monthStart = new Date(`${month}-01T00:00:00`);
    const rangeStart = format(startOfMonth(monthStart), 'yyyy-MM-dd');
    const rangeEnd = format(endOfMonth(monthStart), 'yyyy-MM-dd');

    try {
      const { data, error } = await supabase
        .from('gym_records')
        .select('id,date,created_at')
        .eq('user_id', user.id)
        .gte('date', rangeStart)
        .lte('date', rangeEnd)
        .order('date', { ascending: false });

      if (error) throw error;

      const newHeaders: GymRecordHeader[] = (data || []).map(row => ({
        id: row.id,
        date: row.date,
        exerciseCount: 0, // We don't have this info from header query
        created_at: row.created_at || new Date().toISOString(),
      }));

      setHeaders(newHeaders);
      await setGymMonthHeaders(month, newHeaders);
    } catch (err) {
      console.error('Failed to fetch gym headers:', err);
      // Keep cached data if fetch fails
    } finally {
      setLoading(false);
    }
  }, [user, month]);

  useEffect(() => {
    fetchHeaders();
  }, [fetchHeaders]);

  return { headers, loading, refetch: fetchHeaders };
}

/**
 * Hook for single day's full record (with exercises)
 */
export function useGymDayRecord(dateStr: string) {
  const { user } = useAuth();
  const [record, setRecord] = useState<GymRecordServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const fetchedRef = useRef<string | null>(null);

  const fetchRecord = useCallback(async () => {
    if (!user || !dateStr) {
      setRecord(null);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches for same date
    if (fetchedRef.current === dateStr) {
      return;
    }

    setLoading(true);

    // 1. Show cached first
    const cached = await getGymRecordByDate(dateStr);
    if (cached) {
      setRecord(cached as GymRecordServer);
      setLoading(false);
    }

    // 2. Fetch fresh from server
    try {
      const { data, error } = await supabase
        .from('gym_records')
        .select('id,date,exercises,created_at')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const parsed = parseGymRecord(data);
        setRecord(parsed);
        await setGymRecordByDate(dateStr, parsed);
      } else {
        setRecord(null);
      }
      fetchedRef.current = dateStr;
    } catch (err) {
      console.error('Failed to fetch day record:', err);
    } finally {
      setLoading(false);
    }
  }, [user, dateStr]);

  useEffect(() => {
    fetchedRef.current = null; // Reset on date change
    fetchRecord();
  }, [fetchRecord]);

  // Add new record
  const add = useCallback(async (exercises: GymExercise[]) => {
    if (!user) return { error: 'Not authenticated' };
    setSyncing(true);

    try {
      const { data, error } = await supabase
        .from('gym_records')
        .insert({
          date: dateStr,
          user_id: user.id,
          exercises: exercises as unknown as Json,
        })
        .select('id,date,exercises,created_at')
        .single();

      if (error) throw error;

      const parsed = parseGymRecord(data);
      setRecord(parsed);
      await setGymRecordByDate(dateStr, parsed);

      return { data: parsed, error: null };
    } catch (err) {
      return { data: null, error: err };
    } finally {
      setSyncing(false);
    }
  }, [user, dateStr]);

  // Update existing record
  const update = useCallback(async (id: string, exercises: GymExercise[]) => {
    if (!user) return { error: 'Not authenticated' };
    setSyncing(true);

    try {
      // Don't fetch full row back - just update and use local state
      const { error } = await supabase
        .from('gym_records')
        .update({ exercises: exercises as unknown as Json })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      const updated: GymRecordServer = {
        id,
        date: dateStr,
        exercises,
        created_at: record?.created_at || new Date().toISOString(),
      };

      setRecord(updated);
      await setGymRecordByDate(dateStr, updated);

      return { data: updated, error: null };
    } catch (err) {
      return { data: null, error: err };
    } finally {
      setSyncing(false);
    }
  }, [user, dateStr, record]);

  // Add offline (for pending queue)
  const addOffline = useCallback((exercises: GymExercise[], localId: string) => {
    const newRecord: GymRecordServer = {
      id: localId,
      localId,
      date: dateStr,
      exercises,
      created_at: new Date().toISOString(),
    };

    setRecord(prev => {
      if (prev) {
        // Merge with existing
        return {
          ...prev,
          exercises: [...prev.exercises, ...exercises],
        };
      }
      return newRecord;
    });

    // Also cache to IDB
    setGymRecordByDate(dateStr, newRecord);

    return newRecord;
  }, [dateStr]);

  return {
    record,
    loading,
    syncing,
    add,
    update,
    addOffline,
    refetch: fetchRecord,
  };
}
