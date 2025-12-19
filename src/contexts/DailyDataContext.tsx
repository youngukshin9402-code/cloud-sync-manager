import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMealRecords,
  setMealRecords,
  getPoints,
  setPoints as setPointsStorage,
  getPointHistory,
  setPointHistory,
  getDailyMissions,
  setDailyMissions as setMissionsStorage,
  getTodayString,
  generateId,
  MealRecord,
  PointHistory,
  DailyMission,
} from "@/lib/localStorage";

interface DailyDataContextType {
  // Water (서버 기반)
  todayWater: number;
  waterGoal: number;
  waterLoading: boolean;
  addWater: (amount: number) => Promise<boolean>;
  deleteWater: (logId: string, amount: number) => Promise<boolean>;
  refreshWater: () => Promise<void>;

  // Calories (서버 기반)
  todayCalories: number;
  caloriesLoading: boolean;
  addCalories: (amount: number) => void;
  removeCalories: (amount: number) => void;
  refreshCalories: () => Promise<void>;

  // Points (서버 기반)
  currentPoints: number;
  pointsLoading: boolean;
  addPoints: (amount: number, reason: string) => Promise<void>;
  refreshPoints: () => Promise<void>;

  // Missions
  todayMissions: DailyMission | null;
  toggleMission: (missionId: string) => void;
  reshuffleMissions: (newHabits: string[]) => void;
  hasTodayPointsAwarded: boolean;
}

const DailyDataContext = createContext<DailyDataContextType | undefined>(undefined);

export function DailyDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const today = getTodayString();

  // Water state (서버 기반)
  const [todayWater, setTodayWater] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2000);
  const [waterLoading, setWaterLoading] = useState(true);

  // Calories state (서버 기반)
  const [todayCalories, setTodayCalories] = useState(0);
  const [caloriesLoading, setCaloriesLoading] = useState(true);

  // Points state (서버 기반)
  const [currentPoints, setCurrentPoints] = useState(0);
  const [pointsLoading, setPointsLoading] = useState(true);

  // Missions state
  const [todayMissions, setTodayMissions] = useState<DailyMission | null>(null);
  const [hasTodayPointsAwarded, setHasTodayPointsAwarded] = useState(false);

  // ========================
  // Water Functions (서버 기반)
  // ========================
  const refreshWater = useCallback(async () => {
    if (!user) {
      setTodayWater(0);
      setWaterGoal(2000);
      setWaterLoading(false);
      return;
    }

    try {
      // Fetch today's water logs
      const { data: logsData, error: logsError } = await supabase
        .from('water_logs')
        .select('amount')
        .eq('user_id', user.id)
        .eq('date', today);

      if (logsError) throw logsError;
      
      const total = (logsData || []).reduce((sum, log) => sum + log.amount, 0);
      setTodayWater(total);

      // Fetch water settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('water_settings')
        .select('daily_goal')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settingsError && settingsData) {
        setWaterGoal(settingsData.daily_goal);
      }
    } catch (error) {
      console.error('Error fetching water data:', error);
    } finally {
      setWaterLoading(false);
    }
  }, [user, today]);

  const addWater = useCallback(async (amount: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('water_logs')
        .insert({
          user_id: user.id,
          date: today,
          amount,
          logged_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      // Optimistic update
      setTodayWater(prev => prev + amount);
      return true;
    } catch (error) {
      console.error('Error adding water:', error);
      return false;
    }
  }, [user, today]);

  const deleteWater = useCallback(async (logId: string, amount: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('water_logs')
        .delete()
        .eq('id', logId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Optimistic update
      setTodayWater(prev => Math.max(0, prev - amount));
      return true;
    } catch (error) {
      console.error('Error deleting water:', error);
      return false;
    }
  }, [user]);

  // ========================
  // Calories Functions (서버 기반)
  // ========================
  const refreshCalories = useCallback(async () => {
    if (!user) {
      setTodayCalories(0);
      setCaloriesLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('meal_records')
        .select('total_calories')
        .eq('user_id', user.id)
        .eq('date', today);

      if (error) throw error;
      
      const total = (data || []).reduce((sum, meal) => sum + (meal.total_calories || 0), 0);
      setTodayCalories(total);
    } catch (error) {
      console.error('Error fetching calories:', error);
    } finally {
      setCaloriesLoading(false);
    }
  }, [user, today]);

  const addCalories = useCallback((amount: number) => {
    setTodayCalories((prev) => prev + amount);
  }, []);

  const removeCalories = useCallback((amount: number) => {
    setTodayCalories((prev) => Math.max(0, prev - amount));
  }, []);

  // ========================
  // Points Functions (서버 기반)
  // ========================
  const refreshPoints = useCallback(async () => {
    if (!user) {
      setCurrentPoints(0);
      setPointsLoading(false);
      return;
    }

    try {
      // Get points from profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('current_points')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setCurrentPoints(profileData?.current_points || 0);

      // Check if today's points already awarded
      const { data: historyData, error: historyError } = await supabase
        .from('point_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('reason', '일일 미션 완료')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (!historyError) {
        setHasTodayPointsAwarded((historyData || []).length > 0);
      }
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setPointsLoading(false);
    }
  }, [user, today]);

  const addPoints = useCallback(async (amount: number, reason: string) => {
    if (!user) return;

    try {
      // Insert point history
      const { error: historyError } = await supabase
        .from('point_history')
        .insert({
          user_id: user.id,
          amount,
          reason,
        });

      if (historyError) throw historyError;

      // Update profile points
      const newPoints = currentPoints + amount;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ current_points: newPoints })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Optimistic update
      setCurrentPoints(newPoints);

      if (reason === "일일 미션 완료") {
        setHasTodayPointsAwarded(true);
      }
    } catch (error) {
      console.error('Error adding points:', error);
    }
  }, [user, currentPoints]);

  // ========================
  // Missions Functions
  // ========================
  const refreshMissions = useCallback(() => {
    const missions = getDailyMissions();
    const todayMission = missions.find((m) => m.date === today);
    setTodayMissions(todayMission || null);

    const history = getPointHistory();
    const alreadyAwarded = history.some(
      (h) => h.date === today && h.reason === "일일 미션 완료"
    );
    setHasTodayPointsAwarded(alreadyAwarded);
  }, [today]);

  const toggleMission = useCallback((missionId: string) => {
    if (!todayMissions) return;

    const updatedMissions = todayMissions.missions.map((m) =>
      m.id === missionId ? { ...m, completed: !m.completed } : m
    );

    const allCompleted = updatedMissions.every((m) => m.completed);
    let updatedTodayMission = { ...todayMissions, missions: updatedMissions };

    const history = getPointHistory();
    const alreadyAwardedToday = history.some(
      (h) => h.date === today && h.reason === "일일 미션 완료"
    );

    if (allCompleted && !todayMissions.pointsAwarded && !alreadyAwardedToday) {
      updatedTodayMission.pointsAwarded = true;
      addPoints(100, "일일 미션 완료");
    } else if (allCompleted && !todayMissions.pointsAwarded && alreadyAwardedToday) {
      updatedTodayMission.pointsAwarded = true;
    }

    setTodayMissions(updatedTodayMission);

    const allMissions = getDailyMissions();
    const updated = allMissions.map((m) =>
      m.date === today ? updatedTodayMission : m
    );
    setMissionsStorage(updated);

    return allCompleted && !alreadyAwardedToday && !todayMissions.pointsAwarded;
  }, [todayMissions, today, addPoints]);

  const reshuffleMissions = useCallback((newHabits: string[]) => {
    const newMission: DailyMission = {
      id: generateId(),
      date: today,
      missions: newHabits.map((content, idx) => ({
        id: `mission_${idx}_${Date.now()}`,
        content,
        completed: false,
      })),
      pointsAwarded: false,
    };

    setTodayMissions(newMission);

    const allMissions = getDailyMissions();
    const existingIndex = allMissions.findIndex((m) => m.date === today);
    if (existingIndex >= 0) {
      allMissions[existingIndex] = newMission;
    } else {
      allMissions.push(newMission);
    }
    setMissionsStorage(allMissions);
  }, [today]);

  // ========================
  // Initialize
  // ========================
  useEffect(() => {
    refreshWater();
    refreshCalories();
    refreshPoints();
    refreshMissions();
  }, [user]);

  return (
    <DailyDataContext.Provider
      value={{
        todayWater,
        waterGoal,
        waterLoading,
        addWater,
        deleteWater,
        refreshWater,
        todayCalories,
        caloriesLoading,
        addCalories,
        removeCalories,
        refreshCalories,
        currentPoints,
        pointsLoading,
        addPoints,
        refreshPoints,
        todayMissions,
        toggleMission,
        reshuffleMissions,
        hasTodayPointsAwarded,
      }}
    >
      {children}
    </DailyDataContext.Provider>
  );
}

export function useDailyData() {
  const context = useContext(DailyDataContext);
  if (context === undefined) {
    throw new Error("useDailyData must be used within a DailyDataProvider");
  }
  return context;
}
