import { useState, useEffect, useRef, memo } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { useGymMonthHeaders, useGymDayRecord, GymExercise, GymSet } from "@/hooks/useGymRecordsOptimized";
import { usePendingQueueOptimized } from "@/hooks/usePendingQueueOptimized";
import { useAuth } from "@/contexts/AuthContext";

// 운동 종목 목록 + placeholder
const SPORT_TYPES = [
  { value: "walking", label: "걷기", placeholder: "예: 3km" },
  { value: "health", label: "헬스(근력운동)", placeholder: "예: 벤치프레스" },
  { value: "hiking", label: "등산", placeholder: "예: 금정산(왕복)" },
  { value: "running", label: "러닝/조깅", placeholder: "예: 5km" },
  { value: "cycling", label: "자전거", placeholder: "예: 야외 라이딩 20km" },
  { value: "spinning", label: "스피닝", placeholder: "예: 스피닝 GX 수업" },
  { value: "yoga", label: "요가", placeholder: "예: 하타요가" },
  { value: "pilates", label: "필라테스", placeholder: "예: 기구 필라테스" },
  { value: "swimming", label: "수영", placeholder: "예: 자유형 500m" },
  { value: "badminton", label: "배드민턴", placeholder: "예: 복식 경기" },
  { value: "soccer", label: "축구", placeholder: "예: 조기축구 3경기" },
  { value: "futsal", label: "풋살", placeholder: "예: 5대5 매치" },
  { value: "golf", label: "골프/파크골프", placeholder: "예: 스크린 골프 18홀" },
  { value: "tabletennis", label: "탁구", placeholder: "예: 단식" },
  { value: "gateball", label: "게이트볼", placeholder: "예: 1경기" },
  { value: "gymnastics", label: "체조/맨손운동", placeholder: "예: 실버체조 또는 스트레칭" },
  { value: "aquarobics", label: "아쿠아로빅", placeholder: "예: 수중 에어로빅" },
  { value: "barefoot", label: "맨발 걷기", placeholder: "예: 황톳길 맨발 걷기" },
  { value: "other", label: "기타", placeholder: "예: 운동 내용" },
];

// 총 운동시간 선택 옵션 (5분 단위)
const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120];

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
  exerciseNames?: string[];
  sets?: GymSet[];
  duration?: number;
  memo?: string;
  imageUrl?: string;
}

// 운동 기록에서 종목과 운동명 목록 추출
function parseExerciseName(name: string): { sportType: string; sportLabel: string; exerciseNames: string[] } {
  const match = name.match(/^\[(.+?)\](.*)$/);
  if (!match) {
    return { sportType: "other", sportLabel: "기타", exerciseNames: name ? [name] : [] };
  }
  
  const sportLabel = match[1];
  const sport = SPORT_TYPES.find(s => s.label === sportLabel);
  const sportType = sport?.value || "other";
  
  // 운동명 파싱 (쉼표로 구분)
  const exerciseNamesStr = match[2]?.trim() || "";
  const exerciseNames = exerciseNamesStr
    ? exerciseNamesStr.split(",").map(n => n.trim()).filter(Boolean)
    : [];
  
  return { sportType, sportLabel, exerciseNames };
}

// 운동 기록 카드 (리스트용)
const ExerciseCard = memo(function ExerciseCard({
  exercise,
  onClick,
}: {
  exercise: GymExercise;
  onClick: () => void;
}) {
  const { sportLabel, exerciseNames } = parseExerciseName(exercise.name);
  
  return (
    <div 
      className="bg-card rounded-2xl border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          {exercise.imageUrl && (
            <img
              src={exercise.imageUrl}
              alt={sportLabel}
              className="w-12 h-12 rounded-xl object-cover"
            />
          )}
          <span className="font-semibold text-lg">[{sportLabel}]</span>
        </div>
      </div>
      
      {/* 운동명 태그 표시 */}
      {exerciseNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {exerciseNames.map((name, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
});

// Skeleton for loading state
function ExerciseSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-24" />
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function Exercise() {
  const { toast } = useToast();
  const { user } = useAuth();
  const machineInputRef = useRef<HTMLInputElement>(null);
  const exerciseNameInputRef = useRef<HTMLInputElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const monthStr = format(selectedDate, "yyyy-MM");
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isToday = isSameDay(selectedDate, new Date());

  // Optimized hooks - headers for calendar, full record for selected day only
  const { headers, loading: headersLoading, refetch: refetchHeaders } = useGymMonthHeaders(monthStr);
  const { record: todayGymRecord, loading: recordLoading, syncing, add, update, addOffline, refetch: refetchRecord } = useGymDayRecord(dateStr);
  const { pendingCount, isSyncing: pendingSyncing, addToPending, syncPending } = usePendingQueueOptimized();

  // 배치 저장을 위한 장바구니 상태
  const [pendingExercises, setPendingExercises] = useState<ExerciseRecord[]>([]);

  // 운동 기록 상태
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<ExerciseRecord | null>(null);
  const [machineImage, setMachineImage] = useState<string | null>(null);
  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingPendingIndex, setEditingPendingIndex] = useState<number | null>(null);
  
  // 운동명 누적 입력용 상태
  const [exerciseNameInput, setExerciseNameInput] = useState("");
  const [addedExerciseNames, setAddedExerciseNames] = useState<string[]>([]);
  
  // 상세 팝업 상태
  const [detailExercise, setDetailExercise] = useState<GymExercise | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [isDetailEditMode, setIsDetailEditMode] = useState(false);
  
  // 상세 팝업 편집용 상태
  const [editDetailExerciseNames, setEditDetailExerciseNames] = useState<string[]>([]);
  const [editDetailNameInput, setEditDetailNameInput] = useState("");
  const [editDetailMemo, setEditDetailMemo] = useState("");
  const [editDetailDuration, setEditDetailDuration] = useState<number | undefined>(undefined);

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
        refetchHeaders();
        refetchRecord();
      }
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
  }, [refetchHeaders, refetchRecord, toast, syncPending]);

  // 날짜 변경 시 장바구니 초기화
  useEffect(() => {
    setPendingExercises([]);
  }, [dateStr]);

  // 날짜별 기록 여부 (from headers - lightweight)
  const hasRecordOnDate = (date: Date) => {
    const d = format(date, "yyyy-MM-dd");
    return headers.some((h) => h.date === d);
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
    setAddedExerciseNames([name]);
    setCurrentExercise({
      id: crypto.randomUUID(),
      sportType: "health",
      name: "",
      exerciseNames: [name],
      imageUrl: machineImage || undefined,
    });
    setShowMachineSuggestions(false);
    setMachineImage(null);
    setShowAddExercise(true);
  };

  // 운동명 추가 (+ 버튼)
  const addExerciseName = () => {
    const trimmed = exerciseNameInput.trim();
    if (!trimmed) return;
    
    setAddedExerciseNames(prev => [...prev, trimmed]);
    setExerciseNameInput("");
    exerciseNameInputRef.current?.focus();
  };

  // 운동명 삭제
  const removeExerciseName = (index: number) => {
    setAddedExerciseNames(prev => prev.filter((_, i) => i !== index));
  };

  // 저장하기 버튼 클릭 - 바로 서버에 저장
  const handleSaveExercise = async () => {
    if (!currentExercise || !user) return;

    const sportLabel = SPORT_TYPES.find(s => s.value === currentExercise.sportType)?.label || currentExercise.sportType;
    
    // 운동명들을 쉼표로 조합
    const exerciseNamesStr = addedExerciseNames.length > 0 
      ? addedExerciseNames.join(", ")
      : "";
    
    const displayName = exerciseNamesStr
      ? `[${sportLabel}] ${exerciseNamesStr}`
      : `[${sportLabel}]`;

    const exerciseToSave: GymExercise = {
      id: currentExercise.id,
      name: displayName,
      sets: currentExercise.sets || [],
      imageUrl: currentExercise.imageUrl,
    };

    try {
      if (editingPendingIndex !== null) {
        // 장바구니 수정
        const updatedExercise: ExerciseRecord = {
          ...currentExercise,
          name: displayName,
          exerciseNames: addedExerciseNames,
        };
        setPendingExercises(prev => prev.map((ex, idx) =>
          idx === editingPendingIndex ? updatedExercise : ex
        ));
        setEditingPendingIndex(null);
        toast({ title: "운동이 수정되었습니다" });
      } else if (editingExerciseId) {
        // 기존 서버 기록 수정
        if (!todayGymRecord) return;
        const newExercises = todayGymRecord.exercises.map((ex) =>
          ex.id === editingExerciseId ? exerciseToSave : ex
        );
        await update(todayGymRecord.id, newExercises);
        toast({ title: "운동 기록 수정 완료!" });
      } else {
        // 새 운동 바로 저장
        if (isOnline) {
          if (todayGymRecord) {
            const newExercises = [...todayGymRecord.exercises, exerciseToSave];
            await update(todayGymRecord.id, newExercises);
          } else {
            await add([exerciseToSave]);
          }
          toast({ title: "운동 기록 저장 완료!" });
          refetchHeaders();
        } else {
          const localId = await addToPending('gym_record', {
            user_id: user.id,
            date: dateStr,
            exercises: todayGymRecord
              ? [...todayGymRecord.exercises, exerciseToSave]
              : [exerciseToSave],
          });

          addOffline(
            todayGymRecord
              ? [...todayGymRecord.exercises, exerciseToSave]
              : [exerciseToSave],
            localId
          );

          toast({
            title: "로컬에 저장됨",
            description: "온라인 복귀 시 자동으로 서버에 업로드됩니다."
          });
        }
      }

      // 폼 초기화
      setCurrentExercise(null);
      setShowAddExercise(false);
      setAddedExerciseNames([]);
      setExerciseNameInput("");
      setEditingExerciseId(null);
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: "저장 실패", description: "다시 시도해주세요", variant: "destructive" });
    }
  };

  // 장바구니에서 운동 제거
  const removeFromPending = (index: number) => {
    setPendingExercises(prev => prev.filter((_, i) => i !== index));
  };

  // 장바구니 운동 수정
  const editPendingExercise = (index: number) => {
    const exercise = pendingExercises[index];
    const { sportType, exerciseNames } = parseExerciseName(exercise.name);

    setCurrentExercise({
      ...exercise,
      sportType,
      name: "",
    });
    setAddedExerciseNames(exerciseNames);
    setExerciseNameInput("");
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
      // Convert to GymExercise format
      const exercisesToSave: GymExercise[] = pendingExercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets || [],
        imageUrl: ex.imageUrl,
      }));

      if (isOnline) {
        if (todayGymRecord) {
          const newExercises = [...todayGymRecord.exercises, ...exercisesToSave];
          await update(todayGymRecord.id, newExercises);
        } else {
          await add(exercisesToSave);
        }
        toast({ title: `${exercisesToSave.length}개 운동 기록 저장 완료!` });
        refetchHeaders();
      } else {
        const localId = await addToPending('gym_record', {
          user_id: user.id,
          date: dateStr,
          exercises: todayGymRecord
            ? [...todayGymRecord.exercises, ...exercisesToSave]
            : exercisesToSave,
        });

        addOffline(
          todayGymRecord
            ? [...todayGymRecord.exercises, ...exercisesToSave]
            : exercisesToSave,
          localId
        );

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
  const saveExistingExercise = async (exerciseToSave: ExerciseRecord) => {
    if (!user || !editingExerciseId || !todayGymRecord) return;

    try {
      const gymExercise: GymExercise = {
        id: exerciseToSave.id,
        name: exerciseToSave.name,
        sets: exerciseToSave.sets || [],
        imageUrl: exerciseToSave.imageUrl,
      };

      const newExercises = todayGymRecord.exercises.map((ex) =>
        ex.id === editingExerciseId ? gymExercise : ex
      );

      await update(todayGymRecord.id, newExercises);
      toast({ title: "운동 기록 수정 완료!" });

      setCurrentExercise(null);
      setShowAddExercise(false);
      setEditingExerciseId(null);
      setAddedExerciseNames([]);
      setExerciseNameInput("");
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: "저장 실패", description: "다시 시도해주세요", variant: "destructive" });
    }
  };

  // 운동 삭제
  const deleteExercise = async (exerciseId: string) => {
    if (!todayGymRecord) return;

    try {
      const newExercises = todayGymRecord.exercises.filter((ex) => ex.id !== exerciseId);
      await update(todayGymRecord.id, newExercises);
      toast({ title: "삭제 완료" });
      setShowDetailSheet(false);
      setDetailExercise(null);
    } catch (error) {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  // 운동 수정 (서버에 있는 기록) - 상세 팝업에서 호출
  const startEditExercise = (exercise: GymExercise) => {
    const { sportType, exerciseNames } = parseExerciseName(exercise.name);

    setCurrentExercise({
      id: exercise.id,
      sportType,
      name: "",
      sets: exercise.sets,
      imageUrl: exercise.imageUrl,
    });
    setAddedExerciseNames(exerciseNames);
    setExerciseNameInput("");
    setEditingExerciseId(exercise.id);
    setEditingPendingIndex(null);
    setShowDetailSheet(false);
    setDetailExercise(null);
    setShowAddExercise(true);
  };

  // 상세 팝업 열기
  const openDetailSheet = (exercise: GymExercise) => {
    const { exerciseNames } = parseExerciseName(exercise.name);
    setDetailExercise(exercise);
    setShowDetailSheet(true);
    setIsDetailEditMode(false);
    // 편집용 상태 초기화
    setEditDetailExerciseNames(exerciseNames);
    setEditDetailNameInput("");
    setEditDetailMemo((exercise as any).memo || "");
    setEditDetailDuration((exercise as any).duration);
  };

  // 상세 팝업에서 편집모드 전환
  const toggleDetailEditMode = () => {
    if (!detailExercise) return;
    const { exerciseNames } = parseExerciseName(detailExercise.name);
    setEditDetailExerciseNames(exerciseNames);
    setEditDetailNameInput("");
    setEditDetailMemo((detailExercise as any).memo || "");
    setEditDetailDuration((detailExercise as any).duration);
    setIsDetailEditMode(true);
  };

  // 상세 팝업에서 편집 저장
  const saveDetailEdit = async () => {
    if (!detailExercise || !todayGymRecord) return;

    const { sportLabel } = parseExerciseName(detailExercise.name);
    const exerciseNamesStr = editDetailExerciseNames.length > 0 
      ? editDetailExerciseNames.join(", ")
      : "";
    
    const displayName = exerciseNamesStr
      ? `[${sportLabel}] ${exerciseNamesStr}`
      : `[${sportLabel}]`;

    const updatedExercise: GymExercise = {
      ...detailExercise,
      name: displayName,
      // memo와 duration 저장 (GymExercise에 없으면 확장)
    };

    try {
      const newExercises = todayGymRecord.exercises.map((ex) =>
        ex.id === detailExercise.id ? updatedExercise : ex
      );
      await update(todayGymRecord.id, newExercises);
      toast({ title: "수정 완료!" });
      
      // 상태 업데이트
      setDetailExercise(updatedExercise);
      setIsDetailEditMode(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: "저장 실패", variant: "destructive" });
    }
  };

  // 상세 편집에서 운동명 추가
  const addDetailExerciseName = () => {
    const trimmed = editDetailNameInput.trim();
    if (!trimmed) return;
    setEditDetailExerciseNames(prev => [...prev, trimmed]);
    setEditDetailNameInput("");
  };

  // 상세 편집에서 운동명 삭제
  const removeDetailExerciseName = (index: number) => {
    setEditDetailExerciseNames(prev => prev.filter((_, i) => i !== index));
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
    });
    setAddedExerciseNames([]);
    setExerciseNameInput("");
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
    setAddedExerciseNames([]);
    setExerciseNameInput("");
  };

  // 종목 변경 시 처리 (헬스도 duration 가능)
  const handleSportTypeChange = (value: string) => {
    if (!currentExercise) return;
    setCurrentExercise({
      ...currentExercise,
      sportType: value,
    });
  };

  // 현재 종목의 placeholder 가져오기
  const getCurrentPlaceholder = () => {
    if (!currentExercise) return "예: 운동 내용";
    const sport = SPORT_TYPES.find(s => s.value === currentExercise.sportType);
    return sport?.placeholder || "예: 운동 내용";
  };

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

      {/* 헤더 - 영양탭과 동일 구조 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">운동양갱</h1>
        <p className="text-lg text-muted-foreground">오늘의 운동을 기록하세요</p>
      </div>

      {/* 걸음수 연동 Placeholder - 영양탭 NutritionSummaryCard와 동일한 높이 */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl p-4 text-white space-y-3">
        {/* 상단 */}
        <div>
          <p className="text-white/80 text-xs mb-0.5">오늘 걸음</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">--</span>
            <span className="text-base text-white/80">/ 10,000 걸음</span>
          </div>
        </div>

        {/* 프로그레스 */}
        <div>
          <div className="h-2 bg-white/20 rounded-full">
            <div className="h-full w-0 bg-white/70 rounded-full" />
          </div>
          <p className="text-xs text-white/80 mt-1.5 flex items-center gap-1">
            <Footprints className="w-3 h-3" />
            갤럭시핏/헬스 연동 준비 중
          </p>
        </div>

        {/* 하단 통계 - 3열 구조로 영양탭과 동일 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-lg p-2">
            <p className="text-[10px] text-white/80 mb-0.5">이동 거리</p>
            <p className="text-xs font-semibold">-- km</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2">
            <p className="text-[10px] text-white/80 mb-0.5">활동 칼로리</p>
            <p className="text-xs font-semibold">-- kcal</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2">
            <p className="text-[10px] text-white/80 mb-0.5">활동 시간</p>
            <p className="text-xs font-semibold">-- 분</p>
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
              {pendingExercises.map((exercise, index) => {
                const { sportLabel, exerciseNames } = parseExerciseName(exercise.name);
                return (
                  <div key={exercise.id} className="bg-card rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">[{sportLabel}]</p>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editPendingExercise(index)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromPending(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {exerciseNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {exerciseNames.map((name, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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

            {/* 운동명 입력 + 누적 리스트 */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                운동명 (선택)
              </label>
              <div className="flex gap-2 mt-1">
                <Input
                  ref={exerciseNameInputRef}
                  value={exerciseNameInput}
                  onChange={(e) => setExerciseNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addExerciseName();
                    }
                  }}
                  placeholder={getCurrentPlaceholder()}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="shrink-0 h-10 w-10"
                  onClick={addExerciseName}
                  title="운동명 추가"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              
              {/* 추가된 운동명 목록 (입력칸 아래) */}
              {addedExerciseNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {addedExerciseNames.map((name, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="text-sm gap-1 pr-1"
                    >
                      {name}
                      <button
                        onClick={() => removeExerciseName(i)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 총 운동시간 (모든 종목에 적용, 선택값) */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">총 운동시간 (분) - 선택</label>
              <div className="flex items-center gap-3 mt-1">
                {/* 직접 입력 */}
                <Input
                  type="number"
                  min={0}
                  value={currentExercise.duration ?? ""}
                  onChange={(e) => setCurrentExercise({
                    ...currentExercise,
                    duration: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="직접 입력"
                  className="w-24"
                />
                <span className="text-muted-foreground">또는</span>
                {/* 선택 (5분 단위) */}
                <Select
                  value={currentExercise.duration?.toString() || ""}
                  onValueChange={(val) => setCurrentExercise({
                    ...currentExercise,
                    duration: val ? parseInt(val) : undefined
                  })}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((min) => (
                      <SelectItem key={min} value={min.toString()}>
                        {min}분
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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

            {/* 저장하기 버튼 (항상 활성화) */}
            <Button size="lg" className="w-full" onClick={handleSaveExercise}>
              {editingExerciseId || editingPendingIndex !== null ? "수정 완료" : "저장하기"}
            </Button>
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

        {/* 오늘 운동 기록 - Show skeleton while loading */}
        {recordLoading ? (
          <ExerciseSkeleton />
        ) : todayGymRecord && todayGymRecord.exercises.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-medium text-muted-foreground">
              {format(selectedDate, "M월 d일", { locale: ko })} 기록
            </h3>
            {todayGymRecord.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onClick={() => openDetailSheet(exercise)}
              />
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

      {/* 상세 팝업 (Sheet) */}
      <Sheet open={showDetailSheet} onOpenChange={(open) => {
        setShowDetailSheet(open);
        if (!open) setIsDetailEditMode(false);
      }}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl">
          {detailExercise && (() => {
            const { sportLabel, exerciseNames } = parseExerciseName(detailExercise.name);
            return (
              <>
                <SheetHeader className="flex flex-row items-center justify-between pr-8">
                  <SheetTitle>[{sportLabel}] {isDetailEditMode ? "수정" : "상세"}</SheetTitle>
                  {!isDetailEditMode && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={toggleDetailEditMode}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      수정
                    </Button>
                  )}
                </SheetHeader>
                
                <div className="mt-4 space-y-4">
                  {isDetailEditMode ? (
                    /* 편집 모드 */
                    <>
                      {/* 종목 (읽기 전용) */}
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">종목</p>
                        <p className="font-medium">{sportLabel}</p>
                      </div>
                      
                      {/* 운동명 편집 */}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">운동명</label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            value={editDetailNameInput}
                            onChange={(e) => setEditDetailNameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addDetailExerciseName();
                              }
                            }}
                            placeholder="운동명 입력 후 + 클릭"
                            className="flex-1"
                          />
                          <Button
                            variant="secondary"
                            size="icon"
                            className="shrink-0 h-10 w-10"
                            onClick={addDetailExerciseName}
                          >
                            <Plus className="w-5 h-5" />
                          </Button>
                        </div>
                        {editDetailExerciseNames.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {editDetailExerciseNames.map((name, i) => (
                              <Badge 
                                key={i} 
                                variant="secondary" 
                                className="text-sm gap-1 pr-1"
                              >
                                {name}
                                <button
                                  onClick={() => removeDetailExerciseName(i)}
                                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* 총 운동시간 편집 */}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">총 운동시간 (분) - 선택</label>
                        <div className="flex items-center gap-3 mt-1">
                          <Input
                            type="number"
                            min={0}
                            value={editDetailDuration ?? ""}
                            onChange={(e) => setEditDetailDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="직접 입력"
                            className="w-24"
                          />
                          <span className="text-muted-foreground">또는</span>
                          <Select
                            value={editDetailDuration?.toString() || ""}
                            onValueChange={(val) => setEditDetailDuration(val ? parseInt(val) : undefined)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {DURATION_OPTIONS.map((min) => (
                                <SelectItem key={min} value={min.toString()}>
                                  {min}분
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* 메모 편집 */}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">메모</label>
                        <Textarea
                          value={editDetailMemo}
                          onChange={(e) => setEditDetailMemo(e.target.value)}
                          placeholder="메모를 입력하세요"
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                      
                      {/* 저장/취소 버튼 */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setIsDetailEditMode(false)}
                        >
                          취소
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={saveDetailEdit}
                        >
                          저장하기
                        </Button>
                      </div>
                    </>
                  ) : (
                    /* 보기 모드 */
                    <>
                      {/* 종목 */}
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">종목</p>
                        <p className="font-medium">{sportLabel}</p>
                      </div>
                      
                      {/* 운동명 목록 */}
                      {exerciseNames.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">운동명</p>
                          <div className="flex flex-wrap gap-1.5">
                            {exerciseNames.map((name, i) => (
                              <Badge key={i} variant="secondary">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 총 운동시간 */}
                      {(detailExercise as any).duration && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">총 운동시간</p>
                          <p className="font-medium">{(detailExercise as any).duration}분</p>
                        </div>
                      )}
                      
                      {/* 메모 표시 */}
                      {(detailExercise as any).memo && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">메모</p>
                          <p className="font-medium whitespace-pre-wrap">{(detailExercise as any).memo}</p>
                        </div>
                      )}
                      
                      {/* 세트 정보 (있는 경우) */}
                      {detailExercise.sets && detailExercise.sets.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">세트</p>
                          <div className="flex flex-wrap gap-2">
                            {detailExercise.sets.map((set, i) => (
                              <span
                                key={i}
                                className="text-sm bg-muted px-3 py-1 rounded-full"
                              >
                                {i + 1}세트: {set.weight}kg × {set.reps}회
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 이미지 */}
                      {detailExercise.imageUrl && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">사진</p>
                          <img
                            src={detailExercise.imageUrl}
                            alt="운동 사진"
                            className="w-full h-40 object-cover rounded-xl"
                          />
                        </div>
                      )}
                      
                      {/* 삭제 버튼 */}
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => deleteExercise(detailExercise.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제하기
                      </Button>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
