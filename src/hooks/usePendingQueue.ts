import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadMealImage, base64ToBlob, isBase64Image } from '@/lib/imageUpload';
import { Json } from '@/integrations/supabase/types';

// Pending item types
export type PendingType = 'meal_record' | 'gym_record';

export interface PendingItem {
  localId: string;        // UUID for dedup
  type: PendingType;
  data: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

const PENDING_KEY = 'yanggaeng_pending_queue';
const MAX_RETRIES = 3;

/**
 * Get pending queue from localStorage
 */
function getPendingQueue(): PendingItem[] {
  try {
    const stored = localStorage.getItem(PENDING_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save pending queue to localStorage
 */
function savePendingQueue(queue: PendingItem[]): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
}

/**
 * Generate UUID for local tracking
 */
function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook for managing offline pending queue with automatic sync
 */
export function usePendingQueue() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Update pending count
  const updateCount = useCallback(() => {
    const queue = getPendingQueue();
    const userQueue = user 
      ? queue.filter(item => (item.data.user_id as string) === user.id)
      : [];
    setPendingCount(userQueue.length);
  }, [user]);

  // Add item to pending queue (for offline creation)
  const addToPending = useCallback((type: PendingType, data: Record<string, unknown>): string => {
    const localId = generateLocalId();
    const queue = getPendingQueue();
    
    queue.push({
      localId,
      type,
      data: { ...data, localId },
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
    
    savePendingQueue(queue);
    updateCount();
    
    return localId;
  }, [updateCount]);

  // Remove item from pending queue
  const removeFromPending = useCallback((localId: string) => {
    const queue = getPendingQueue();
    const filtered = queue.filter(item => item.localId !== localId);
    savePendingQueue(filtered);
    updateCount();
  }, [updateCount]);

  // Check if item exists in pending queue (for dedup)
  const isPending = useCallback((localId: string): boolean => {
    const queue = getPendingQueue();
    return queue.some(item => item.localId === localId);
  }, []);

  // Upload single pending item to server
  const uploadPendingItem = useCallback(async (item: PendingItem): Promise<boolean> => {
    if (!user) return false;

    try {
      if (item.type === 'meal_record') {
        let imageUrl = item.data.image_url as string | null;
        
        // If image is base64, upload to storage first
        if (isBase64Image(imageUrl)) {
          const blob = base64ToBlob(imageUrl!);
          const { url } = await uploadMealImage(user.id, blob, item.localId);
          imageUrl = url;
        }

        const { error } = await supabase
          .from('meal_records')
          .insert({
            user_id: user.id,
            date: item.data.date as string,
            meal_type: item.data.meal_type as string,
            image_url: imageUrl,
            foods: item.data.foods as Json,
            total_calories: item.data.total_calories as number,
          });

        if (error) throw error;
      } else if (item.type === 'gym_record') {
        const { error } = await supabase
          .from('gym_records')
          .insert({
            user_id: user.id,
            date: item.data.date as string,
            exercises: item.data.exercises as Json,
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error(`Failed to upload pending item ${item.localId}:`, error);
      return false;
    }
  }, [user]);

  // Sync all pending items to server
  const syncPending = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (!user || syncingRef.current) return { success: 0, failed: 0 };
    
    syncingRef.current = true;
    setIsSyncing(true);
    
    const queue = getPendingQueue();
    const userQueue = queue.filter(item => (item.data.user_id as string) === user.id);
    
    let success = 0;
    let failed = 0;
    const remainingQueue: PendingItem[] = queue.filter(
      item => (item.data.user_id as string) !== user.id
    );

    for (const item of userQueue) {
      const uploaded = await uploadPendingItem(item);
      
      if (uploaded) {
        success++;
      } else {
        item.retryCount++;
        if (item.retryCount < MAX_RETRIES) {
          remainingQueue.push(item);
          failed++;
        } else {
          console.warn(`Dropping item ${item.localId} after ${MAX_RETRIES} retries`);
          failed++;
        }
      }
    }

    savePendingQueue(remainingQueue);
    updateCount();
    
    syncingRef.current = false;
    setIsSyncing(false);
    
    return { success, failed };
  }, [user, uploadPendingItem, updateCount]);

  // Listen for online event and auto-sync
  useEffect(() => {
    const handleOnline = async () => {
      if (navigator.onLine && user) {
        console.log('Online detected, syncing pending queue...');
        const result = await syncPending();
        if (result.success > 0) {
          console.log(`Synced ${result.success} pending items`);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    
    // Initial sync if online
    if (navigator.onLine && user) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [user, syncPending]);

  // Update count on mount and user change
  useEffect(() => {
    updateCount();
  }, [updateCount]);

  return {
    pendingCount,
    isSyncing,
    addToPending,
    removeFromPending,
    isPending,
    syncPending,
  };
}
