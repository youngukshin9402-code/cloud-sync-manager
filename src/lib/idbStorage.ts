/**
 * IndexedDB storage utilities using idb-keyval
 * Replaces localStorage for large data to avoid quota issues and main thread blocking
 */
import { get, set, del, keys, createStore } from 'idb-keyval';

// Create dedicated stores for different data types
const gymStore = createStore('yanggaeng-gym', 'gym-records');
const pendingStore = createStore('yanggaeng-pending', 'pending-queue');

// ========================
// Gym Records Storage
// ========================

export interface GymRecordHeader {
  id: string;
  date: string;
  exerciseCount: number;
  created_at: string;
}

export interface GymRecordFull {
  id: string;
  localId?: string;
  date: string;
  exercises: Array<{
    id: string;
    name: string;
    sets: Array<{ reps: number; weight: number }>;
    imageUrl?: string;
  }>;
  created_at: string;
}

/**
 * Get gym record headers for a month (lightweight)
 */
export async function getGymMonthHeaders(month: string): Promise<GymRecordHeader[]> {
  try {
    const data = await get<GymRecordHeader[]>(`headers:${month}`, gymStore);
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Set gym record headers for a month
 */
export async function setGymMonthHeaders(month: string, headers: GymRecordHeader[]): Promise<void> {
  try {
    await set(`headers:${month}`, headers, gymStore);
  } catch (err) {
    console.warn('[IDB] Failed to save gym headers:', err);
  }
}

/**
 * Get full gym record for a specific date
 */
export async function getGymRecordByDate(dateStr: string): Promise<GymRecordFull | null> {
  try {
    const data = await get<GymRecordFull>(`record:${dateStr}`, gymStore);
    return data || null;
  } catch {
    return null;
  }
}

/**
 * Set full gym record for a specific date
 */
export async function setGymRecordByDate(dateStr: string, record: GymRecordFull): Promise<void> {
  try {
    await set(`record:${dateStr}`, record, gymStore);
  } catch (err) {
    console.warn('[IDB] Failed to save gym record:', err);
  }
}

/**
 * Delete gym record for a specific date
 */
export async function deleteGymRecordByDate(dateStr: string): Promise<void> {
  try {
    await del(`record:${dateStr}`, gymStore);
  } catch (err) {
    console.warn('[IDB] Failed to delete gym record:', err);
  }
}

// ========================
// Pending Queue Storage
// ========================

export type PendingType = 'meal_record' | 'gym_record';

export interface PendingItem {
  localId: string;
  type: PendingType;
  data: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

const PENDING_KEY = 'pending_queue';

/**
 * Get all pending items from IndexedDB
 */
export async function getPendingQueue(): Promise<PendingItem[]> {
  try {
    const data = await get<PendingItem[]>(PENDING_KEY, pendingStore);
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Save pending queue to IndexedDB
 */
export async function savePendingQueue(queue: PendingItem[]): Promise<void> {
  try {
    await set(PENDING_KEY, queue, pendingStore);
  } catch (err) {
    console.warn('[IDB] Failed to save pending queue:', err);
  }
}

/**
 * Clear pending queue
 */
export async function clearPendingQueue(): Promise<void> {
  try {
    await del(PENDING_KEY, pendingStore);
  } catch (err) {
    console.warn('[IDB] Failed to clear pending queue:', err);
  }
}

// ========================
// Migration from localStorage
// ========================

/**
 * Migrate old localStorage data to IndexedDB (run once on app start)
 */
export async function migrateLocalStorageToIDB(): Promise<void> {
  try {
    // Migrate pending queue
    const oldPending = localStorage.getItem('yanggaeng_pending_queue');
    if (oldPending) {
      const parsed = JSON.parse(oldPending) as PendingItem[];
      if (parsed.length > 0) {
        await savePendingQueue(parsed);
      }
      localStorage.removeItem('yanggaeng_pending_queue');
    }

    // Clean up old gym records from localStorage (they're too large)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('yanggaeng_gym_records')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    });
  } catch (err) {
    console.warn('[IDB Migration] Failed:', err);
  }
}
