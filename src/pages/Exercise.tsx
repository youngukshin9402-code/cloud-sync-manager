import { useState, useEffect, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon,
  Loader2,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  Camera,
  X,
  WifiOff,
  CloudOff,
  Footprints,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGymRecords, GymRecordServer, GymExercise, GymSet } from "@/hooks/useServerSync";
import { usePendingQueue } from "@/hooks/usePendingQueue";
import { useAuth } from "@/contexts/AuthContext";

// 운동 종목 목록
const SPORT_TYPES = [
  { value: "health", label: "헬스" },
  { value: "swimming", label: "수영" },
  { value: "cycling", label: "자전거" },
  { value: "hiking", label: "등산" },
  { value: "parkgolf", label: "파크골프" },
  { value: "running", label: "달리기" },
  { value: "yoga", label: "요가" },
  { value: "other", label: "기타" },
];

// Mock 머신명 후보 (헬스용)
const MACHINE_SUGGESTIONS = [
  "레그 프레스",
  "레그 익스텐션",
  "레그 컬",
  "체스트 프레스",
  "숄더 프레스",
  "랫풀다운",
  "시티드 로우",
  "케이블 크로스오버",
  "스미스 머신",
  "덤벨 벤치 프레스",
];

// 요일 한글 변환 (한 글자)
const DAY_MAP: Record<string, string> = {
  "일요일": "일",
  "월요일": "월",
  "화요일": "화",
  "수요일": "수",
  "목요일": "목",
  "금요일": "금",
  "토요일": "토",
};

interface ExerciseRecord {
  id: string;
  sportType: string;
  name: string;
  sets?: GymSet[];
  duration?: number;
  memo?: string;
  imageUrl?: string;
}

export default function Exercise() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const machineInputRef = useRef<HTMLInputElement>(null);

  // 서버 동기화 훅 사용
  const { data: gymRecords, loading, syncing, add, addOffline, update, refetch } = useGymRecords();
  const { pendingCount, isSyncing: pendingSyncing, addToPending, syncPending } = usePendingQueue();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 배치 저장을 위한 장바구니 상태
  const [pendingExercises, setPendingExercises] = useState<ExerciseRecord[]>([]);
  
  // 운동 기록 상태
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<ExerciseRecord | null>(null);
  const [machineImage, setMachineImage] = useState<string | null>(null);
  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingPendingIndex, setEditingPendingIndex] = useState<number | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isToday = isSameDay(selectedDate, new Date());

  // 날짜 표시 포맷: M월 d일 (요일 한 글자)
  const formatDateDisplay = (date: Date) => {
    const fullDay = format(date, "EEEE", { locale: ko });
    const shortDay = DAY_MAP[fullDay] || fullDay.charAt(0);
    return `${format(date, "M월 d일")} (${shortDay})`;
  };

  // 온라인/오프라인 상태 감지 및 자동 동기화
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast({ title: "온라인 복귀", description: "데이터를 동기화합니다." });
      
      const result = await syncPending();
      if (result.success > 0) {
        toast({ title: "동기화 완료", description: `${result.success}개 기록이 서버에 업로드되었습니다.` });
      }
      
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

  // 날짜 변경 시 장바구니 초기화
  useEffect(() => {
    setPendingExercises([]);
  }, [dateStr]);

  // 오늘 운동 기록
  const todayGymRecord = gymRecords.find((r) => r.date === dateStr);

  // 날짜별 기록 여부
  const hasRecordOnDate = (date: Date) => {
    const d = format(date, "yyyy-MM-dd");
    return gymRecords.some((r) => r.date === d);
  };

  // 머신 이미지 선택
  const handleMachineImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = () => {
      setMachineImage(reader.result as string);
      setShowMachineSuggestions(true);
    };
    reader.readAsDataURL(file);
  };

  // 머신명 선택 (헬스용)
  const selectMachineName = (name: string) => {
    setCurrentExercise({
      id: crypto.randomUUID(),
      sportType: "health",
      name,
      sets: [{ reps: 10, weight: 20 }],
      imageUrl: machineImage || undefined,
    });
    setShowMachineSuggestions(false);
    setMachineImage(null);
    setShowAddExercise(true);
  };

  // 세트 추가 (헬스용)
  const addSet = () => {
    if (!currentExercise || !currentExercise.sets) return;
    const lastSet = currentExercise.sets[currentExercise.sets.length - 1] || { reps: 10, weight: 20 };
    setCurrentExercise({
      ...currentExercise,
      sets: [...currentExercise.sets, { ...lastSet }],
    });
  };

  // 세트 삭제
  const removeSet = (index: number) => {
    if (!currentExercise || !currentExercise.sets || currentExercise.sets.length <= 1) return;
    setCurrentExercise({
      ...currentExercise,
      sets: currentExercise.sets.filter((_, i) => i !== index),
    });
  };

  // 세트 수정 (버튼으로만)
  const updateSet = (index: number, field: keyof GymSet, delta: number) => {
    if (!currentExercise || !currentExercise.sets) return;
    setCurrentExercise({
      ...currentExercise,
      sets: currentExercise.sets.map((s, i) =>
        i === index ? { ...s, [field]: Math.max(0, s[field] + delta) } : s
      ),
    });
  };

  // 장바구니에 운동 추가 (임시 저장)
  const addToPendingExercises = () => {
    if (!currentExercise) return;
    
    const sportLabel = SPORT_TYPES.find(s => s.value === currentExercise.sportType)?.label || currentExercise.sportType;
    const displayName = currentExercise.name?.trim() 
      ? `[${sportLabel}] ${currentExercise.name}` 
      : `[${sportLabel}]`;
    
    const exerciseToAdd: ExerciseRecord = {
      ...currentExercise,
      name: displayName,
    };

    if (editingPendingIndex !== null) {
      // 장바구니 내 수정
      setPendingExercises(prev => prev.map((ex, idx) => 
        idx === editingPendingIndex ? exerciseToAdd : ex
      ));
      setEditingPendingIndex(null);
    } else {
      // 새로 추가
      setPendingExercises(prev => [...prev, exerciseToAdd]);
    }

    setCurrentExercise(null);
    setShowAddExercise(false);
    toast({ title: "운동이 장바구니에 추가되었습니다", description: "저장 버튼으로 한 번에 저장하세요" });
  };

  // 장바구니에서 운동 제거
  const removeFromPending = (index: number) => {
    setPendingExercises(prev => prev.filter((_, i) => i !== index));
  };

  // 장바구니 운동 수정
  const editPendingExercise = (index: number) => {
    const exercise = pendingExercises[index];
    // Parse sport type from name
    const match = exercise.name.match(/^\[(.+?)\] ?(.*)$/);
    let sportType = "health";
    let name = exercise.name;
    
    if (match) {
      const sportLabel = match[1];
      const sport = SPORT_TYPES.find(s => s.label === sportLabel);
      if (sport) {
        sportType = sport.value;
      }
      name = match[2] || "";
    }
    
    setCurrentExercise({
      ...exercise,
      sportType,
      name,
    });
    setEditingPendingIndex(index);
    setEditingExerciseId(null);
    setShowAddExercise(true);
  };

  // 배치 저장 - 모든 장바구니 운동을 한 번에 저장
  const saveAllExercises = async () => {
    if (!user || pendingExercises.length === 0) {
      toast({ title: "저장할 운동이 없습니다", variant: "destructive" });
      return;
    }

    try {
      const existingRecord = gymRecords.find((r) => r.date === dateStr);
      
      // Convert to GymExercise format
      const exercisesToSave: GymExercise[] = pendingExercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets || [],
        imageUrl: ex.imageUrl,
      }));

      if (isOnline) {
        if (existingRecord) {
          const newExercises = [...existingRecord.exercises, ...exercisesToSave];
          await update(existingRecord.id, newExercises);
        } else {
          await add({
            date: dateStr,
            exercises: exercisesToSave,
          });
        }
        toast({ title: `${exercisesToSave.length}개 운동 기록 저장 완료!` });
      } else {
        const localId = addToPending('gym_record', {
          user_id: user.id,
          date: dateStr,
          exercises: existingRecord 
            ? [...existingRecord.exercises, ...exercisesToSave]
            : exercisesToSave,
        });
        
        addOffline({
          date: dateStr,
          exercises: existingRecord 
            ? [...existingRecord.exercises, ...exercisesToSave]
            : exercisesToSave,
        }, localId);
        
        toast({ 
          title: "로컬에 저장됨", 
          description: "온라인 복귀 시 자동으로 서버에 업로드됩니다." 
        });
      }

      setPendingExercises([]);
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: "저장 실패", description: "다시 시도해주세요", variant: "destructive" });
    }
  };

  // 기존 운동 수정 저장 (서버에 있는 기록)
  const saveExistingExercise = async () => {
    if (!user || !currentExercise || !editingExerciseId) return;

    try {
      const existingRecord = gymRecords.find((r) => r.date === dateStr);
      if (!existingRecord) return;

      const sportLabel = SPORT_TYPES.find(s => s.value === currentExercise.sportType)?.label || currentExercise.sportType;
      const displayName = currentExercise.name?.trim() 
        ? `[${sportLabel}] ${currentExercise.name}` 
        : `[${sportLabel}]`;
      
      const exerciseToSave: GymExercise = {
        id: currentExercise.id,
        name: displayName,
        sets: currentExercise.sets || [],
        imageUrl: currentExercise.imageUrl,
      };

      const newExercises = existingRecord.exercises.map((ex) =>
        ex.id === editingExerciseId ? exerciseToSave : ex
      );
      
      await update(existingRecord.id, newExercises);
      toast({ title: "운동 기록 수정 완료!" });

      setCurrentExercise(null);
      setShowAddExercise(false);
      setEditingExerciseId(null);
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: "저장 실패", description: "다시 시도해주세요", variant: "destructive" });
    }
  };

  // 운동 삭제
  const deleteExercise = async (exerciseId: string) => {
    const record = gymRecords.find((r) => r.date === dateStr);
    if (!record) return;

    try {
      const newExercises = record.exercises.filter((ex) => ex.id !== exerciseId);
      await update(record.id, newExercises);
      toast({ title: "삭제 완료" });
    } catch (error) {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  // 운동 수정 (서버에 있는 기록)
  const editExercise = (exercise: GymExercise) => {
    const match = exercise.name.match(/^\[(.+?)\] ?(.*)$/);
    let sportType = "health";
    let name = exercise.name;
    
    if (match) {
      const sportLabel = match[1];
      const sport = SPORT_TYPES.find(s => s.label === sportLabel);
      if (sport) {
        sportType = sport.value;
      }
      name = match[2] || "";
    }
    
    setCurrentExercise({
      id: exercise.id,
      sportType,
      name,
      sets: exercise.sets,
      imageUrl: exercise.imageUrl,
    });
    setEditingExerciseId(exercise.id);
    setEditingPendingIndex(null);
    setShowAddExercise(true);
  };

  // 날짜 이동
  const moveDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // 새 운동 시작
  const startNewExercise = () => {
    setCurrentExercise({
      id: crypto.randomUUID(),
      sportType: "health",
      name: "",
      sets: [{ reps: 10, weight: 20 }],
    });
    setEditingExerciseId(null);
    setEditingPendingIndex(null);
    setShowAddExercise(true);
  };

  // 취소
  const cancelExercise = () => {
    setCurrentExercise(null);
    setShowAddExercise(false);
    setEditingExerciseId(null);
    setEditingPendingIndex(null);
  };

  // 종목 변경 시 세트 초기화 여부 결정
  const handleSportTypeChange = (value: string) => {
    if (!currentExercise) return;
    
    if (value === "health") {
      setCurrentExercise({
        ...currentExercise,
        sportType: value,
        sets: currentExercise.sets || [{ reps: 10, weight: 20 }],
        duration: undefined,
      });
    } else {
      setCurrentExercise({
        ...currentExercise,
        sportType: value,
        sets: undefined,
        duration: currentExercise.duration || 30,
      });
    }
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

      {/* Hidden input */}
      <input
        type="file"
        ref={machineInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleMachineImageSelect}
      />

      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">운동양갱</h1>
        <p className="text-lg text-muted-foreground">
          오늘의 운동을 기록하세요
        </p>
      </div>

      {/* 걸음수 연동 Placeholder */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
            <Footprints className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">걸음수 연동</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">갤럭시핏/헬스 연동 준비 중</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">--</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">걸음</p>
          </div>
        </div>
      </div>

      {/* 운동 기록 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">운동 기록</h2>
        </div>

        {/* 날짜 선택 */}
        <div className="flex items-center justify-between bg-card rounded-2xl border border-border p-4">
          <Button variant="ghost" size="icon" onClick={() => moveDate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-2 text-lg font-semibold whitespace-nowrap"
          >
            <CalendarIcon className="w-5 h-5 flex-shrink-0" />
            <span>{formatDateDisplay(selectedDate)}</span>
            {isToday && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex-shrink-0">
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

        {/* 장바구니 (추가 대기 중인 운동들) */}
        {pendingExercises.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary">저장 대기 ({pendingExercises.length}개)</h3>
              <Button onClick={saveAllExercises} size="sm" className="gap-2">
                <Save className="w-4 h-4" />
                모두 저장
              </Button>
            </div>
            <div className="space-y-2">
              {pendingExercises.map((exercise, index) => (
                <div key={exercise.id} className="bg-card rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{exercise.name}</p>
                    {exercise.sets && exercise.sets.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {exercise.sets.length}세트
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editPendingExercise(index)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromPending(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 운동 추가/수정 폼 */}
        {showAddExercise && currentExercise ? (
          <div className="bg-card rounded-3xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingExerciseId ? "운동 수정" : editingPendingIndex !== null ? "운동 수정" : "운동 추가"}
              </h3>
              <Button variant="ghost" size="icon" onClick={cancelExercise}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* 종목 선택 */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">종목</label>
              <Select 
                value={currentExercise.sportType} 
                onValueChange={handleSportTypeChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="종목 선택" />
                </SelectTrigger>
                <SelectContent>
                  {SPORT_TYPES.map((sport) => (
                    <SelectItem key={sport.value} value={sport.value}>
                      {sport.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 운동명/세부종목 (선택사항) */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {currentExercise.sportType === "health" ? "운동명 (선택)" : "세부 내용 (선택)"}
              </label>
              <Input
                value={currentExercise.name}
                onChange={(e) => setCurrentExercise({ ...currentExercise, name: e.target.value })}
                placeholder={currentExercise.sportType === "health" ? "예: 벤치프레스 (비워도 저장 가능)" : "예: 자유형 500m (비워도 저장 가능)"}
                className="mt-1"
              />
            </div>

            {/* 헬스: 세트 목록 */}
            {currentExercise.sportType === "health" && currentExercise.sets && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">세트</label>
                  <Button variant="outline" size="sm" onClick={addSet}>
                    <Plus className="w-4 h-4 mr-1" />
                    세트 추가
                  </Button>
                </div>

                {currentExercise.sets.map((set, index) => (
                  <div key={index} className="bg-muted/50 rounded-xl p-3 space-y-2">
                    {/* 세트 번호 + 삭제 버튼 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted-foreground">{index + 1}세트</span>
                      {currentExercise.sets && currentExercise.sets.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive"
                          onClick={() => removeSet(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    {/* 무게 + 횟수 입력 - 세로 정렬 */}
                    <div className="flex flex-col gap-2">
                      {/* 무게 줄 */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-10 shrink-0">무게</span>
                        <div className="flex items-center gap-1 flex-1 justify-start">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => updateSet(index, "weight", -5)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-16 text-center font-bold">{set.weight}kg</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => updateSet(index, "weight", 5)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* 횟수 줄 */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-10 shrink-0">횟수</span>
                        <div className="flex items-center gap-1 flex-1 justify-start">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => updateSet(index, "reps", -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-16 text-center font-bold">{set.reps}회</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => updateSet(index, "reps", 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 비헬스: 운동시간 */}
            {currentExercise.sportType !== "health" && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">운동시간 (분)</label>
                <div className="flex items-center gap-3 mt-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentExercise({ 
                      ...currentExercise, 
                      duration: Math.max(0, (currentExercise.duration || 30) - 10) 
                    })}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-20 text-center text-xl font-bold">
                    {currentExercise.duration || 30}분
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentExercise({ 
                      ...currentExercise, 
                      duration: (currentExercise.duration || 30) + 10 
                    })}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* 메모 */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">메모 (선택)</label>
              <Textarea
                value={currentExercise.memo || ""}
                onChange={(e) => setCurrentExercise({ ...currentExercise, memo: e.target.value })}
                placeholder="운동 메모를 남겨보세요"
                className="mt-1"
                rows={2}
              />
            </div>

            {/* 사진 첨부 */}
            {currentExercise.imageUrl && (
              <div className="relative">
                <img
                  src={currentExercise.imageUrl}
                  alt="운동 사진"
                  className="w-full h-40 object-cover rounded-xl"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => setCurrentExercise({ ...currentExercise, imageUrl: undefined })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* 저장 버튼 */}
            {editingExerciseId ? (
              <Button size="lg" className="w-full" onClick={saveExistingExercise}>
                수정 완료
              </Button>
            ) : (
              <Button size="lg" className="w-full" onClick={addToPendingExercises}>
                {editingPendingIndex !== null ? "수정 완료" : "운동 추가"}
              </Button>
            )}
          </div>
        ) : (
          /* 운동 추가 버튼 */
          <div className="flex gap-3">
            <Button className="flex-1 h-14" onClick={startNewExercise}>
              <Plus className="w-5 h-5 mr-2" />
              운동 추가
            </Button>
            <Button
              variant="outline"
              className="h-14"
              onClick={() => machineInputRef.current?.click()}
            >
              <Camera className="w-5 h-5 mr-2" />
              머신 촬영
            </Button>
          </div>
        )}

        {/* 머신명 추천 모달 */}
        <Dialog open={showMachineSuggestions} onOpenChange={setShowMachineSuggestions}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>머신 선택</DialogTitle>
            </DialogHeader>
            {machineImage && (
              <img
                src={machineImage}
                alt="머신"
                className="w-full h-40 object-cover rounded-xl mb-4"
              />
            )}
            <p className="text-sm text-muted-foreground mb-3">
              AI가 추천하는 머신 이름을 선택하세요
            </p>
            <div className="grid grid-cols-2 gap-2">
              {MACHINE_SUGGESTIONS.slice(0, 6).map((name) => (
                <Button
                  key={name}
                  variant="outline"
                  className="h-12"
                  onClick={() => selectMachineName(name)}
                >
                  {name}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* 오늘 운동 기록 */}
        {todayGymRecord && todayGymRecord.exercises.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-medium text-muted-foreground">
              {format(selectedDate, "M월 d일", { locale: ko })} 기록
            </h3>
            {todayGymRecord.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="bg-card rounded-2xl border border-border p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {exercise.imageUrl && (
                      <img
                        src={exercise.imageUrl}
                        alt={exercise.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    )}
                    <span className="font-semibold text-lg">{exercise.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => editExercise(exercise)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteExercise(exercise.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {exercise.sets && exercise.sets.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {exercise.sets.map((set, i) => (
                      <span
                        key={i}
                        className="text-sm bg-muted px-3 py-1 rounded-full"
                      >
                        {i + 1}세트: {set.weight}kg × {set.reps}회
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-muted rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">
              {isToday ? "오늘의 운동 기록이 없어요" : "이 날의 기록이 없어요"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
