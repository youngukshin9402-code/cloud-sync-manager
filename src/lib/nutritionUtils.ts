/**
 * 영양 관련 공통 유틸리티 함수들
 * - 단일 소스 원칙: Nutrition과 Dashboard에서 동일한 계산 함수 사용
 * - 타임존: KST(Asia/Seoul) 기준 YYYY-MM-DD 문자열 사용
 */

import { MealFood } from "@/hooks/useServerSync";

// ========================
// 날짜 유틸리티 (KST 기준)
// ========================

/**
 * 현재 KST 기준 날짜를 YYYY-MM-DD 문자열로 반환
 */
export function getKSTDateString(date: Date = new Date()): string {
  const kstOffset = 9 * 60; // KST is UTC+9
  const utcMs = date.getTime() + (date.getTimezoneOffset() * 60000);
  const kstMs = utcMs + (kstOffset * 60000);
  const kstDate = new Date(kstMs);
  
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 주어진 날짜를 YYYY-MM-DD 문자열로 변환 (KST 기준)
 */
export function formatDateToKSTString(date: Date): string {
  return getKSTDateString(date);
}

/**
 * YYYY-MM-DD 문자열을 Date 객체로 변환
 */
export function parseKSTDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 오늘 날짜인지 확인 (KST 기준)
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getKSTDateString();
}

// ========================
// 영양 목표 계산 (E-2, E-3 수식 고정)
// ========================

export interface NutritionGoals {
  calorieGoal: number;
  carbGoalG: number;
  proteinGoalG: number;
  fatGoalG: number;
}

export interface NutritionSettings {
  age?: number;
  heightCm?: number;
  currentWeight?: number;
  goalWeight?: number;
  gender?: string;
  activityLevel?: string;
}

/**
 * 활동수준에 따른 활동계수 반환
 */
function getActivityMultiplier(activityLevel?: string): number {
  switch (activityLevel) {
    case 'sedentary': return 1.2;      // 거의 활동 안함
    case 'light': return 1.375;        // 가벼운 활동 (주 1~3회)
    case 'moderate': return 1.55;      // 보통 활동 (주 3~5회)
    case 'active': return 1.725;       // 활발한 활동 (주 6~7회)
    case 'very_active': return 1.9;    // 매우 활발한 활동 (하루 2회)
    default: return 1.375;             // 기본값: 가벼운 활동
  }
}

/**
 * 목표 칼로리 및 매크로 계산 (Mifflin-St Jeor 공식 기반)
 * 
 * BMR 계산:
 * - 남성: (10 × 체중kg) + (6.25 × 키cm) − (5 × 나이) + 5
 * - 여성: (10 × 체중kg) + (6.25 × 키cm) − (5 × 나이) − 161
 * 
 * TDEE = BMR × 활동계수
 * 목표 칼로리 = TDEE + 감량/증량 조정
 */
export function calculateNutritionGoals(settings: NutritionSettings): NutritionGoals {
  const { currentWeight, goalWeight, age, heightCm, gender, activityLevel } = settings;
  
  // 기본값 (설정 없을 때)
  if (!currentWeight || currentWeight <= 0) {
    return {
      calorieGoal: 2000,
      carbGoalG: 300,
      proteinGoalG: 100,
      fatGoalG: 44,
    };
  }
  
  // BMR 계산 (Mifflin-St Jeor 공식)
  let bmr: number;
  const weight = currentWeight;
  const height = heightCm || 170; // 기본 키 170cm
  const userAge = age || 30;      // 기본 나이 30세
  
  if (gender === 'female') {
    // 여성: (10 × 체중) + (6.25 × 키) − (5 × 나이) − 161
    bmr = (10 * weight) + (6.25 * height) - (5 * userAge) - 161;
  } else {
    // 남성 또는 미지정: (10 × 체중) + (6.25 × 키) − (5 × 나이) + 5
    bmr = (10 * weight) + (6.25 * height) - (5 * userAge) + 5;
  }
  
  // TDEE = BMR × 활동계수
  const activityMultiplier = getActivityMultiplier(activityLevel);
  let calories = bmr * activityMultiplier;
  
  // 감량/증량 조정
  if (goalWeight && goalWeight < currentWeight) {
    calories -= 400; // 감량: -400kcal
  } else if (goalWeight && goalWeight > currentWeight) {
    calories += 300; // 증량: +300kcal
  }
  
  // clamp 1200~3500
  calories = Math.max(1200, Math.min(3500, calories));
  const calorieGoal = Math.round(calories);
  
  // 매크로 목표
  // 감량 시: 탄 50% / 단 30% / 지 20% (고단백)
  // 증량/유지 시: 탄 55% / 단 25% / 지 20%
  let carbRatio = 0.55;
  let proteinRatio = 0.25;
  let fatRatio = 0.20;
  
  if (goalWeight && goalWeight < currentWeight) {
    carbRatio = 0.50;
    proteinRatio = 0.30;
    fatRatio = 0.20;
  }
  
  const carbGoalG = Math.round((calories * carbRatio) / 4);
  const proteinGoalG = Math.round((calories * proteinRatio) / 4);
  const fatGoalG = Math.round((calories * fatRatio) / 9);
  
  return { calorieGoal, carbGoalG, proteinGoalG, fatGoalG };
}

// ========================
// 영양 집계 함수 (단일 소스)
// ========================

export interface NutritionTotals {
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
}

export interface MealRecordForCalc {
  total_calories: number;
  foods: MealFood[];
}

/**
 * 식사 기록에서 총 영양소 계산
 * Nutrition과 Dashboard에서 동일하게 사용
 */
export function calculateNutritionTotals(records: MealRecordForCalc[]): NutritionTotals {
  let totalCalories = 0;
  let totalCarbs = 0;
  let totalProtein = 0;
  let totalFat = 0;
  
  for (const record of records) {
    totalCalories += record.total_calories || 0;
    
    if (record.foods && Array.isArray(record.foods)) {
      for (const food of record.foods) {
        totalCarbs += food.carbs || 0;
        totalProtein += food.protein || 0;
        totalFat += food.fat || 0;
      }
    }
  }
  
  return {
    totalCalories: Math.round(totalCalories),
    totalCarbs: Math.round(totalCarbs),
    totalProtein: Math.round(totalProtein),
    totalFat: Math.round(totalFat),
  };
}

/**
 * 퍼센트 계산 (0~100 범위)
 */
export function calculatePercentage(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

/**
 * 남은 칼로리 계산
 */
export function calculateRemainingCalories(consumed: number, goal: number): number {
  return Math.max(0, goal - consumed);
}

// ========================
// 프리셋 음식 데이터
// ========================

export interface PresetFood {
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  portion: string;
}

export const PRESET_FOODS: PresetFood[] = [
  { name: "흰쌀밥", calories: 300, carbs: 65, protein: 5, fat: 1, portion: "1공기" },
  { name: "현미밥", calories: 280, carbs: 60, protein: 6, fat: 2, portion: "1공기" },
  { name: "김치찌개", calories: 150, carbs: 10, protein: 10, fat: 8, portion: "1그릇" },
  { name: "된장찌개", calories: 120, carbs: 10, protein: 8, fat: 5, portion: "1그릇" },
  { name: "불고기", calories: 250, carbs: 10, protein: 20, fat: 15, portion: "1인분" },
  { name: "삼겹살", calories: 400, carbs: 0, protein: 25, fat: 35, portion: "200g" },
  { name: "닭가슴살", calories: 165, carbs: 0, protein: 31, fat: 4, portion: "100g" },
  { name: "계란후라이", calories: 90, carbs: 1, protein: 7, fat: 7, portion: "1개" },
  { name: "삶은계란", calories: 78, carbs: 1, protein: 6, fat: 5, portion: "1개" },
  { name: "두부", calories: 80, carbs: 3, protein: 8, fat: 4, portion: "1/2모" },
  { name: "김치", calories: 20, carbs: 4, protein: 1, fat: 0, portion: "1접시" },
  { name: "배추김치", calories: 15, carbs: 3, protein: 1, fat: 0, portion: "50g" },
  { name: "라면", calories: 500, carbs: 70, protein: 10, fat: 20, portion: "1봉지" },
  { name: "치킨", calories: 350, carbs: 15, protein: 25, fat: 20, portion: "2조각" },
  { name: "피자", calories: 280, carbs: 30, protein: 12, fat: 12, portion: "1조각" },
  { name: "비빔밥", calories: 550, carbs: 85, protein: 15, fat: 15, portion: "1인분" },
  { name: "샐러드", calories: 50, carbs: 8, protein: 2, fat: 1, portion: "1접시" },
  { name: "아메리카노", calories: 5, carbs: 1, protein: 0, fat: 0, portion: "1잔" },
  { name: "카페라떼", calories: 180, carbs: 15, protein: 8, fat: 9, portion: "1잔" },
  { name: "바나나", calories: 93, carbs: 24, protein: 1, fat: 0, portion: "1개" },
  { name: "사과", calories: 72, carbs: 19, protein: 0, fat: 0, portion: "1개" },
  { name: "우유", calories: 130, carbs: 10, protein: 6, fat: 7, portion: "200ml" },
  { name: "요거트", calories: 100, carbs: 15, protein: 5, fat: 2, portion: "1컵" },
  { name: "고구마", calories: 130, carbs: 30, protein: 2, fat: 0, portion: "1개" },
];

/**
 * 음식 검색 (프리셋에서)
 */
export function searchPresetFoods(query: string): PresetFood[] {
  if (!query.trim()) return PRESET_FOODS.slice(0, 10);
  
  const lowerQuery = query.toLowerCase();
  return PRESET_FOODS.filter(food => 
    food.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * AI 검색 (룰베이스 추정)
 * 사용자가 "김치찌개 1그릇" 같이 입력하면 대략 추정
 */
export function aiEstimateFood(query: string): PresetFood | null {
  const lowerQuery = query.toLowerCase().trim();
  
  // 프리셋에서 먼저 찾기
  const preset = PRESET_FOODS.find(food => 
    lowerQuery.includes(food.name.toLowerCase())
  );
  
  if (preset) {
    // 양 조정 (0.5, 반, 2인분 등)
    let multiplier = 1;
    if (lowerQuery.includes('반') || lowerQuery.includes('0.5') || lowerQuery.includes('절반')) {
      multiplier = 0.5;
    } else if (lowerQuery.includes('2인분') || lowerQuery.includes('2그릇') || lowerQuery.includes('두')) {
      multiplier = 2;
    } else if (lowerQuery.includes('1.5') || lowerQuery.includes('한그릇반')) {
      multiplier = 1.5;
    }
    
    return {
      ...preset,
      calories: Math.round(preset.calories * multiplier),
      carbs: Math.round(preset.carbs * multiplier),
      protein: Math.round(preset.protein * multiplier),
      fat: Math.round(preset.fat * multiplier),
      portion: multiplier !== 1 ? `${multiplier}인분` : preset.portion,
    };
  }
  
  // 프리셋에 없으면 일반적인 추정
  // 밥/국/반찬 키워드로 대략 추정
  if (lowerQuery.includes('밥') || lowerQuery.includes('rice')) {
    return { name: query, calories: 300, carbs: 65, protein: 5, fat: 1, portion: "1공기" };
  }
  if (lowerQuery.includes('찌개') || lowerQuery.includes('국') || lowerQuery.includes('soup')) {
    return { name: query, calories: 150, carbs: 10, protein: 8, fat: 6, portion: "1그릇" };
  }
  if (lowerQuery.includes('고기') || lowerQuery.includes('meat')) {
    return { name: query, calories: 300, carbs: 5, protein: 25, fat: 20, portion: "1인분" };
  }
  if (lowerQuery.includes('과일') || lowerQuery.includes('fruit')) {
    return { name: query, calories: 80, carbs: 20, protein: 1, fat: 0, portion: "1개" };
  }
  
  // 기본 추정
  return { name: query, calories: 200, carbs: 25, protein: 10, fat: 8, portion: "1인분" };
}
