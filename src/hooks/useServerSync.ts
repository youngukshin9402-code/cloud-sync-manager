import { useState, useEffect, useCallback } from 'react';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

// ========================
// Water Logs Hook
// ========================

export interface WaterLogServer {
  id: string;
  date: string;
  amount: number;
  logged_at: string;
}

export function useWaterLogs() {
  const { user } = useAuth();
  const [data, setData] = useState<WaterLogServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchFromServer = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: serverData, error } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false });

      if (error) throw error;
      setData(serverData || []);
      localStorage.setItem('yanggaeng_water_logs', JSON.stringify(serverData));
    } catch (error) {
      console.error('Error fetching water logs:', error);
      const cached = localStorage.getItem('yanggaeng_water_logs');
      if (cached) setData(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  const add = async (item: { date: string; amount: number }) => {
    if (!user) return { error: 'Not authenticated' };
    setSyncing(true);
    try {
      const { data: newItem, error } = await supabase
        .from('water_logs')
        .insert({ ...item, user_id: user.id, logged_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw error;
      setData(prev => [newItem, ...prev]);
      return { data: newItem, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setSyncing(false);
    }
  };

  const remove = async (id: string) => {
    if (!user) return { error: 'Not authenticated' };
    setSyncing(true);
    try {
      const { error } = await supabase
        .from('water_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setData(prev => prev.filter(item => item.id !== id));
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setSyncing(false);
    }
  };

  const getTodayTotal = (dateStr: string) => {
    return data.filter(l => l.date === dateStr).reduce((sum, l) => sum + l.amount, 0);
  };

  return { data, loading, syncing, add, remove, refetch: fetchFromServer, getTodayTotal };
}

// ========================
// Weight Records Hook
// ========================

export interface WeightRecordServer {
  id: string;
  date: string;
  weight: number;
  created_at: string;
}

export function useWeightRecords() {
  const { user } = useAuth();
  const [data, setData] = useState<WeightRecordServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchFromServer = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: serverData, error } = await supabase
        .from('weight_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setData(serverData || []);
      localStorage.setItem('yanggaeng_weight_records', JSON.stringify(serverData));
    } catch (error) {
      console.error('Error fetching weight records:', error);
      const cached = localStorage.getItem('yanggaeng_weight_records');
      if (cached) setData(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  const add = async (item: { date: string; weight: number }) => {
    if (!user) return { error: 'Not authenticated' };
    setSyncing(true);
    try {
      const { data: newItem, error } = await supabase
        .from('weight_records')
        .insert({ ...item, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setData(prev => [newItem, ...prev].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
      return { data: newItem, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setSyncing(false);
    }
  };

  return { data, loading, syncing, add, refetch: fetchFromServer };
}

// ========================
// InBody Records Hook
// ========================

export interface InBodyRecordServer {
  id: string;
  date: string;
  weight: number;
  skeletal_muscle: number | null;
  body_fat: number | null;
  body_fat_percent: number | null;
  bmr: number | null;
  visceral_fat: number | null;
  created_at: string;
}

export function useInBodyRecords() {
  const { user } = useAuth();
  const [data, setData] = useState<InBodyRecordServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchFromServer = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: serverData, error } = await supabase
        .from('inbody_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setData(serverData || []);
      localStorage.setItem('yanggaeng_inbody_records', JSON.stringify(serverData));
    } catch (error) {
      console.error('Error fetching inbody records:', error);
      const cached = localStorage.getItem('yanggaeng_inbody_records');
      if (cached) setData(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  const add = async (item: Omit<InBodyRecordServer, 'id' | 'created_at'>) => {
    if (!user) return { error: 'Not authenticated' };
    setSyncing(true);
    try {
      const { data: newItem, error } = await supabase
        .from('inbody_records')
        .insert({ ...item, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setData(prev => [newItem, ...prev].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
      return { data: newItem, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setSyncing(false);
    }
  };

  const update = async (id: string, updates: Partial<InBodyRecordServer>) => {
    if (!user) return { error: 'Not authenticated' };
    setSyncing(true);
    try {
      const { data: updated, error } = await supabase
        .from('inbody_records')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setData(prev => prev.map(item => item.id === id ? updated : item));
      return { data: updated, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setSyncing(false);
    }
  };

  const remove = async (id: string) => {
    if (!user) return { error: 'Not authenticated' };
    setSyncing(true);
    try {
      const { error } = await supabase
        .from('inbody_records')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setData(prev => prev.filter(item => item.id !== id));
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setSyncing(false);
    }
  };

  return { data, loading, syncing, add, update, remove, refetch: fetchFromServer };
}

// ========================
// Meal Records Hook
// ========================

export interface MealFood {
  name: string;
  portion: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealRecordServer {
  id: string;
  localId?: string;  // For offline tracking
  date: string;
  meal_type: MealType;
  image_url: string | null;
  foods: MealFood[];
  total_calories: number;
  created_at: string;
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

export function useMealRecords() {
  const { user } = useAuth();
  const [data, setData] = useState<MealRecordServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Helper to resolve image URLs (signed URLs for storage paths)
  const resolveImageUrl = useCallback(async (imageUrl: string | null): Promise<string | null> => {
    if (!imageUrl) return null;
    
    // base64 images - return as-is
    if (imageUrl.startsWith('data:')) return imageUrl;
    
    // Already a full URL (signed or public) - return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    
    // Storage path - generate signed URL
    try {
      const { data, error } = await supabase.storage
        .from('food-logs')
        .createSignedUrl(imageUrl, 3600); // 1 hour expiry
      
      if (error || !data?.signedUrl) {
        console.error('Failed to create signed URL:', error);
        return null;
      }
      return data.signedUrl;
    } catch (err) {
      console.error('Error resolving image URL:', err);
      return null;
    }
  }, []);

  const fetchFromServer = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: serverData, error } = await supabase
        .from('meal_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsed = (serverData || []).map(parseMealRecord);
      
      // Resolve image URLs for all records
      const withResolvedImages = await Promise.all(
        parsed.map(async (record) => ({
          ...record,
          image_url: await resolveImageUrl(record.image_url),
        }))
      );
      
      setData(withResolvedImages);
      localStorage.setItem('yanggaeng_meal_records', JSON.stringify(withResolvedImages));
    } catch (error) {
      console.error('Error fetching meal records:', error);
      const cached = localStorage.getItem('yanggaeng_meal_records');
      if (cached) setData(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }, [user, resolveImageUrl]);

  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  const add = async (
    item: Omit<MealRecordServer, 'id' | 'created_at'>,
    options?: { imageFile?: File | Blob; localId?: string }
  ) => {
    if (!user) return { error: 'Not authenticated' };
    setSyncing(true);
    
    try {
      let imageUrl = item.image_url;
      let storagePath: string | null = null;
      
      // Upload image to storage if provided
      if (options?.imageFile) {
        const { uploadMealImage } = await import('@/lib/imageUpload');
        const localId = options.localId || `upload_${Date.now()}`;
        const result = await uploadMealImage(user.id, options.imageFile, localId);
        imageUrl = result.url; // This is now a signed URL
        storagePath = result.path;
      }
      
      const { data: newItem, error } = await supabase
        .from('meal_records')
        .insert({ 
          date: item.date,
          meal_type: item.meal_type,
          image_url: storagePath || imageUrl, // Store path in DB, not signed URL
          total_calories: item.total_calories,
          user_id: user.id,
          foods: item.foods as unknown as Json
        })
        .select()
        .single();

      if (error) throw error;
      
      const parsed = parseMealRecord(newItem);
      // Use the signed URL we already have for immediate display
      parsed.image_url = imageUrl;
      setData(prev => [parsed, ...prev]);
      return { data: parsed, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setSyncing(false);
    }
  };
  
  // Add offline (saves to pending queue and localStorage cache)
  const addOffline = (item: Omit<MealRecordServer, 'id' | 'created_at'>, localId: string) => {
    const newRecord: MealRecordServer = {
      id: localId,
      localId,
      ...item,
      created_at: new Date().toISOString(),
    };
    
    setData(prev => [newRecord, ...prev]);
    
    // Save to cache
    const cached = localStorage.getItem('yanggaeng_meal_records') || '[]';
    const cachedData = JSON.parse(cached);
    cachedData.unshift(newRecord);
    localStorage.setItem('yanggaeng_meal_records', JSON.stringify(cachedData));
    
    return newRecord;
  };

  const remove = async (id: string) => {
    if (!user) return { error: 'Not authenticated' };
    setSyncing(true);
    try {
      const { error } = await supabase
        .from('meal_records')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setData(prev => prev.filter(item => item.id !== id));
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setSyncing(false);
    }
  };

  const getTodayCalories = (dateStr: string) => {
    return data.filter(r => r.date === dateStr).reduce((sum, r) => sum + r.total_calories, 0);
  };

  return { data, loading, syncing, add, addOffline, remove, refetch: fetchFromServer, getTodayCalories };
}

// ========================
// Gym Records Hook
// ========================

export interface GymSet {
  reps: number;
  weight: number;
}

export interface GymExercise {
  id: string;
  name: string;
  sets: GymSet[];
  imageUrl?: string;
}

export interface GymRecordServer {
  id: string;
  localId?: string;  // For offline tracking
  date: string;
  exercises: GymExercise[];
  created_at: string;
}

function parseGymRecord(row: {
  id: string;
  date: string;
  exercises: Json;
  created_at: string | null;
  user_id: string;
}): GymRecordServer {
  return {
    id: row.id,
    date: row.date,
    exercises: (Array.isArray(row.exercises) ? row.exercises : []) as unknown as GymExercise[],
    created_at: row.created_at || new Date().toISOString(),
  };
}

const GYM_RECORDS_CACHE_PREFIX = "yanggaeng_gym_records:";

function getGymRecordsCacheKey(month: string) {
  return `${GYM_RECORDS_CACHE_PREFIX}${month}`;
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[localStorage] setItem failed for ${key}`, err);
  }
}

function safeLocalStorageGetParsed<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useGymRecords(month?: string) {
  const { user } = useAuth();
  const activeMonth = month ?? format(new Date(), "yyyy-MM");

  const [data, setData] = useState<GymRecordServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchFromServer = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    const cacheKey = getGymRecordsCacheKey(activeMonth);

    // Legacy cache cleanup (this key can become huge and block the app with quota errors)
    try {
      localStorage.removeItem("yanggaeng_gym_records");
    } catch {
      // ignore
    }

    const monthStartDate = new Date(`${activeMonth}-01T00:00:00`);
    const rangeStart = format(startOfMonth(monthStartDate), "yyyy-MM-dd");
    const rangeEnd = format(endOfMonth(monthStartDate), "yyyy-MM-dd");

    try {
      const { data: serverData, error } = await supabase
        .from("gym_records")
        .select("id,date,exercises,created_at")
        .eq("user_id", user.id)
        .gte("date", rangeStart)
        .lte("date", rangeEnd)
        .order("date", { ascending: false });

      if (error) throw error;

      const parsed = (serverData || []).map(parseGymRecord);
      setData(parsed);
      safeLocalStorageSet(cacheKey, JSON.stringify(parsed));
    } catch (error) {
      console.error("Error fetching gym records:", error);
      const cached = safeLocalStorageGetParsed<GymRecordServer[]>(cacheKey, []);
      if (cached.length) setData(cached);
    } finally {
      setLoading(false);
    }
  }, [user, activeMonth]);

  useEffect(() => {
    setLoading(true);
    fetchFromServer();
  }, [fetchFromServer]);

  const add = async (item: { date: string; exercises: GymExercise[] }) => {
    if (!user) return { error: "Not authenticated" };
    setSyncing(true);

    const cacheKey = getGymRecordsCacheKey(activeMonth);

    try {
      const { data: newItem, error } = await supabase
        .from("gym_records")
        .insert({
          date: item.date,
          user_id: user.id,
          exercises: item.exercises as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;

      const parsed = parseGymRecord(newItem);

      setData((prev) => {
        const next = [parsed, ...prev].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        if (parsed.date.slice(0, 7) === activeMonth) {
          safeLocalStorageSet(cacheKey, JSON.stringify(next));
        }
        return next;
      });

      return { data: parsed, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setSyncing(false);
    }
  };

  // Add offline (saves to pending queue and localStorage cache)
  const addOffline = (item: { date: string; exercises: GymExercise[] }, localId: string) => {
    const newRecord: GymRecordServer = {
      id: localId,
      localId,
      ...item,
      created_at: new Date().toISOString(),
    };

    setData((prev) =>
      [newRecord, ...prev].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    );

    // Save to month-scoped cache (prevents quota issues)
    const recordMonth = item.date.slice(0, 7);
    const cacheKey = getGymRecordsCacheKey(recordMonth);
    const cachedData = safeLocalStorageGetParsed<GymRecordServer[]>(cacheKey, []);
    cachedData.unshift(newRecord);
    safeLocalStorageSet(cacheKey, JSON.stringify(cachedData));

    return newRecord;
  };

  const update = async (id: string, exercises: GymExercise[]) => {
    if (!user) return { error: "Not authenticated" };
    setSyncing(true);

    const cacheKey = getGymRecordsCacheKey(activeMonth);

    try {
      const { data: updated, error } = await supabase
        .from("gym_records")
        .update({ exercises: exercises as unknown as Json })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      const parsed = parseGymRecord(updated);

      setData((prev) => {
        const next = prev.map((item) => (item.id === id ? parsed : item));
        if (parsed.date.slice(0, 7) === activeMonth) {
          safeLocalStorageSet(cacheKey, JSON.stringify(next));
        }
        return next;
      });

      return { data: parsed, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setSyncing(false);
    }
  };

  return { data, loading, syncing, add, addOffline, update, refetch: fetchFromServer };
}

// ========================
// Orders Hook
// ========================

export type OrderStatus = 'requested' | 'pending' | 'paid' | 'coaching_started' | 'cancel_requested' | 'cancelled' | 'refunded';

export interface OrderServer {
  id: string;
  product_id: string | null;
  product_name: string;
  product_type: string;
  price: number;
  status: OrderStatus;
  payment_method: string | null;
  is_beta: boolean;
  created_at: string;
}

export function useOrdersServer() {
  const { user } = useAuth();
  const [data, setData] = useState<OrderServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchFromServer = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: serverData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(serverData || []);
      localStorage.setItem('yanggaeng_orders', JSON.stringify(serverData));
    } catch (error) {
      console.error('Error fetching orders:', error);
      const cached = localStorage.getItem('yanggaeng_orders');
      if (cached) setData(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  const add = async (item: {
    product_name: string;
    product_type: string;
    price: number;
    payment_method?: string;
  }) => {
    if (!user) return { error: 'Not authenticated' };
    setSyncing(true);
    try {
      const { data: newItem, error } = await supabase
        .from('orders')
        .insert({ 
          product_name: item.product_name,
          product_type: item.product_type,
          price: item.price,
          payment_method: item.payment_method,
          user_id: user.id,
          status: 'paid',
          is_beta: true
        })
        .select()
        .single();

      if (error) throw error;
      setData(prev => [newItem, ...prev]);
      return { data: newItem, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setSyncing(false);
    }
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    if (!user) return { error: 'Not authenticated' };
    setSyncing(true);
    try {
      const { data: updated, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setData(prev => prev.map(item => item.id === id ? updated : item));
      return { data: updated, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setSyncing(false);
    }
  };

  return { data, loading, syncing, add, updateStatus, refetch: fetchFromServer };
}
