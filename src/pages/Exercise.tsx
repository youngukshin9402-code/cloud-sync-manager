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
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Circle,
  Trophy,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGymRecords, GymRecordServer, GymExercise, GymSet } from "@/hooks/useServerSync";
import { usePendingQueue } from "@/hooks/usePendingQueue";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Mock 머신명 후보
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

interface Mission {
  id: string;
  content: string;
  completed: boolean;
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

  // 미션 상태 (서버에서 가져옴)
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [pointsAwarded, setPointsAwarded] = useState(false);

  // 헬스 기록 상태
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<GymExercise | null>(null);
  const [machineImage, setMachineImage] = useState<string | null>(null);
  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isToday = isSameDay(selectedDate, new Date());
  const todayStr = format(new Date(), "yyyy-MM-dd");

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

  // 미션 로드 (mission_templates + daily_logs)
  useEffect(() => {
    const loadMissions = async () => {
      if (!user) return;
      
      setMissionsLoading(true);
      try {
        // 오늘의 미션 템플릿 가져오기
        const { data: templates, error: templatesError } = await supabase
          .from('mission_templates')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(3);

        if (templatesError) throw templatesError;

        // 미션 템플릿이 없으면 기본 미션 생성
        let missionTemplates = templates || [];
        if (missionTemplates.length === 0) {
          const defaultMissions = [
            "10분 스트레칭 하기",
            "계단 오르기 3층 이상",
            "30분 걷기",
          ];
          
          const { data: newTemplates, error: createError } = await supabase
            .from('mission_templates')
            .insert(
              defaultMissions.map(content => ({
                user_id: user.id,
                content,
                points: 10,
                is_active: true,
              }))
            )
            .select();

          if (createError) throw createError;
          missionTemplates = newTemplates || [];
        }

        // 오늘 완료한 미션 로그 가져오기
        const { data: completedLogs, error: logsError } = await supabase
          .from('daily_logs')
          .select('content')
          .eq('user_id', user.id)
          .eq('log_date', todayStr)
          .eq('log_type', 'mission')
          .eq('is_completed', true);

        if (logsError) throw logsError;

        const completedContents = new Set(completedLogs?.map(l => l.content) || []);

        // 미션 상태 설정
        const missionsWithStatus: Mission[] = missionTemplates.slice(0, 3).map(t => ({
          id: t.id,
          content: t.content,
          completed: completedContents.has(t.content),
        }));

        setMissions(missionsWithStatus);
        
        // 모두 완료 + 포인트 미지급 상태 확인
        const allDone = missionsWithStatus.length === 3 && missionsWithStatus.every(m => m.completed);
        if (allDone) {
          // 오늘 포인트 지급 여부 확인
          const { data: pointLog } = await supabase
            .from('point_history')
            .select('id')
            .eq('user_id', user.id)
            .eq('reason', '오늘의 미션 3개 완료')
            .gte('created_at', `${todayStr}T00:00:00`)
            .maybeSingle();
          
          setPointsAwarded(!!pointLog);
        }
      } catch (error) {
        console.error('Failed to load missions:', error);
      } finally {
        setMissionsLoading(false);
      }
    };

    loadMissions();
  }, [user, todayStr]);

  const completedCount = missions.filter((m) => m.completed).length;
  const allCompleted = completedCount === 3 && missions.length === 3;

  // 오늘 헬스 기록
  const todayGymRecord = gymRecords.find((r) => r.date === dateStr);

  // 날짜별 기록 여부
  const hasRecordOnDate = (date: Date) => {
    const d = format(date, "yyyy-MM-dd");
    return gymRecords.some((r) => r.date === d);
  };

  // 미션 토글
  const toggleMission = async (mission: Mission) => {
    if (!user) return;

    const newCompleted = !mission.completed;
    
    // 낙관적 업데이트
    setMissions(prev => prev.map(m => 
      m.id === mission.id ? { ...m, completed: newCompleted } : m
    ));

    try {
      if (newCompleted) {
        // 완료 로그 추가
        await supabase.from('daily_logs').insert({
          user_id: user.id,
          log_date: todayStr,
          log_type: 'mission',
          content: mission.content,
          is_completed: true,
          points_earned: 0, // 3개 완료 시에만 포인트 지급
        });

        // 3개 완료 체크
        const updatedMissions = missions.map(m => 
          m.id === mission.id ? { ...m, completed: true } : m
        );
        const allDone = updatedMissions.every(m => m.completed);

        if (allDone && !pointsAwarded) {
          // 100포인트 지급
          await supabase.from('point_history').insert({
            user_id: user.id,
            amount: 100,
            reason: '오늘의 미션 3개 완료',
          });

          // 프로필 포인트 업데이트
          if (profile) {
            await supabase.from('profiles').update({
              current_points: (profile.current_points || 0) + 100,
            }).eq('id', user.id);
          }

          setPointsAwarded(true);
          toast({
            title: "🎉 축하합니다!",
            description: "미션 3개 완료로 100포인트 획득!",
          });
        }
      } else {
        // 완료 취소 - 로그 삭제
        await supabase.from('daily_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('log_date', todayStr)
          .eq('log_type', 'mission')
          .eq('content', mission.content);
      }
    } catch (error) {
      console.error('Failed to toggle mission:', error);
      // 롤백
      setMissions(prev => prev.map(m => 
        m.id === mission.id ? { ...m, completed: !newCompleted } : m
      ));
      toast({ title: "오류 발생", description: "다시 시도해주세요", variant: "destructive" });
    }
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

  // 머신명 선택
  const selectMachineName = (name: string) => {
    setCurrentExercise({
      id: crypto.randomUUID(),
      name,
      sets: [{ reps: 10, weight: 20 }],
      imageUrl: machineImage || undefined,
    });
    setShowMachineSuggestions(false);
    setMachineImage(null);
    setShowAddExercise(true);
  };

  // 세트 추가
  const addSet = () => {
    if (!currentExercise) return;
    const lastSet = currentExercise.sets[currentExercise.sets.length - 1] || { reps: 10, weight: 20 };
    setCurrentExercise({
      ...currentExercise,
      sets: [...currentExercise.sets, { ...lastSet }],
    });
  };

  // 세트 삭제
  const removeSet = (index: number) => {
    if (!currentExercise || currentExercise.sets.length <= 1) return;
    setCurrentExercise({
      ...currentExercise,
      sets: currentExercise.sets.filter((_, i) => i !== index),
    });
  };

  // 세트 수정 (버튼으로만)
  const updateSet = (index: number, field: keyof GymSet, delta: number) => {
    if (!currentExercise) return;
    setCurrentExercise({
      ...currentExercise,
      sets: currentExercise.sets.map((s, i) =>
        i === index ? { ...s, [field]: Math.max(0, s[field] + delta) } : s
      ),
    });
  };

  // 운동 저장
  const saveExercise = async () => {
    if (!currentExercise || !currentExercise.name) {
      toast({ title: "운동명을 입력해주세요", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      return;
    }

    try {
      const existingRecord = gymRecords.find((r) => r.date === dateStr);

      if (isOnline) {
        // 온라인: 서버에 직접 저장
        if (existingRecord) {
          let newExercises: GymExercise[];
          
          if (editingExerciseId) {
            newExercises = existingRecord.exercises.map((ex) =>
              ex.id === editingExerciseId ? currentExercise : ex
            );
          } else {
            newExercises = [...existingRecord.exercises, currentExercise];
          }
          
          await update(existingRecord.id, newExercises);
        } else {
          await add({
            date: dateStr,
            exercises: [currentExercise],
          });
        }
        toast({ title: "운동 기록 저장 완료!" });
      } else {
        // 오프라인: pending queue에 저장 및 로컬 캐시에 추가
        const localId = addToPending('gym_record', {
          user_id: user.id,
          date: dateStr,
          exercises: existingRecord 
            ? [...existingRecord.exercises, currentExercise]
            : [currentExercise],
        });
        
        // 로컬 UI 업데이트
        addOffline({
          date: dateStr,
          exercises: existingRecord 
            ? [...existingRecord.exercises, currentExercise]
            : [currentExercise],
        }, localId);
        
        toast({ 
          title: "로컬에 저장됨", 
          description: "온라인 복귀 시 자동으로 서버에 업로드됩니다." 
        });
      }

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
      
      if (newExercises.length === 0) {
        // 기록 전체 삭제는 지원하지 않으므로 빈 배열로 업데이트
        await update(record.id, []);
      } else {
        await update(record.id, newExercises);
      }
      
      toast({ title: "삭제 완료" });
    } catch (error) {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  // 운동 수정
  const editExercise = (exercise: GymExercise) => {
    setCurrentExercise({ ...exercise });
    setEditingExerciseId(exercise.id);
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
      name: "",
      sets: [{ reps: 10, weight: 20 }],
    });
    setEditingExerciseId(null);
    setShowAddExercise(true);
  };

  // 취소
  const cancelExercise = () => {
    setCurrentExercise(null);
    setShowAddExercise(false);
    setEditingExerciseId(null);
  };

  if (loading || missionsLoading) {
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
          오늘의 미션을 완료하고 포인트를 받으세요
        </p>
      </div>

      {/* 오늘의 미션 (오늘만 표시) */}
      {isToday && (
        <>
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                <span className="font-medium">오늘의 미션</span>
              </div>
              {allCompleted && (
                <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">완료!</span>
                </div>
              )}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-5xl font-bold">{completedCount}/3</p>
                <p className="text-white/80">완료</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {allCompleted && pointsAwarded ? "+100" : "0"}
                </p>
                <p className="text-white/80">포인트</p>
              </div>
            </div>

            <div className="mt-4 h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* 미션 체크리스트 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">미션 체크리스트</h2>
            {missions.map((mission) => (
              <button
                key={mission.id}
                onClick={() => toggleMission(mission)}
                className={cn(
                  "w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all",
                  mission.completed
                    ? "bg-sky-50 border-sky-300 dark:bg-sky-950 dark:border-sky-700"
                    : "bg-card border-border hover:border-sky-300"
                )}
              >
                {mission.completed ? (
                  <CheckCircle2 className="w-8 h-8 text-sky-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "flex-1 text-left text-lg",
                    mission.completed && "text-sky-700 line-through dark:text-sky-400"
                  )}
                >
                  {mission.content}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 헬스 기록 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">헬스 기록</h2>
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

        {/* 운동 추가/수정 폼 */}
        {showAddExercise && currentExercise ? (
          <div className="bg-card rounded-3xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingExerciseId ? "운동 수정" : "운동 추가"}
              </h3>
              <Button variant="ghost" size="icon" onClick={cancelExercise}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* 운동명 */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">운동명</label>
              <Input
                value={currentExercise.name}
                onChange={(e) => setCurrentExercise({ ...currentExercise, name: e.target.value })}
                placeholder="예: 벤치프레스"
                className="mt-1"
              />
            </div>

            {/* 세트 목록 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">세트</label>
                <Button variant="outline" size="sm" onClick={addSet}>
                  <Plus className="w-4 h-4 mr-1" />
                  세트 추가
                </Button>
              </div>

              {currentExercise.sets.map((set, index) => (
                <div key={index} className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
                  <span className="text-sm font-medium w-12">{index + 1}세트</span>
                  
                  {/* 무게 */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateSet(index, "weight", -5)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-14 text-center font-semibold">{set.weight}kg</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateSet(index, "weight", 5)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* 횟수 */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateSet(index, "reps", -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-10 text-center font-semibold">{set.reps}회</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateSet(index, "reps", 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* 삭제 */}
                  {currentExercise.sets.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeSet(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button size="lg" className="w-full" onClick={saveExercise}>
              저장
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
