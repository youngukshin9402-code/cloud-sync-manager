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
import { PageHeader } from "@/components/layout/PageHeader";
import { ExerciseTagList, ExerciseTag } from "@/components/exercise/ExerciseTag";
import { GymPhotoUpload } from "@/components/exercise/GymPhotoUpload";

// 운동 종목 목록 + placeholder + 색상
const SPORT_TYPES = [
  { value: "walking", label: "걷기", placeholder: "예: 3km", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  { value: "health", label: "헬스(근력운동)", placeholder: "예: 벤치프레스", color: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  { value: "hiking", label: "등산", placeholder: "예: 금정산(왕복)", color: "bg-green-600/20 text-green-700 dark:text-green-300 border-green-600/30" },
  { value: "running", label: "러닝/조깅", placeholder: "예: 5km", color: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  { value: "cycling", label: "자전거", placeholder: "예: 야외 라이딩 20km", color: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
  { value: "spinning", label: "스피닝", placeholder: "예: 스피닝 GX 수업", color: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30" },
  { value: "yoga", label: "요가", placeholder: "예: 하타요가", color: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30" },
  { value: "pilates", label: "필라테스", placeholder: "예: 기구 필라테스", color: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30" },
  { value: "swimming", label: "수영", placeholder: "예: 자유형 500m", color: "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  { value: "badminton", label: "배드민턴", placeholder: "예: 복식 경기", color: "bg-lime-500/20 text-lime-700 dark:text-lime-300 border-lime-500/30" },
  { value: "soccer", label: "축구", placeholder: "예: 조기축구 3경기", color: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30" },
  { value: "futsal", label: "풋살", placeholder: "예: 5대5 매치", color: "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30" },
  { value: "golf", label: "골프/파크골프", placeholder: "예: 스크린 골프 18홀", color: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  { value: "tabletennis", label: "탁구", placeholder: "예: 단식", color: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  { value: "gateball", label: "게이트볼", placeholder: "예: 1경기", color: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" },
  { value: "gymnastics", label: "체조/맨손운동", placeholder: "예: 실버체조 또는 스트레칭", color: "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30" },
  { value: "aquarobics", label: "아쿠아로빅", placeholder: "예: 수중 에어로빅", color: "bg-blue-400/20 text-blue-600 dark:text-blue-300 border-blue-400/30" },
  { value: "barefoot", label: "맨발 걷기", placeholder: "예: 황톳길 맨발 걷기", color: "bg-yellow-600/20 text-yellow-700 dark:text-yellow-300 border-yellow-600/30" },
  { value: "other", label: "기타", placeholder: "예: 운동 내용", color: "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30" },
];

// 종목 value로 색상 가져오기
const getSportColor = (sportValue: string) => {
  const sport = SPORT_TYPES.find(s => s.value === sportValue);
  return sport?.color || "bg-secondary text-secondary-foreground";
};

// 운동명에서 종목 value 추출
const getSportValueFromName = (exerciseName: string) => {
  for (const sport of SPORT_TYPES) {
    if (exerciseName.startsWith(`[${sport.label}]`)) {
      return sport.value;
    }
  }
  return "other";
};


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
  images?: string[];
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

// 종목 라벨 줄임 처리
const getShortenedSportLabel = (label: string) => {
  // "헬스(근력운동)" -> "헬스(근력)"
  if (label === "헬스(근력운동)") return "헬스(근력)";
  // 기타 긴 라벨들 필요시 추가
  return label;
};

// 운동명 요약 생성 (1줄 + 외 n)
const getExerciseSummary = (names: string[]): { line1: string; overflow: number } => {
  if (names.length === 0) return { line1: "", overflow: 0 };
  if (names.length === 1) return { line1: names[0], overflow: 0 };
  if (names.length === 2) return { line1: `${names[0]} · ${names[1]}`, overflow: 0 };
  // 3개 이상: 최대 3개까지 첫 줄에 표시, 나머지는 overflow
  const displayNames = names.slice(0, 3).join(" · ");
  return { line1: displayNames, overflow: names.length - 3 };
};

// 운동 기록 카드 (리스트용) - 고정 높이 96px, 컬러 태그
const ExerciseCard = memo(function ExerciseCard({
  exercise,
  onClick,
}: {
  exercise: GymExercise;
  onClick: () => void;
}) {
  const { sportLabel, exerciseNames } = parseExerciseName(exercise.name);
  const shortenedLabel = getShortenedSportLabel(sportLabel);

  const displayTags = exerciseNames.slice(0, 3);
  const overflowCount = Math.max(0, exerciseNames.length - 3);

  return (
    <div
      className="bg-card rounded-2xl border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors h-24 flex flex-col justify-between"
      onClick={onClick}
    >
      {/* 상단: 종목 + 시간 */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-base truncate">{shortenedLabel}</span>
        <span className="text-sm text-muted-foreground shrink-0">
          {exercise.duration ? `${exercise.duration}분` : ""}
        </span>
      </div>

      {/* 하단: 운동명 컬러 태그 (1줄) + 외 n (조건부 2번째 줄 단독) */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1 overflow-hidden">
          {displayTags.map((name, i) => (
            <ExerciseTag
              key={`${name}-${i}`}
              name={name}
              index={i}
              size="sm"
              className="max-w-[7rem] truncate"
            />
          ))}
        </div>
        {overflowCount > 0 && (
          <p className="text-xs text-muted-foreground/70 leading-tight">외 {overflowCount}</p>
        )}
      </div>
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
  const [editDetailImages, setEditDetailImages] = useState<string[]>([]);

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
      images: currentExercise.images || [],
      duration: currentExercise.duration,
      memo: currentExercise.memo,
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
    setEditDetailImages((exercise as any).images || []);
  };

  // 상세 팝업에서 편집모드 전환
  const toggleDetailEditMode = () => {
    if (!detailExercise) return;
    const { exerciseNames } = parseExerciseName(detailExercise.name);
    setEditDetailExerciseNames(exerciseNames);
    setEditDetailNameInput("");
    setEditDetailMemo((detailExercise as any).memo || "");
    setEditDetailDuration((detailExercise as any).duration);
    setEditDetailImages((detailExercise as any).images || []);
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
      duration: editDetailDuration,
      memo: editDetailMemo,
      images: editDetailImages,
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
      {/* 헤더 - 항상 첫 번째, 공용 컴포넌트 사용 */}
      <PageHeader 
        title="운동양갱" 
        subtitle="오늘의 운동을 기록하세요" 
      />

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
                const { sportType, sportLabel, exerciseNames } = parseExerciseName(exercise.name);
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
                    {/* 운동명 태그 - 공용 컴포넌트 사용 */}
                    <ExerciseTagList names={exerciseNames} className="mt-2" />
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
              
              {/* 추가된 운동명 목록 (입력칸 아래) - 공용 컴포넌트 사용 */}
              <ExerciseTagList 
                names={addedExerciseNames} 
                onRemove={removeExerciseName}
                size="md"
                className="mt-2"
              />
            </div>

            {/* 총 운동시간 (플러스/마이너스 + 직접입력) */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">총 운동시간 (분) - 선택</label>
              <div className="flex items-center gap-3 mt-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentExercise({
                    ...currentExercise,
                    duration: Math.max(0, (currentExercise.duration || 0) - 5)
                  })}
                  disabled={!currentExercise.duration || currentExercise.duration <= 0}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  min={0}
                  value={currentExercise.duration ?? ""}
                  onChange={(e) => setCurrentExercise({
                    ...currentExercise,
                    duration: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="0"
                  className="w-20 text-center text-lg font-bold"
                />
                <span className="text-muted-foreground font-medium">분</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentExercise({
                    ...currentExercise,
                    duration: (currentExercise.duration || 0) + 5
                  })}
                >
                  <Plus className="w-4 h-4" />
                </Button>
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
            <div>
              <label className="text-sm font-medium text-muted-foreground">사진 (선택)</label>
              <div className="mt-1">
                <GymPhotoUpload
                  images={currentExercise.images || []}
                  onImagesChange={(images) => setCurrentExercise({ ...currentExercise, images })}
                />
              </div>
            </div>

            {/* 저장하기 버튼 (항상 활성화) */}
            <Button size="lg" className="w-full" onClick={handleSaveExercise}>
              {editingExerciseId || editingPendingIndex !== null ? "수정 완료" : "저장하기"}
            </Button>
          </div>
        ) : (
          /* 운동 추가 버튼 */
          <Button className="w-full h-14" onClick={startNewExercise}>
            <Plus className="w-5 h-5 mr-2" />
            운동 추가
          </Button>
        )}

        {/* 오늘 운동 기록 - 2열 그리드, 고정 높이 */}
        {recordLoading ? (
          <ExerciseSkeleton />
        ) : todayGymRecord && todayGymRecord.exercises.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-medium text-muted-foreground">
              {format(selectedDate, "M월 d일", { locale: ko })} 기록
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {todayGymRecord.exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onClick={() => openDetailSheet(exercise)}
                />
              ))}
            </div>
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
        <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl [&>button]:hidden">
          {detailExercise && (() => {
            const { sportLabel, exerciseNames } = parseExerciseName(detailExercise.name);
            return (
              <>
                <SheetHeader className="flex flex-row items-center justify-between pr-0">
                  <SheetTitle>[{sportLabel}] {isDetailEditMode ? "수정" : "상세"}</SheetTitle>
                  <div className="flex items-center gap-1">
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
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowDetailSheet(false)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
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
                        {/* 편집 모드 운동명 태그 - 공용 컴포넌트 사용 */}
                        <ExerciseTagList 
                          names={editDetailExerciseNames} 
                          onRemove={removeDetailExerciseName}
                          size="md"
                          className="mt-2"
                        />
                      </div>
                      
                      {/* 총 운동시간 편집 (플러스/마이너스 + 직접입력) */}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">총 운동시간 (분) - 선택</label>
                        <div className="flex items-center gap-3 mt-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditDetailDuration(Math.max(0, (editDetailDuration || 0) - 5))}
                            disabled={!editDetailDuration || editDetailDuration <= 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            value={editDetailDuration ?? ""}
                            onChange={(e) => setEditDetailDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="0"
                            className="w-20 text-center text-lg font-bold"
                          />
                          <span className="text-muted-foreground font-medium">분</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditDetailDuration((editDetailDuration || 0) + 5)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
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
                      
                      {/* 사진 편집 */}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">사진</label>
                        <div className="mt-1">
                          <GymPhotoUpload
                            images={editDetailImages}
                            onImagesChange={setEditDetailImages}
                          />
                        </div>
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
                      
                      {/* 운동명 목록 - 공용 컴포넌트 사용 */}
                      {exerciseNames.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">운동명</p>
                          <ExerciseTagList names={exerciseNames} />
                        </div>
                      )}
                      
                      {/* 총 운동시간 */}
                      {detailExercise.duration && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">총 운동시간</p>
                          <p className="font-medium">{detailExercise.duration}분</p>
                        </div>
                      )}
                      
                      {/* 사진 섹션 */}
                      {detailExercise.images && detailExercise.images.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">사진</p>
                          <GymPhotoUpload
                            images={detailExercise.images}
                            onImagesChange={() => {}}
                            readonly
                          />
                        </div>
                      )}
                      
                      {/* 메모 표시 */}
                      {detailExercise.memo && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">메모</p>
                          <p className="font-medium whitespace-pre-wrap">{detailExercise.memo}</p>
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
