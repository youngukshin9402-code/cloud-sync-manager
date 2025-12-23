/**
 * Optimized Pending Queue Hook
 * - Uses IndexedDB instead of localStorage
 * - Batch upsert for gym_records
 * - Parallel upload with concurrency limit for meal_records
 * - Non-blocking background sync
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadMealImage, base64ToBlob, isBase64Image } from '@/lib/imageUpload';
import { Json } from '@/integrations/supabase/types';
import {
  PendingItem,
  PendingType,
  getPendingQueue,
  savePendingQueue,
  migrateLocalStorageToIDB,
} from '@/lib/idbStorage';

const MAX_RETRIES = 3;
const MEAL_UPLOAD_CONCURRENCY = 3;

/**
 * Generate unique local ID
 */
function generateLocalId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Process meal record uploads with concurrency limit
 */
async function uploadMealRecordsWithConcurrency(
  items: PendingItem[],
  userId: string
): Promise<{ success: string[]; failed: PendingItem[] }> {
  const success: string[] = [];
  const failed: PendingItem[] = [];

  // Process in chunks of MEAL_UPLOAD_CONCURRENCY
  for (let i = 0; i < items.length; i += MEAL_UPLOAD_CONCURRENCY) {
    const chunk = items.slice(i, i + MEAL_UPLOAD_CONCURRENCY);

    const results = await Promise.allSettled(
      chunk.map(async (item) => {
        let imagePath: string | null = null;

        // Upload image if base64
        if (isBase64Image(item.data.image_url as string | null)) {
          const blob = base64ToBlob(item.data.image_url as string);
          const result = await uploadMealImage(userId, blob, item.localId);
          imagePath = result.path;
        } else {
          imagePath = item.data.image_url as string | null;
        }

        const { error } = await supabase
          .from('meal_records')
          .upsert(
            {
              user_id: userId,
              client_id: item.localId,
              date: item.data.date as string,
              meal_type: item.data.meal_type as string,
              image_url: imagePath,
              foods: item.data.foods as Json,
              total_calories: item.data.total_calories as number,
            },
            {
              onConflict: 'user_id,client_id',
              ignoreDuplicates: false,
            }
          );

        if (error) throw error;
        return item.localId;
      })
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        success.push(result.value);
      } else {
        const failedItem = chunk[idx];
        failedItem.retryCount++;
        if (failedItem.retryCount < MAX_RETRIES) {
          failed.push(failedItem);
        }
      }
    });
  }

  return { success, failed };
}

/**
 * Batch upsert gym records
 */
async function batchUpsertGymRecords(
  items: PendingItem[],
  userId: string
): Promise<{ success: string[]; failed: PendingItem[] }> {
  if (items.length === 0) return { success: [], failed: [] };

  const payload = items.map((item) => ({
    user_id: userId,
    client_id: item.localId,
    date: item.data.date as string,
    exercises: item.data.exercises as Json,
  }));

  try {
    const { error } = await supabase
      .from('gym_records')
      .upsert(payload, {
        onConflict: 'user_id,client_id',
        ignoreDuplicates: false,
      });

    if (error) throw error;

    return {
      success: items.map((i) => i.localId),
      failed: [],
    };
  } catch (err) {
    console.error('Batch gym upsert failed:', err);
    // Mark all as failed with retry increment
    return {
      success: [],
      failed: items.map((item) => {
        item.retryCount++;
        return item.retryCount < MAX_RETRIES ? item : null;
      }).filter(Boolean) as PendingItem[],
    };
  }
}

/**
 * Hook for managing offline pending queue
 */
export function usePendingQueueOptimized() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);
  const initializedRef = useRef(false);

  // Initialize: migrate from localStorage and load count
  useEffect(() => {
    async function init() {
      if (initializedRef.current) return;
      initializedRef.current = true;

      // Migrate old localStorage data
      await migrateLocalStorageToIDB();

      // Load initial count
      if (user) {
        const queue = await getPendingQueue();
        const userQueue = queue.filter((item) => item.data.user_id === user.id);
        setPendingCount(userQueue.length);
      }
    }
    init();
  }, [user]);

  // Update pending count
  const updateCount = useCallback(async () => {
    if (!user) {
      setPendingCount(0);
      return;
    }
    const queue = await getPendingQueue();
    const userQueue = queue.filter((item) => item.data.user_id === user.id);
    setPendingCount(userQueue.length);
  }, [user]);

  // Add item to pending queue
  const addToPending = useCallback(
    async (type: PendingType, data: Record<string, unknown>): Promise<string> => {
      const localId = generateLocalId();
      const queue = await getPendingQueue();

      queue.push({
        localId,
        type,
        data: { ...data, localId, client_id: localId },
        createdAt: new Date().toISOString(),
        retryCount: 0,
      });

      await savePendingQueue(queue);
      await updateCount();

      return localId;
    },
    [updateCount]
  );

  // Remove item from pending queue
  const removeFromPending = useCallback(
    async (localId: string) => {
      const queue = await getPendingQueue();
      const filtered = queue.filter((item) => item.localId !== localId);
      await savePendingQueue(filtered);
      await updateCount();
    },
    [updateCount]
  );

  // Check if item is pending
  const isPending = useCallback(async (localId: string): Promise<boolean> => {
    const queue = await getPendingQueue();
    return queue.some((item) => item.localId === localId);
  }, []);

  // Sync all pending items to server (non-blocking)
  const syncPending = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (!user || syncingRef.current) return { success: 0, failed: 0 };

    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const queue = await getPendingQueue();
      const userQueue = queue.filter((item) => item.data.user_id === user.id);
      const otherQueue = queue.filter((item) => item.data.user_id !== user.id);

      if (userQueue.length === 0) {
        return { success: 0, failed: 0 };
      }

      // Separate by type
      const mealItems = userQueue.filter((i) => i.type === 'meal_record');
      const gymItems = userQueue.filter((i) => i.type === 'gym_record');

      // Process in parallel
      const [mealResult, gymResult] = await Promise.all([
        uploadMealRecordsWithConcurrency(mealItems, user.id),
        batchUpsertGymRecords(gymItems, user.id),
      ]);

      const totalSuccess = mealResult.success.length + gymResult.success.length;
      const totalFailed = mealResult.failed.length + gymResult.failed.length;

      // Save remaining failed items
      const remainingQueue = [...otherQueue, ...mealResult.failed, ...gymResult.failed];
      await savePendingQueue(remainingQueue);
      await updateCount();

      return { success: totalSuccess, failed: totalFailed };
    } catch (err) {
      console.error('Sync failed:', err);
      return { success: 0, failed: 0 };
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [user, updateCount]);

  // Auto-sync on online/visibility
  useEffect(() => {
    const handleSync = async () => {
      if (navigator.onLine && user && !syncingRef.current) {
        console.log('[PendingQueue] Auto-sync triggered');
        await syncPending();
      }
    };

    window.addEventListener('online', handleSync);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleSync();
    });
    window.addEventListener('focus', handleSync);

    // Initial sync
    if (navigator.onLine && user) {
      handleSync();
    }

    return () => {
      window.removeEventListener('online', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [user, syncPending]);

  return {
    pendingCount,
    isSyncing,
    addToPending,
    removeFromPending,
    isPending,
    syncPending,
  };
}

// Re-export types for backward compatibility
export type { PendingItem, PendingType };
