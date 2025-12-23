import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Json } from "@/integrations/supabase/types";

const MIGRATION_FLAG_KEY = "yanggaeng_migration_completed";
const OLD_MEAL_RECORDS_KEY = "yanggaeng_meal_records";
const OLD_GYM_RECORDS_KEY = "yanggaeng_gym_records";

function safeJsonParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

interface OldMealRecord {
  id: string;
  date: string;
  meal_type: string;
  foods: unknown[];
  total_calories: number;
  image_url?: string;
}

interface OldGymRecord {
  id: string;
  date: string;
  exercises: unknown[];
}

/**
 * Hook for one-time migration of local data to server
 * Policy:
 * - If server is empty and local has data → upload to server
 * - If server has data → server wins, regenerate local cache from server
 * - Mark migration as completed
 */
export function useLocalDataMigration() {
  const { user } = useAuth();
  const migrationInProgress = useRef(false);

  const getMigrationFlag = useCallback(() => {
    if (!user) return false;
    const flags = safeJsonParse<Record<string, boolean>>(
      localStorage.getItem(MIGRATION_FLAG_KEY),
      {}
    );
    return flags[user.id] === true;
  }, [user]);

  const setMigrationFlag = useCallback(() => {
    if (!user) return;
    const flags = safeJsonParse<Record<string, boolean>>(
      localStorage.getItem(MIGRATION_FLAG_KEY),
      {}
    );
    flags[user.id] = true;
    localStorage.setItem(MIGRATION_FLAG_KEY, JSON.stringify(flags));
  }, [user]);

  const migrateData = useCallback(async () => {
    if (!user || migrationInProgress.current) return;
    if (getMigrationFlag()) {
      // cleanup legacy large caches to prevent localStorage quota issues
      try {
        localStorage.removeItem(OLD_MEAL_RECORDS_KEY);
        localStorage.removeItem(OLD_GYM_RECORDS_KEY);
      } catch {
        // ignore
      }

      console.log("Migration already completed for this user");
      return;
    }

    migrationInProgress.current = true;
    console.log("Starting one-time local→server migration...");

    try {
      // Check server data
      const [mealResult, gymResult] = await Promise.all([
        supabase.from("meal_records").select("id").eq("user_id", user.id).limit(1),
        supabase.from("gym_records").select("id").eq("user_id", user.id).limit(1),
      ]);

      const serverHasMeals = (mealResult.data?.length || 0) > 0;
      const serverHasGym = (gymResult.data?.length || 0) > 0;

      // Get local data (⚠️ localStorage 값이 깨져 있어도 앱이 죽지 않게 안전 파싱)
      const localMeals = safeJsonParse<OldMealRecord[]>(
        localStorage.getItem(OLD_MEAL_RECORDS_KEY),
        []
      );
      const localGym = safeJsonParse<OldGymRecord[]>(
        localStorage.getItem(OLD_GYM_RECORDS_KEY),
        []
      );

      // Migrate meals
      if (!serverHasMeals && localMeals.length > 0) {
        console.log(`Migrating ${localMeals.length} meal records to server...`);
        for (const meal of localMeals) {
          const clientId = `migrated_${meal.id}`;
          await supabase
            .from("meal_records")
            .upsert(
              {
                user_id: user.id,
                client_id: clientId,
                date: meal.date,
                meal_type: meal.meal_type,
                foods: meal.foods as Json,
                total_calories: meal.total_calories,
                image_url: meal.image_url || null,
              },
              {
                onConflict: "user_id,client_id",
                ignoreDuplicates: true,
              }
            );
        }
        console.log("Meal migration completed");
      } else if (serverHasMeals) {
        console.log("Server has meal data, skipping local migration (server wins)");
      }

      // Migrate gym records
      if (!serverHasGym && localGym.length > 0) {
        console.log(`Migrating ${localGym.length} gym records to server...`);
        for (const gym of localGym) {
          const clientId = `migrated_${gym.id}`;
          await supabase
            .from("gym_records")
            .upsert(
              {
                user_id: user.id,
                client_id: clientId,
                date: gym.date,
                exercises: gym.exercises as Json,
              },
              {
                onConflict: "user_id,client_id",
                ignoreDuplicates: true,
              }
            );
        }
        console.log("Gym migration completed");
      } else if (serverHasGym) {
        console.log("Server has gym data, skipping local migration (server wins)");
      }

      // Clear old local data after migration
      localStorage.removeItem(OLD_MEAL_RECORDS_KEY);
      localStorage.removeItem(OLD_GYM_RECORDS_KEY);

      // Set migration flag
      setMigrationFlag();
      console.log("Migration completed successfully");
    } catch (error) {
      console.error("Migration failed:", error);
    } finally {
      migrationInProgress.current = false;
    }
  }, [user, getMigrationFlag, setMigrationFlag]);

  // Run migration on mount when online
  useEffect(() => {
    if (user && navigator.onLine && !getMigrationFlag()) {
      migrateData();
    }
  }, [user, migrateData, getMigrationFlag]);

  return {
    migrateData,
    isMigrated: getMigrationFlag(),
  };
}

