import { useState, useRef, useEffect } from "react";
import { format, parseISO, isSameDay } from "date-fns";
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
  Check,
  X,
  CalendarIcon,
} from "lucide-react";
import {
  getMealRecords,
  setMealRecords,
  MealRecord,
  generateId,
  getTodayString,
} from "@/lib/localStorage";
import { cn } from "@/lib/utils";

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

type Step = "idle" | "analyzing" | "portion" | "confirm";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [records, setRecords] = useState<MealRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  // 기록 플로우 상태
  const [step, setStep] = useState<Step>("idle");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [analyzedFoods, setAnalyzedFoods] = useState<AnalyzedFood[]>([]);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [editingRecord, setEditingRecord] = useState<MealRecord | null>(null);

  useEffect(() => {
    setRecords(getMealRecords());
  }, []);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const todayRecords = records.filter((r) => r.date === dateStr);
  const todayCalories = todayRecords.reduce((sum, r) => sum + r.totalCalories, 0);

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

    // 이미지를 base64로 변환 (청크 처리)
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUploadedImage(base64);
      setStep("analyzing");

      try {
        const foods = await mockAnalyzeFood(base64);
        setAnalyzedFoods(foods);
        setStep("portion");
      } catch {
        toast({ title: "분석 실패", description: "다시 시도해주세요", variant: "destructive" });
        setStep("idle");
        setUploadedImage(null);
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
    // 모든 음식에 포션이 선택되었는지 확인
    const allHavePortion = analyzedFoods.every((f) => f.portion);
    if (!allHavePortion) {
      toast({ title: "모든 음식의 양을 선택해주세요", variant: "destructive" });
      return;
    }
    setStep("confirm");
  };

  // 저장
  const handleSave = () => {
    const newRecord: MealRecord = {
      id: editingRecord?.id || generateId(),
      date: dateStr,
      mealType: selectedMealType,
      imageUrl: uploadedImage || undefined,
      foods: analyzedFoods.map((f) => ({
        name: f.name,
        portion: f.portion,
        calories: f.calories,
        carbs: f.carbs,
        protein: f.protein,
        fat: f.fat,
      })),
      totalCalories: analyzedFoods.reduce((sum, f) => sum + f.calories, 0),
      createdAt: editingRecord?.createdAt || new Date().toISOString(),
    };

    let updatedRecords: MealRecord[];
    if (editingRecord) {
      updatedRecords = records.map((r) => (r.id === editingRecord.id ? newRecord : r));
    } else {
      updatedRecords = [...records, newRecord];
    }

    setMealRecords(updatedRecords);
    setRecords(updatedRecords);
    resetFlow();
    toast({ title: "저장 완료!", description: `${MEAL_TYPE_LABELS[selectedMealType]} 기록이 저장되었습니다.` });
  };

  // 플로우 리셋
  const resetFlow = () => {
    setStep("idle");
    setUploadedImage(null);
    setAnalyzedFoods([]);
    setEditingRecord(null);
  };

  // 기록 삭제
  const handleDeleteRecord = (id: string) => {
    const updatedRecords = records.filter((r) => r.id !== id);
    setMealRecords(updatedRecords);
    setRecords(updatedRecords);
    toast({ title: "삭제 완료" });
  };

  // 기록 수정
  const handleEditRecord = (record: MealRecord) => {
    setEditingRecord(record);
    setSelectedMealType(record.mealType);
    setUploadedImage(record.imageUrl || null);
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

  return (
    <div className="space-y-6 pb-24">
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
          {format(selectedDate, "M월 d일 (EEEE)", { locale: ko })}
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
          <div className="bg-card rounded-3xl border border-border p-6">
            <h2 className="text-xl font-semibold mb-4">식사 기록하기</h2>
            <p className="text-muted-foreground mb-4">
              음식 사진을 찍으면 AI가 분석해드려요
            </p>
            
            {/* 식사 타입 선택 */}
            <div className="mb-4">
              <Select value={selectedMealType} onValueChange={(v) => setSelectedMealType(v as MealType)}>
                <SelectTrigger>
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

            <div className="flex gap-4">
              <Button
                size="lg"
                className="flex-1 h-14"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-5 h-5 mr-2" />
                카메라
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-14"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="w-5 h-5 mr-2" />
                갤러리
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
                  const mealRecords = todayRecords.filter((r) => r.mealType === mealType);
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
                            {record.imageUrl && (
                              <img
                                src={record.imageUrl}
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
                                총 {record.totalCalories} kcal
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

      {/* 양(포션) 입력 단계 */}
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
            <label className="text-sm font-medium mb-2 block">식사 종류</label>
            <Select value={selectedMealType} onValueChange={(v) => setSelectedMealType(v as MealType)}>
              <SelectTrigger>
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

          {/* 분석된 음식 목록 */}
          {analyzedFoods.map((food, index) => (
            <div key={index} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Input
                  value={food.name}
                  onChange={(e) => handleFoodEdit(index, "name", e.target.value)}
                  className="font-semibold text-lg border-none p-0 h-auto focus-visible:ring-0"
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

              {/* 양 선택 (필수) */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  양 (필수) *
                </label>
                <div className="flex gap-2 flex-wrap">
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
                  <Input
                    placeholder="직접 입력"
                    className="w-24 h-9"
                    value={food.portionOptions.includes(food.portion) ? "" : food.portion}
                    onChange={(e) => handlePortionChange(index, e.target.value)}
                  />
                </div>
              </div>

              {/* 영양 정보 수정 */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">칼로리</label>
                  <Input
                    type="number"
                    value={food.calories}
                    onChange={(e) => handleFoodEdit(index, "calories", Number(e.target.value))}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">탄수화물</label>
                  <Input
                    type="number"
                    value={food.carbs}
                    onChange={(e) => handleFoodEdit(index, "carbs", Number(e.target.value))}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">단백질</label>
                  <Input
                    type="number"
                    value={food.protein}
                    onChange={(e) => handleFoodEdit(index, "protein", Number(e.target.value))}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">지방</label>
                  <Input
                    type="number"
                    value={food.fat}
                    onChange={(e) => handleFoodEdit(index, "fat", Number(e.target.value))}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full" onClick={() => {
            setAnalyzedFoods([...analyzedFoods, {
              name: "새 음식",
              portion: "",
              portionOptions: PORTION_OPTIONS.default,
              calories: 0,
              carbs: 0,
              protein: 0,
              fat: 0,
            }]);
          }}>
            + 음식 추가
          </Button>

          <Button size="lg" className="w-full h-14" onClick={goToConfirm}>
            다음: 확인하기
          </Button>
        </div>
      )}

      {/* 확인 단계 */}
      {step === "confirm" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">최종 확인</h2>
            <Button variant="ghost" size="sm" onClick={() => setStep("portion")}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              수정
            </Button>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-semibold">
                {format(selectedDate, "M월 d일", { locale: ko })} {MEAL_TYPE_LABELS[selectedMealType]}
              </span>
            </div>

            {uploadedImage && (
              <img
                src={uploadedImage}
                alt="식사"
                className="w-full h-40 object-cover rounded-xl mb-4"
              />
            )}

            <div className="space-y-2 mb-4">
              {analyzedFoods.map((f, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{f.name} ({f.portion})</span>
                  <span className="font-medium">{f.calories} kcal</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>총 칼로리</span>
                <span className="text-primary">
                  {analyzedFoods.reduce((sum, f) => sum + f.calories, 0)} kcal
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground mt-1">
                <span>탄 / 단 / 지</span>
                <span>
                  {analyzedFoods.reduce((sum, f) => sum + f.carbs, 0)}g / 
                  {analyzedFoods.reduce((sum, f) => sum + f.protein, 0)}g / 
                  {analyzedFoods.reduce((sum, f) => sum + f.fat, 0)}g
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-14"
              onClick={resetFlow}
            >
              <X className="w-5 h-5 mr-2" />
              취소
            </Button>
            <Button size="lg" className="flex-1 h-14" onClick={handleSave}>
              <Check className="w-5 h-5 mr-2" />
              저장하기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
