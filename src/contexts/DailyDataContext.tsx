import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  getWaterLogs,
  setWaterLogs,
  getWaterSettings,
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
  WaterLog,
  MealRecord,
  PointHistory,
  DailyMission,
} from "@/lib/localStorage";

interface DailyDataContextType {
  // Water
  todayWater: number;
  waterGoal: number;
  addWater: (amount: number) => void;
  refreshWater: () => void;

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
  const today = getTodayString();

  const [todayWater, setTodayWater] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2000);
  const [todayCalories, setTodayCalories] = useState(0);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [todayMissions, setTodayMissions] = useState<DailyMission | null>(null);
  const [hasTodayPointsAwarded, setHasTodayPointsAwarded] = useState(false);

  // Initialize data
  useEffect(() => {
    refreshWater();
    refreshCalories();
    refreshPoints();
    refreshMissions();
  }, []);

  // Water functions
  const refreshWater = useCallback(() => {
    const logs = getWaterLogs();
    const todayTotal = logs
      .filter((log) => log.date === today)
      .reduce((sum, log) => sum + log.amount, 0);
    setTodayWater(todayTotal);
    setWaterGoal(getWaterSettings().dailyGoal);
  }, [today]);

  const addWater = useCallback((amount: number) => {
    const logs = getWaterLogs();
    const newLog: WaterLog = {
      id: generateId(),
      date: today,
      amount,
      timestamp: new Date().toISOString(),
    };
    setWaterLogs([...logs, newLog]);
    setTodayWater((prev) => prev + amount);
  }, [today]);

  // Calories functions
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

  // Points functions
  const refreshPoints = useCallback(() => {
    setCurrentPoints(getPoints());
    // Check if today's points already awarded
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

  // Missions functions
  const refreshMissions = useCallback(() => {
    const missions = getDailyMissions();
    const todayMission = missions.find((m) => m.date === today);
    setTodayMissions(todayMission || null);

    // Check if points already awarded
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

    // Check if already awarded today
    const history = getPointHistory();
    const alreadyAwardedToday = history.some(
      (h) => h.date === today && h.reason === "일일 미션 완료"
    );

    // Award points if all completed and not already awarded
    if (allCompleted && !todayMissions.pointsAwarded && !alreadyAwardedToday) {
      updatedTodayMission.pointsAwarded = true;
      addPoints(100, "일일 미션 완료");
    } else if (allCompleted && !todayMissions.pointsAwarded && alreadyAwardedToday) {
      updatedTodayMission.pointsAwarded = true;
    }

    setTodayMissions(updatedTodayMission);

    // Save to localStorage
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

  return (
    <DailyDataContext.Provider
      value={{
        todayWater,
        waterGoal,
        addWater,
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
