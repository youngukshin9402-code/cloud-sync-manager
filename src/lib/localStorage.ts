// Local Storage Utilities for MVP Mock Data

const STORAGE_KEYS = {
  USER: 'yanggaeng_user',
  WATER_LOGS: 'yanggaeng_water_logs',
  WATER_SETTINGS: 'yanggaeng_water_settings',
  INBODY_RECORDS: 'yanggaeng_inbody_records',
  WEIGHT_RECORDS: 'yanggaeng_weight_records',
  WEIGHT_GOAL: 'yanggaeng_weight_goal',
  HEALTH_CHECKUP: 'yanggaeng_health_checkup',
  MEAL_RECORDS: 'yanggaeng_meal_records',
  EXERCISE_LOGS: 'yanggaeng_exercise_logs',
  GYM_RECORDS: 'yanggaeng_gym_records',
  MISSIONS: 'yanggaeng_missions',
  POINTS: 'yanggaeng_points',
  POINT_HISTORY: 'yanggaeng_point_history',
  ORDERS: 'yanggaeng_orders',
  GUARDIAN_SETTINGS: 'yanggaeng_guardian_settings',
  NOTIFICATION_SETTINGS: 'yanggaeng_notification_settings',
  REMINDERS: 'yanggaeng_reminders',
};

// Generic helpers
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function removeStorageItem(key: string): void {
  localStorage.removeItem(key);
}

// User
export interface LocalUser {
  id: string;
  kakaoId?: string;
  phone?: string;
  phoneVerified: boolean;
  nickname: string;
  role: 'user' | 'guardian' | 'coach' | 'admin';
  email?: string;
}

export const getLocalUser = () => getStorageItem<LocalUser | null>(STORAGE_KEYS.USER, null);
export const setLocalUser = (user: LocalUser) => setStorageItem(STORAGE_KEYS.USER, user);
export const removeLocalUser = () => removeStorageItem(STORAGE_KEYS.USER);

// Water Logs
export interface WaterLog {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // ml
  timestamp: string;
}

export interface WaterSettings {
  dailyGoal: number; // ml
  reminderEnabled: boolean;
  reminderStart: string; // HH:mm
  reminderEnd: string; // HH:mm
  reminderInterval: number; // minutes
  eveningReminder: boolean;
}

export const getWaterLogs = () => getStorageItem<WaterLog[]>(STORAGE_KEYS.WATER_LOGS, []);
export const setWaterLogs = (logs: WaterLog[]) => setStorageItem(STORAGE_KEYS.WATER_LOGS, logs);
export const getWaterSettings = () => getStorageItem<WaterSettings>(STORAGE_KEYS.WATER_SETTINGS, {
  dailyGoal: 2000,
  reminderEnabled: false,
  reminderStart: '08:00',
  reminderEnd: '22:00',
  reminderInterval: 90,
  eveningReminder: true,
});
export const setWaterSettings = (settings: WaterSettings) => setStorageItem(STORAGE_KEYS.WATER_SETTINGS, settings);

// InBody Records
export interface InBodyRecord {
  id: string;
  date: string;
  weight: number;
  skeletalMuscle: number;
  bodyFat: number;
  bodyFatPercent: number;
  bmr: number;
  visceralFat: number;
  createdAt: string;
}

export const getInBodyRecords = () => getStorageItem<InBodyRecord[]>(STORAGE_KEYS.INBODY_RECORDS, []);
export const setInBodyRecords = (records: InBodyRecord[]) => setStorageItem(STORAGE_KEYS.INBODY_RECORDS, records);

// Weight Records
export interface WeightRecord {
  id: string;
  date: string;
  weight: number;
  createdAt: string;
}

export interface WeightGoal {
  targetWeight: number;
  targetDate: string;
  startWeight: number;
  startDate: string;
}

export const getWeightRecords = () => getStorageItem<WeightRecord[]>(STORAGE_KEYS.WEIGHT_RECORDS, []);
export const setWeightRecords = (records: WeightRecord[]) => setStorageItem(STORAGE_KEYS.WEIGHT_RECORDS, records);
export const getWeightGoal = () => getStorageItem<WeightGoal | null>(STORAGE_KEYS.WEIGHT_GOAL, null);
export const setWeightGoal = (goal: WeightGoal | null) => setStorageItem(STORAGE_KEYS.WEIGHT_GOAL, goal);

// Health Checkup
export interface HealthCheckupRecord {
  id: string;
  date: string;
  bloodSugar?: number;
  hba1c?: number;
  cholesterol?: number;
  triglyceride?: number;
  ast?: number;
  alt?: number;
  creatinine?: number;
  systolicBP?: number;
  diastolicBP?: number;
  createdAt: string;
}

export const getHealthCheckupRecords = () => getStorageItem<HealthCheckupRecord[]>(STORAGE_KEYS.HEALTH_CHECKUP, []);
export const setHealthCheckupRecords = (records: HealthCheckupRecord[]) => setStorageItem(STORAGE_KEYS.HEALTH_CHECKUP, records);

// Meal Records
export interface MealRecord {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  imageUrl?: string;
  foods: {
    name: string;
    portion: string;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  }[];
  totalCalories: number;
  createdAt: string;
}

export const getMealRecords = () => getStorageItem<MealRecord[]>(STORAGE_KEYS.MEAL_RECORDS, []);
export const setMealRecords = (records: MealRecord[]) => setStorageItem(STORAGE_KEYS.MEAL_RECORDS, records);

// Exercise Logs
export interface ExerciseLog {
  id: string;
  date: string;
  content: string;
  createdAt: string;
}

export const getExerciseLogs = () => getStorageItem<ExerciseLog[]>(STORAGE_KEYS.EXERCISE_LOGS, []);
export const setExerciseLogs = (logs: ExerciseLog[]) => setStorageItem(STORAGE_KEYS.EXERCISE_LOGS, logs);

// Gym Records
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

export interface GymRecord {
  id: string;
  date: string;
  exercises: GymExercise[];
  createdAt: string;
}

export const getGymRecords = () => getStorageItem<GymRecord[]>(STORAGE_KEYS.GYM_RECORDS, []);
export const setGymRecords = (records: GymRecord[]) => setStorageItem(STORAGE_KEYS.GYM_RECORDS, records);

// Daily Missions
export interface DailyMission {
  id: string;
  date: string;
  missions: {
    id: string;
    content: string;
    completed: boolean;
  }[];
  pointsAwarded: boolean;
}

export const getDailyMissions = () => getStorageItem<DailyMission[]>(STORAGE_KEYS.MISSIONS, []);
export const setDailyMissions = (missions: DailyMission[]) => setStorageItem(STORAGE_KEYS.MISSIONS, missions);

// Points
export interface PointHistory {
  id: string;
  date: string;
  amount: number;
  reason: string;
  type: 'earn' | 'spend';
}

export const getPoints = () => getStorageItem<number>(STORAGE_KEYS.POINTS, 0);
export const setPoints = (points: number) => setStorageItem(STORAGE_KEYS.POINTS, points);
export const getPointHistory = () => getStorageItem<PointHistory[]>(STORAGE_KEYS.POINT_HISTORY, []);
export const setPointHistory = (history: PointHistory[]) => setStorageItem(STORAGE_KEYS.POINT_HISTORY, history);

// Orders
export interface Order {
  id: string;
  date: string;
  productName: string;
  productType: 'doctor' | 'trainer' | 'nutritionist';
  price: number;
  status: 'pending' | 'paid' | 'started' | 'completed' | 'cancelled';
  paymentMethod?: string;
}

export const getOrders = () => getStorageItem<Order[]>(STORAGE_KEYS.ORDERS, []);
export const setOrders = (orders: Order[]) => setStorageItem(STORAGE_KEYS.ORDERS, orders);

// Guardian Settings
export interface GuardianSettings {
  connectedUserId?: string;
  connectedUserNickname?: string;
  permissions: {
    viewSummary: boolean;
    viewDetails: boolean;
  };
}

export const getGuardianSettings = () => getStorageItem<GuardianSettings>(STORAGE_KEYS.GUARDIAN_SETTINGS, {
  permissions: { viewSummary: true, viewDetails: false }
});
export const setGuardianSettings = (settings: GuardianSettings) => setStorageItem(STORAGE_KEYS.GUARDIAN_SETTINGS, settings);

// Notification Settings
export interface NotificationSettings {
  mealReminder: boolean;
  waterReminder: boolean;
  exerciseReminder: boolean;
  coachingReminder: boolean;
}

export const getNotificationSettings = () => getStorageItem<NotificationSettings>(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
  mealReminder: true,
  waterReminder: true,
  exerciseReminder: true,
  coachingReminder: true,
});
export const setNotificationSettings = (settings: NotificationSettings) => setStorageItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, settings);

// Reminders (scheduled notifications)
export interface Reminder {
  id: string;
  type: 'water' | 'meal' | 'exercise';
  time: string;
  enabled: boolean;
}

export const getReminders = () => getStorageItem<Reminder[]>(STORAGE_KEYS.REMINDERS, []);
export const setReminders = (reminders: Reminder[]) => setStorageItem(STORAGE_KEYS.REMINDERS, reminders);

// Clear all data (for account deletion)
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// Generate UUID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Get today's date string
export const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};
