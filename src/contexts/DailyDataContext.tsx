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

  // Calories
  todayCalories: number;
  addMeal: (meal: MealRecord) => void;
  removeMeal: (mealId: string) => void;
  refreshCalories: () => void;

  // Points
  currentPoints: number;
  addPoints: (amount: number, reason: string) => void;
  refreshPoints: () => void;

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

  // Other state (localStorage 기반)
  const [todayCalories, setTodayCalories] = useState(0);
  const [currentPoints, setCurrentPoints] = useState(0);
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
  // Calories Functions (localStorage 기반)
  // ========================
  const refreshCalories = useCallback(() => {
    const meals = getMealRecords();
    const todayMeals = meals.filter((m) => m.date === today);
    const totalCal = todayMeals.reduce((sum, m) => sum + (Number(m.totalCalories) || 0), 0);
    setTodayCalories(totalCal);
  }, [today]);

  const addMeal = useCallback((meal: MealRecord) => {
    const meals = getMealRecords();
    setMealRecords([...meals, meal]);
    if (meal.date === today) {
      setTodayCalories((prev) => prev + (Number(meal.totalCalories) || 0));
    }
  }, [today]);

  const removeMeal = useCallback((mealId: string) => {
    const meals = getMealRecords();
    const mealToRemove = meals.find((m) => m.id === mealId);
    if (mealToRemove && mealToRemove.date === today) {
      setTodayCalories((prev) => prev - (Number(mealToRemove.totalCalories) || 0));
    }
    setMealRecords(meals.filter((m) => m.id !== mealId));
  }, [today]);

  // ========================
  // Points Functions
  // ========================
  const refreshPoints = useCallback(() => {
    setCurrentPoints(getPoints());
    const history = getPointHistory();
    const alreadyAwarded = history.some(
      (h) => h.date === today && h.reason === "일일 미션 완료"
    );
    setHasTodayPointsAwarded(alreadyAwarded);
  }, [today]);

  const addPoints = useCallback((amount: number, reason: string) => {
    const current = getPoints();
    setPointsStorage(current + amount);
    setCurrentPoints(current + amount);

    const history = getPointHistory();
    setPointHistory([
      ...history,
      {
        id: generateId(),
        date: today,
        amount,
        reason,
        type: "earn",
      },
    ]);

    if (reason === "일일 미션 완료") {
      setHasTodayPointsAwarded(true);
    }
  }, [today]);

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
        addMeal,
        removeMeal,
        refreshCalories,
        currentPoints,
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
