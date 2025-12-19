import { useState, useRef, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  Image as ImageIcon,
  Utensils,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  CalendarIcon,
  WifiOff,
  CloudOff,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMealRecords, MealRecordServer, MealFood } from "@/hooks/useServerSync";
import { usePendingQueue } from "@/hooks/usePendingQueue";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/lib/imageUpload";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface AnalyzedFood {
  name: string;
  portion: string;
  portionOptions: string[];
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

type Step = "idle" | "analyzing" | "portion" | "confirm" | "manual";

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

const PORTION_OPTIONS: Record<string, string[]> = {
  default: ["소", "중", "대"],
  rice: ["0.5공기", "1공기", "1.5공기"],
  soup: ["1/2그릇", "1그릇", "1.5그릇"],
  drink: ["200ml", "300ml", "500ml"],
};

// Mock AI 분석 함수
const mockAnalyzeFood = async (imageUrl: string): Promise<AnalyzedFood[]> => {
  await new Promise((r) => setTimeout(r, 1500));
  
  const mockFoods = [
    ["된장찌개", "soup", 150, 10, 8, 5],
    ["흰쌀밥", "rice", 300, 65, 5, 1],
    ["김치", "default", 20, 3, 1, 0],
    ["계란후라이", "default", 90, 1, 7, 7],
    ["불고기", "default", 250, 10, 20, 15],
    ["샐러드", "default", 50, 8, 2, 1],
    ["치킨", "default", 350, 15, 25, 20],
    ["라면", "soup", 500, 70, 10, 20],
  ];
  
  const randomCount = Math.floor(Math.random() * 2) + 1;
  const selected = mockFoods.sort(() => Math.random() - 0.5).slice(0, randomCount);
  
  return selected.map(([name, type, cal, carb, prot, fat]) => ({
    name: name as string,
    portion: PORTION_OPTIONS[type as string]?.[1] || "중",
    portionOptions: PORTION_OPTIONS[type as string] || PORTION_OPTIONS.default,
    calories: cal as number,
    carbs: carb as number,
    protein: prot as number,
    fat: fat as number,
  }));
};

export default function Nutrition() {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // 서버 동기화 훅 사용
  const { data: records, loading, syncing, add, addOffline, remove, refetch, getTodayCalories } = useMealRecords();
  const { pendingCount, isSyncing: pendingSyncing, addToPending, syncPending } = usePendingQueue();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 기록 플로우 상태
  const [step, setStep] = useState<Step>("idle");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);  // 원본 파일 저장
  const [analyzedFoods, setAnalyzedFoods] = useState<AnalyzedFood[]>([]);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [editingRecord, setEditingRecord] = useState<MealRecordServer | null>(null);

  // 직접 입력 상태
  const [manualFoodName, setManualFoodName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualMemo, setManualMemo] = useState("");

  // 온라인/오프라인 상태 감지 및 자동 동기화
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast({ title: "온라인 복귀", description: "데이터를 동기화합니다." });
      
      // Sync pending items first
      const result = await syncPending();
      if (result.success > 0) {
        toast({ title: "동기화 완료", description: `${result.success}개 기록이 서버에 업로드되었습니다.` });
      }
      
      // Then refetch
      refetch();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({ title: "오프라인 모드", description: "데이터가 로컬에 임시 저장됩니다.", variant: "destructive" });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refetch, toast, syncPending]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const todayRecords = records.filter((r) => r.date === dateStr);
  const todayCalories = todayRecords.reduce((sum, r) => sum + (r.total_calories || 0), 0);

  // 날짜별 기록 여부 체크
  const hasRecordOnDate = (date: Date) => {
    const d = format(date, "yyyy-MM-dd");
    return records.some((r) => r.date === d);
  };

  // 이미지 선택 처리
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploadedFile(file);  // 원본 파일 저장

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUploadedImage(base64);  // 미리보기용 base64
      setStep("analyzing");

      try {
        const foods = await mockAnalyzeFood(base64);
        setAnalyzedFoods(foods);
        setStep("portion");
      } catch {
        toast({ title: "분석 실패", description: "다시 시도해주세요", variant: "destructive" });
        setStep("idle");
        setUploadedImage(null);
        setUploadedFile(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // 포션 변경
  const handlePortionChange = (index: number, portion: string) => {
    setAnalyzedFoods((prev) =>
      prev.map((f, i) => (i === index ? { ...f, portion } : f))
    );
  };

  // 음식 정보 수정
  const handleFoodEdit = (index: number, field: keyof AnalyzedFood, value: string | number) => {
    setAnalyzedFoods((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    );
  };

  // 음식 삭제
  const handleFoodRemove = (index: number) => {
    setAnalyzedFoods((prev) => prev.filter((_, i) => i !== index));
  };

  // 확인 단계로 이동
  const goToConfirm = () => {
    if (analyzedFoods.length === 0) {
      toast({ title: "음식을 추가해주세요", variant: "destructive" });
      return;
    }
    const allHavePortion = analyzedFoods.every((f) => f.portion);
    if (!allHavePortion) {
      toast({ title: "모든 음식의 양을 선택해주세요", variant: "destructive" });
      return;
    }
    setStep("confirm");
  };

  // 저장
  const handleSave = async () => {
    if (!user) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      return;
    }

    const foods: MealFood[] = analyzedFoods.map((f) => ({
      name: f.name,
      portion: f.portion,
      calories: f.calories,
      carbs: f.carbs,
      protein: f.protein,
      fat: f.fat,
    }));
    
    const totalCalories = foods.reduce((sum, f) => sum + f.calories, 0);

    try {
      // 수정 모드인 경우 기존 기록 삭제 후 새로 추가
      if (editingRecord) {
        await remove(editingRecord.id);
      }
      
      if (isOnline) {
        // 온라인: 이미지를 Storage에 업로드하고 서버에 저장
        await add(
          {
            date: dateStr,
            meal_type: selectedMealType,
            foods,
            total_calories: totalCalories,
            image_url: null,  // Will be set by add()
          },
          { imageFile: uploadedFile || undefined }
        );
        toast({ title: "저장 완료!", description: `${MEAL_TYPE_LABELS[selectedMealType]} 기록이 저장되었습니다.` });
      } else {
        // 오프라인: pending queue에 저장 및 로컬 캐시에 추가
        const localId = addToPending('meal_record', {
          user_id: user.id,
          date: dateStr,
          meal_type: selectedMealType,
          foods,
          total_calories: totalCalories,
          image_url: uploadedImage,  // base64 임시 저장 (온라인 복귀 시 업로드)
        });
        
        // 로컬 UI 업데이트
        addOffline({
          date: dateStr,
          meal_type: selectedMealType,
          foods,
          total_calories: totalCalories,
          image_url: uploadedImage,
        }, localId);
        
        toast({ 
          title: "로컬에 저장됨", 
          description: "온라인 복귀 시 자동으로 서버에 업로드됩니다." 
        });
      }
      
      resetFlow();
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: "저장 실패", description: "다시 시도해주세요", variant: "destructive" });
    }
  };

  // 플로우 리셋
  const resetFlow = () => {
    setStep("idle");
    setUploadedImage(null);
    setUploadedFile(null);
    setAnalyzedFoods([]);
    setEditingRecord(null);
    // 직접 입력 필드도 초기화
    setManualFoodName("");
    setManualCalories("");
    setManualCarbs("");
    setManualProtein("");
    setManualFat("");
    setManualMemo("");
  };

  // 직접 입력 저장
  const handleManualSave = async () => {
    if (!user) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      return;
    }

    if (!manualFoodName.trim()) {
      toast({ title: "음식명을 입력해주세요", variant: "destructive" });
      return;
    }

    const calories = parseInt(manualCalories) || 0;
    const carbs = parseInt(manualCarbs) || 0;
    const protein = parseInt(manualProtein) || 0;
    const fat = parseInt(manualFat) || 0;

    const foods: MealFood[] = [{
      name: manualFoodName.trim(),
      portion: manualMemo.trim() || "1인분",
      calories,
      carbs,
      protein,
      fat,
    }];

    const totalCalories = calories;

    try {
      if (isOnline) {
        await add({
          date: dateStr,
          meal_type: selectedMealType,
          foods,
          total_calories: totalCalories,
          image_url: null,
        });
        toast({ title: "저장 완료!", description: `${MEAL_TYPE_LABELS[selectedMealType]} 기록이 저장되었습니다.` });
      } else {
        const localId = addToPending('meal_record', {
          user_id: user.id,
          date: dateStr,
          meal_type: selectedMealType,
          foods,
          total_calories: totalCalories,
          image_url: null,
        });
        
        addOffline({
          date: dateStr,
          meal_type: selectedMealType,
          foods,
          total_calories: totalCalories,
          image_url: null,
        }, localId);
        
        toast({ 
          title: "로컬에 저장됨", 
          description: "온라인 복귀 시 자동으로 서버에 업로드됩니다." 
        });
      }
      
      resetFlow();
    } catch (error) {
      console.error('Manual save error:', error);
      toast({ title: "저장 실패", description: "다시 시도해주세요", variant: "destructive" });
    }
  };

  // 기록 삭제
  const handleDeleteRecord = async (id: string) => {
    try {
      await remove(id);
      toast({ title: "삭제 완료" });
    } catch (error) {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  // 기록 수정
  const handleEditRecord = (record: MealRecordServer) => {
    setEditingRecord(record);
    setSelectedMealType(record.meal_type as MealType);
    setUploadedImage(record.image_url || null);
    setAnalyzedFoods(
      record.foods.map((f) => ({
        ...f,
        portionOptions: PORTION_OPTIONS.default,
      }))
    );
    setStep("portion");
  };

  // 날짜 이동
  const moveDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = isSameDay(selectedDate, new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 오프라인 배너 */}
      {!isOnline && (
        <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-xl p-3 flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-yellow-600" />
          <span className="text-sm text-yellow-800 dark:text-yellow-200">오프라인 모드 - 데이터가 로컬에 임시 저장됩니다</span>
        </div>
      )}

      {/* 대기 중인 업로드 표시 */}
      {pendingCount > 0 && (
        <div className="bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudOff className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {pendingCount}개 기록이 서버 업로드 대기 중
            </span>
          </div>
          {isOnline && !pendingSyncing && (
            <Button variant="ghost" size="sm" onClick={syncPending}>
              지금 동기화
            </Button>
          )}
        </div>
      )}

      {/* 동기화 중 표시 */}
      {(syncing || pendingSyncing) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>동기화 중...</span>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageSelect}
      />
      <input
        type="file"
        ref={cameraInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelect}
      />

      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">영양양갱</h1>
        <p className="text-lg text-muted-foreground">
          식사를 기록하고 건강을 관리하세요
        </p>
      </div>

      {/* 날짜 선택 */}
      <div className="flex items-center justify-between bg-card rounded-2xl border border-border p-4">
        <Button variant="ghost" size="icon" onClick={() => moveDate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <button
          onClick={() => setShowCalendar(true)}
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <CalendarIcon className="w-5 h-5" />
          {(() => {
            const weekdays = ["일", "월", "화", "수", "목", "금", "토"] as const;
            const weekday = weekdays[selectedDate.getDay()];
            return `${format(selectedDate, "M월 d일", { locale: ko })} (${weekday})`;
          })()}
          {isToday && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              오늘
            </span>
          )}
        </button>
        <Button variant="ghost" size="icon" onClick={() => moveDate(1)}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* 캘린더 모달 */}
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
            modifiers={{ hasRecord: (date) => hasRecordOnDate(date) }}
            modifiersClassNames={{ hasRecord: "bg-primary/20 font-bold" }}
            className="rounded-md"
          />
        </DialogContent>
      </Dialog>

      {/* 오늘 요약 */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">오늘 섭취 칼로리</span>
          <span className="text-3xl font-bold">{todayCalories} kcal</span>
        </div>
        <p className="text-white/80">
          {todayRecords.length === 0
            ? "아직 기록이 없어요"
            : `${todayRecords.length}끼 기록됨`}
        </p>
      </div>

      {/* 기록 플로우가 진행 중이 아닐 때 */}
      {step === "idle" && (
        <>
          {/* 식사 기록 버튼 */}
          <div className="bg-card rounded-3xl border border-border p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-3">식사 기록하기</h2>
            <p className="text-muted-foreground mb-4 text-base">
              음식 사진을 찍으면 AI가 분석해드려요
            </p>
            
            {/* 식사 타입 선택 */}
            <div className="mb-4">
              <Select value={selectedMealType} onValueChange={(v) => setSelectedMealType(v as MealType)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(MEAL_TYPE_LABELS) as [MealType, string][]).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 버튼 - 세로 스택 (작은 화면) / 가로 (큰 화면) */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="w-full min-w-0 sm:flex-1 h-14 min-h-[56px] text-base font-semibold rounded-xl whitespace-normal break-words"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-5 h-5 mr-2 shrink-0" />
                  <span className="truncate">카메라로 촬영</span>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full min-w-0 sm:flex-1 h-14 min-h-[56px] text-base font-semibold rounded-xl border-2 whitespace-normal break-words"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-5 h-5 mr-2 shrink-0" />
                  <span className="truncate">갤러리에서 선택</span>
                </Button>
              </div>
              {/* 직접 입력 버튼 */}
              <Button
                size="lg"
                variant="secondary"
                className="w-full h-12 text-base font-semibold rounded-xl"
                onClick={() => setStep("manual")}
              >
                <PlusCircle className="w-5 h-5 mr-2 shrink-0" />
                <span>직접 입력</span>
              </Button>
            </div>
          </div>

          {/* 타임라인 */}
          <div>
            <h2 className="text-xl font-semibold mb-4">식사 타임라인</h2>
            {todayRecords.length === 0 ? (
              <div className="bg-muted rounded-2xl p-8 text-center">
                <Utensils className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  이 날의 기록이 없어요
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((mealType) => {
                  const mealRecords = todayRecords.filter((r) => r.meal_type === mealType);
                  if (mealRecords.length === 0) return null;
                  
                  return (
                    <div key={mealType}>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        {MEAL_TYPE_LABELS[mealType]}
                      </p>
                      {mealRecords.map((record) => (
                        <div
                          key={record.id}
                          className="bg-card rounded-2xl border border-border p-4 mb-2"
                        >
                          <div className="flex gap-4">
                            {record.image_url && (
                              <img
                                src={record.image_url}
                                alt="식사"
                                className="w-20 h-20 rounded-xl object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  {record.foods.map((f, i) => (
                                    <p key={i} className="text-sm">
                                      {f.name} ({f.portion}) - {f.calories}kcal
                                    </p>
                                  ))}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditRecord(record)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => handleDeleteRecord(record.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-lg font-bold mt-2 text-primary">
                                총 {record.total_calories} kcal
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* 분석 중 */}
      {step === "analyzing" && (
        <div className="bg-card rounded-3xl border border-border p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-semibold">AI가 음식을 분석하고 있어요...</p>
          <p className="text-muted-foreground mt-2">잠시만 기다려주세요</p>
        </div>
      )}

      {/* 직접 입력 단계 */}
      {step === "manual" && (
        <div className="bg-card rounded-3xl border border-border p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">직접 입력</h2>
            <Button variant="ghost" size="sm" onClick={resetFlow}>
              <X className="w-4 h-4 mr-1" />
              취소
            </Button>
          </div>

          {/* 식사 종류 */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">식사 종류</label>
            <Select value={selectedMealType} onValueChange={(v) => setSelectedMealType(v as MealType)}>
              <SelectTrigger className="mt-1 h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(MEAL_TYPE_LABELS) as [MealType, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 음식명 (필수) */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              음식명 <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="예: 김치찌개, 비빔밥"
              value={manualFoodName}
              onChange={(e) => setManualFoodName(e.target.value)}
              className="mt-1 h-12"
            />
          </div>

          {/* 칼로리 (선택) */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">칼로리 (kcal)</label>
            <Input
              type="number"
              placeholder="예: 500"
              value={manualCalories}
              onChange={(e) => setManualCalories(e.target.value)}
              className="mt-1 h-12"
            />
          </div>

          {/* 탄단지 (선택) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">탄수화물 (g)</label>
              <Input
                type="number"
                placeholder="0"
                value={manualCarbs}
                onChange={(e) => setManualCarbs(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">단백질 (g)</label>
              <Input
                type="number"
                placeholder="0"
                value={manualProtein}
                onChange={(e) => setManualProtein(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">지방 (g)</label>
              <Input
                type="number"
                placeholder="0"
                value={manualFat}
                onChange={(e) => setManualFat(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* 메모 (선택) */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">메모 / 양</label>
            <Input
              placeholder="예: 1인분, 반 그릇"
              value={manualMemo}
              onChange={(e) => setManualMemo(e.target.value)}
              className="mt-1 h-12"
            />
          </div>

          {/* 저장 버튼 */}
          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold rounded-xl"
            onClick={handleManualSave}
            disabled={!manualFoodName.trim()}
          >
            저장하기
          </Button>
        </div>
      )}
      {step === "portion" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">음식 정보 확인</h2>
            <Button variant="ghost" size="sm" onClick={resetFlow}>
              <X className="w-4 h-4 mr-1" />
              취소
            </Button>
          </div>

          {/* 이미지 미리보기 */}
          {uploadedImage && (
            <img
              src={uploadedImage}
              alt="업로드된 이미지"
              className="w-full h-48 object-cover rounded-2xl"
            />
          )}

          {/* 식사 타입 */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">식사 종류</label>
            <Select value={selectedMealType} onValueChange={(v) => setSelectedMealType(v as MealType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(MEAL_TYPE_LABELS) as [MealType, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 음식 목록 */}
          <div className="space-y-4">
            {analyzedFoods.map((food, index) => (
              <div key={index} className="bg-card rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between mb-3">
                  <Input
                    value={food.name}
                    onChange={(e) => handleFoodEdit(index, "name", e.target.value)}
                    className="font-semibold text-lg border-0 p-0 h-auto focus-visible:ring-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleFoodRemove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* 양 선택 */}
                <div className="mb-3">
                  <label className="text-sm text-muted-foreground">양</label>
                  <div className="flex gap-2 mt-1">
                    {food.portionOptions.map((opt) => (
                      <Button
                        key={opt}
                        variant={food.portion === opt ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePortionChange(index, opt)}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 영양 정보 */}
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground">칼로리</p>
                    <Input
                      type="number"
                      value={food.calories}
                      onChange={(e) => handleFoodEdit(index, "calories", Number(e.target.value))}
                      className="text-center h-8 mt-1"
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground">탄수화물</p>
                    <Input
                      type="number"
                      value={food.carbs}
                      onChange={(e) => handleFoodEdit(index, "carbs", Number(e.target.value))}
                      className="text-center h-8 mt-1"
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground">단백질</p>
                    <Input
                      type="number"
                      value={food.protein}
                      onChange={(e) => handleFoodEdit(index, "protein", Number(e.target.value))}
                      className="text-center h-8 mt-1"
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground">지방</p>
                    <Input
                      type="number"
                      value={food.fat}
                      onChange={(e) => handleFoodEdit(index, "fat", Number(e.target.value))}
                      className="text-center h-8 mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button size="lg" className="w-full h-14" onClick={goToConfirm}>
            다음
          </Button>
        </div>
      )}

      {/* 최종 확인 */}
      {step === "confirm" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">기록 확인</h2>
            <Button variant="ghost" size="sm" onClick={() => setStep("portion")}>
              수정
            </Button>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground mb-2">
              {MEAL_TYPE_LABELS[selectedMealType]} • {format(selectedDate, "M월 d일", { locale: ko })}
            </p>
            
            {analyzedFoods.map((food, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
                <span>{food.name} ({food.portion})</span>
                <span className="font-semibold">{food.calories} kcal</span>
              </div>
            ))}
            
            <div className="flex justify-between pt-3 mt-2 border-t-2 border-border">
              <span className="font-semibold">총 칼로리</span>
              <span className="text-xl font-bold text-primary">
                {analyzedFoods.reduce((sum, f) => sum + f.calories, 0)} kcal
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="flex-1 h-14" onClick={resetFlow}>
              취소
            </Button>
            <Button size="lg" className="flex-1 h-14" onClick={handleSave}>
              저장
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
