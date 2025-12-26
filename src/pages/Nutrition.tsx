/**
 * Nutrition 페이지 - 완전 리팩토링
 * - 단일 소스: useMealRecordsQuery + useNutritionSettings
 * - 날짜: KST 기준 YYYY-MM-DD 문자열
 * - URL query로 날짜 유지 (?date=YYYY-MM-DD)
 * - AI 피드백 통합
 * - 낙관적 업데이트
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMealRecordsQuery } from "@/hooks/useMealRecordsQuery";
import { useNutritionSettings } from "@/hooks/useNutritionSettings";
import { useDailyData } from "@/contexts/DailyDataContext";
import { MealType, MealFood, MealRecordServer } from "@/hooks/useServerSync";
import { getKSTDateString, formatDateToKSTString, parseKSTDateString, isToday, NutritionGoals } from "@/lib/nutritionUtils";

// Components
import { NutritionSummaryCard } from "@/components/nutrition/NutritionSummaryCard";
import { MealCardsGrid } from "@/components/nutrition/MealCardsGrid";
import { AddFoodSheet } from "@/components/nutrition/AddFoodSheet";
import { FoodAnalysisSheet } from "@/components/nutrition/FoodAnalysisSheet";
import { AIDietFeedbackSheet } from "@/components/nutrition/AIDietFeedbackSheet";


interface AnalyzedFood {
  name: string;
  portion: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  grams?: number;
}

export default function Nutrition() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshCalories } = useDailyData();

  // URL에서 날짜 읽기, 없으면 오늘
  const dateFromUrl = searchParams.get("date");
  const initialDate = dateFromUrl ? parseKSTDateString(dateFromUrl) : new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const dateStr = formatDateToKSTString(selectedDate);

  // URL 업데이트
  useEffect(() => {
    const currentDateParam = searchParams.get("date");
    if (currentDateParam !== dateStr) {
      setSearchParams({ date: dateStr }, { replace: true });
    }
  }, [dateStr, searchParams, setSearchParams]);

  // 데이터 훅
  const { getGoals, hasSettings, loading: settingsLoading, refetch: refetchSettings, settings } = useNutritionSettings();
  const {
    records,
    loading: recordsLoading,
    syncing,
    totals,
    recordsByMealType,
    caloriesByMealType,
    add,
    remove,
    update,
    refetch,
  } = useMealRecordsQuery({ dateStr });

  // 낙관적 업데이트를 위한 로컬 goals 상태
  const [localGoals, setLocalGoals] = useState<NutritionGoals | null>(null);
  const goals = localGoals || getGoals();
  
  const loading = settingsLoading || recordsLoading;
  const isTodaySelected = isToday(dateStr);

  // UI 상태
  const [showCalendar, setShowCalendar] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [analysisSheetOpen, setAnalysisSheetOpen] = useState(false);
  const [feedbackSheetOpen, setFeedbackSheetOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  
  // AI 분석 상태
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedFoods, setAnalyzedFoods] = useState<AnalyzedFood[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // 설정 저장 시 목표값 즉시 반영 (낙관적 업데이트)
  const handleGoalsUpdate = useCallback((newGoals: NutritionGoals) => {
    setLocalGoals(newGoals);
  }, []);

  // 설정 로드 후 로컬 상태 리셋
  useEffect(() => {
    if (!settingsLoading && hasSettings) {
      setLocalGoals(null);
    }
  }, [settingsLoading, hasSettings]);

  // 날짜 이동
  const moveDate = (days: number) => {
    const newDate = days > 0 ? addDays(selectedDate, days) : subDays(selectedDate, Math.abs(days));
    setSelectedDate(newDate);
  };

  // 끼니 추가 버튼 클릭
  const handleAddMeal = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setAddSheetOpen(true);
  };

  // 직접/검색에서 음식 선택
  const handleFoodsSelected = async (foods: MealFood[], imageFile?: File) => {
    if (!user) return;

    const totalCalories = foods.reduce((sum, f) => sum + f.calories, 0);

    setSaving(true);
    const result = await add({
      mealType: selectedMealType,
      foods,
      totalCalories,
      imageFile,
    });
    setSaving(false);

    if (result.success) {
      toast({ title: "저장 완료!" });
      if (isTodaySelected) refreshCalories();
    } else {
      toast({ title: "저장 실패", description: result.error, variant: "destructive" });
    }
  };

  // AI 분석 시작 - 사진 업로드 후 음식명/인분/g 입력 UI만 표시
  const handleAnalyzeImage = async (file: File) => {
    setUploadedFile(file);
    setAnalyzing(true);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);

    try {
      // 초기 음식 목록 (사용자가 입력하도록 빈 상태 또는 기본값)
      const initialFoods: AnalyzedFood[] = [
        { name: "음식", portion: "1인분", calories: 0, carbs: 0, protein: 0, fat: 0 }
      ];
      setAnalyzedFoods(initialFoods);
      setAnalysisSheetOpen(true);
    } catch {
      toast({ title: "분석 실패", description: "다시 시도해주세요", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  // AI 분석 결과 저장 - 저장 시점에 AI 분석 수행
  const handleSaveAnalysis = async () => {
    if (!user || analyzedFoods.length === 0) return;

    setSaving(true);
    
    try {
      // 각 음식에 대해 AI 분석 수행
      const analyzedResults = await Promise.all(
        analyzedFoods.map(async (food) => {
          // portion에서 인분 수 추출
          const portionMatch = food.portion.match(/^(\d+\.?\d*)인분$/);
          const portionNum = portionMatch ? parseFloat(portionMatch[1]) : null;
          
          // AI 분석 호출
          const { data, error } = await supabase.functions.invoke("analyze-food", {
            body: {
              foodName: food.name,
              grams: food.grams,
              portion: portionNum,
            },
          });

          if (error) {
            console.error("AI analysis error:", error);
            // 실패 시 기본값 사용
            const baseGrams = food.grams || (portionNum ? portionNum * 200 : 200);
            return {
              name: food.name,
              portion: food.portion,
              calories: Math.round(baseGrams * 1.5),
              carbs: Math.round(baseGrams * 0.3),
              protein: Math.round(baseGrams * 0.1),
              fat: Math.round(baseGrams * 0.05),
            };
          }

          return {
            name: food.name,
            portion: food.portion,
            calories: data?.calories || 200,
            carbs: data?.carbs || 25,
            protein: data?.protein || 10,
            fat: data?.fat || 8,
          };
        })
      );

      const foods: MealFood[] = analyzedResults;
      const totalCalories = foods.reduce((sum, f) => sum + f.calories, 0);

      const result = await add({
        mealType: selectedMealType,
        foods,
        totalCalories,
        imageFile: uploadedFile || undefined,
      });

      if (result.success) {
        toast({ title: "저장 완료!" });
        setAnalysisSheetOpen(false);
        setAnalyzedFoods([]);
        setUploadedImage(null);
        setUploadedFile(null);
        if (isTodaySelected) refreshCalories();
      } else {
        toast({ title: "저장 실패", description: result.error, variant: "destructive" });
      }
    } catch (err) {
      console.error("Save analysis error:", err);
      toast({ title: "저장 실패", description: "다시 시도해주세요", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // 기록 삭제
  const handleDeleteRecord = async (recordId: string) => {
    const result = await remove(recordId);
    if (result.success) {
      toast({ title: "삭제 완료" });
    } else {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  // 기록 수정 (인라인)
  const handleUpdateRecord = async (recordId: string, foods: MealFood[], totalCalories: number) => {
    const result = await update(recordId, { foods, totalCalories });
    if (result.success) {
      toast({ title: "수정 완료" });
    } else {
      toast({ title: "수정 실패", variant: "destructive" });
    }
  };

  // 기록 수정 (삭제 후 다시 추가하는 방식)
  const handleEdit = (record: MealRecordServer) => {
    setSelectedMealType(record.meal_type);
    setAnalyzedFoods(record.foods.map(f => ({ ...f, portion: f.portion || "1인분" })));
    setUploadedImage(record.image_url);
    setAnalysisSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">영양양갱</h1>
        <p className="text-lg text-muted-foreground">식사를 기록하고 건강을 관리하세요</p>
      </div>

      {/* 날짜 네비게이션 */}
      <div className="flex items-center justify-between bg-card rounded-2xl border border-border p-3">
        <Button variant="ghost" size="icon" onClick={() => moveDate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <button
          onClick={() => setShowCalendar(true)}
          className="flex items-center gap-2 font-semibold"
        >
          <CalendarIcon className="w-4 h-4" />
          {format(selectedDate, "M월 d일 (EEE)", { locale: ko })}
          {isTodaySelected && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              오늘
            </span>
          )}
        </button>
        <Button variant="ghost" size="icon" onClick={() => moveDate(1)}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* 캘린더 다이얼로그 */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>날짜 선택</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date);
                setShowCalendar(false);
              }
            }}
            className="rounded-md"
          />
        </DialogContent>
      </Dialog>

      {/* 요약 카드 */}
      <NutritionSummaryCard 
        totals={totals} 
        goals={goals} 
        hasSettings={hasSettings} 
        onGoalsUpdate={handleGoalsUpdate}
      />

      {/* AI 피드백 버튼 (통합) */}
      {isTodaySelected && (
        <Button 
          className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          onClick={() => setFeedbackSheetOpen(true)}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          오늘의 식단 AI 코치 피드백
        </Button>
      )}

      {/* 끼니 2x2 카드 */}
      <MealCardsGrid
        recordsByMealType={recordsByMealType}
        caloriesByMealType={caloriesByMealType}
        onAddMeal={handleAddMeal}
        onDeleteRecord={handleDeleteRecord}
        onUpdateRecord={handleUpdateRecord}
      />


      {/* 분석 중 오버레이 */}
      {analyzing && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="font-semibold">AI가 음식을 분석하고 있어요...</p>
          </div>
        </div>
      )}

      {/* 음식 추가 시트 */}
      <AddFoodSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        mealType={selectedMealType}
        onFoodsSelected={handleFoodsSelected}
        onAnalyzeImage={handleAnalyzeImage}
      />

      {/* AI 분석 결과 시트 */}
      <FoodAnalysisSheet
        open={analysisSheetOpen}
        onOpenChange={setAnalysisSheetOpen}
        mealType={selectedMealType}
        onMealTypeChange={setSelectedMealType}
        imageUrl={uploadedImage}
        analyzedFoods={analyzedFoods}
        onFoodsChange={setAnalyzedFoods}
        onSave={handleSaveAnalysis}
        saving={saving}
      />

      {/* AI 피드백 시트 */}
      <AIDietFeedbackSheet
        open={feedbackSheetOpen}
        onOpenChange={setFeedbackSheetOpen}
        totals={totals}
        goals={goals}
        recordsByMealType={recordsByMealType}
      />
    </div>
  );
}
