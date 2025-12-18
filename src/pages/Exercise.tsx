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
  Flame,
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
  Dumbbell,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getGymRecords,
  setGymRecords,
  GymRecord,
  GymExercise,
  GymSet,
  getDailyMissions,
  setDailyMissions,
  DailyMission,
  getPoints,
  setPoints,
  getPointHistory,
  setPointHistory,
  generateId,
  getTodayString,
} from "@/lib/localStorage";

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

// 기본 미션 생성
const generateDefaultMissions = (): { id: string; content: string; completed: boolean }[] => {
  const allMissions = [
    "10분 스트레칭 하기",
    "계단 오르기 3층 이상",
    "30분 걷기",
    "스쿼트 20회",
    "플랭크 1분",
    "점프잭 30회",
    "푸쉬업 10회",
    "런지 20회",
    "버피 10회",
    "팔굽혀펴기 15회",
  ];
  const shuffled = allMissions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((content) => ({
    id: generateId(),
    content,
    completed: false,
  }));
};

export default function Exercise() {
  const { toast } = useToast();
  const machineInputRef = useRef<HTMLInputElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [gymRecords, setGymRecordsState] = useState<GymRecord[]>([]);
  const [dailyMissions, setDailyMissionsState] = useState<DailyMission[]>([]);

  // 헬스 기록 상태
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<GymExercise | null>(null);
  const [machineImage, setMachineImage] = useState<string | null>(null);
  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GymRecord | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isToday = isSameDay(selectedDate, new Date());
  const todayStr = getTodayString();

  // 데이터 로드
  useEffect(() => {
    setGymRecordsState(getGymRecords());
    const missions = getDailyMissions();
    
    // 오늘 미션이 없으면 생성
    const todayMission = missions.find((m) => m.date === todayStr);
    if (!todayMission) {
      const newMission: DailyMission = {
        id: generateId(),
        date: todayStr,
        missions: generateDefaultMissions(),
        pointsAwarded: false,
      };
      const updated = [...missions, newMission];
      setDailyMissions(updated);
      setDailyMissionsState(updated);
    } else {
      setDailyMissionsState(missions);
    }
  }, []);

  // 오늘 미션 가져오기
  const todayMission = dailyMissions.find((m) => m.date === todayStr);
  const missions = todayMission?.missions || [];
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
  const toggleMission = (missionId: string) => {
    const updatedMissions = dailyMissions.map((dm) => {
      if (dm.date !== todayStr) return dm;
      
      const updatedInner = dm.missions.map((m) =>
        m.id === missionId ? { ...m, completed: !m.completed } : m
      );
      
      const allDone = updatedInner.every((m) => m.completed);
      let pointsAwarded = dm.pointsAwarded;
      
      // 3개 완료 시 100포인트 지급 (중복 방지)
      if (allDone && !dm.pointsAwarded) {
        const currentPoints = getPoints();
        setPoints(currentPoints + 100);
        
        const history = getPointHistory();
        setPointHistory([
          ...history,
          {
            id: generateId(),
            date: todayStr,
            amount: 100,
            reason: "오늘의 미션 3개 완료",
            type: "earn",
          },
        ]);
        
        pointsAwarded = true;
        toast({
          title: "🎉 축하합니다!",
          description: "미션 3개 완료로 100포인트 획득!",
        });
      }
      
      return { ...dm, missions: updatedInner, pointsAwarded };
    });
    
    setDailyMissions(updatedMissions);
    setDailyMissionsState(updatedMissions);
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
      id: generateId(),
      name,
      sets: [{ reps: 10, weight: 20 }],
      imageUrl: machineImage || undefined,
    });
    setShowMachineSuggestions(false);
    setMachineImage(null);
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
  const saveExercise = () => {
    if (!currentExercise || !currentExercise.name) {
      toast({ title: "운동명을 입력해주세요", variant: "destructive" });
      return;
    }

    let updatedRecords: GymRecord[];
    const existingRecord = gymRecords.find((r) => r.date === dateStr);

    if (existingRecord) {
      updatedRecords = gymRecords.map((r) => {
        if (r.date !== dateStr) return r;
        
        if (editingRecord) {
          // 수정
          return {
            ...r,
            exercises: r.exercises.map((ex) =>
              ex.id === currentExercise.id ? currentExercise : ex
            ),
          };
        } else {
          // 추가
          return { ...r, exercises: [...r.exercises, currentExercise] };
        }
      });
    } else {
      // 새 기록 생성
      updatedRecords = [
        ...gymRecords,
        {
          id: generateId(),
          date: dateStr,
          exercises: [currentExercise],
          createdAt: new Date().toISOString(),
        },
      ];
    }

    setGymRecords(updatedRecords);
    setGymRecordsState(updatedRecords);
    setCurrentExercise(null);
    setShowAddExercise(false);
    setEditingRecord(null);
    toast({ title: "운동 기록 저장 완료!" });
  };

  // 운동 삭제
  const deleteExercise = (exerciseId: string) => {
    const updatedRecords = gymRecords
      .map((r) => {
        if (r.date !== dateStr) return r;
        return { ...r, exercises: r.exercises.filter((ex) => ex.id !== exerciseId) };
      })
      .filter((r) => r.exercises.length > 0);

    setGymRecords(updatedRecords);
    setGymRecordsState(updatedRecords);
    toast({ title: "삭제 완료" });
  };

  // 운동 수정
  const editExercise = (exercise: GymExercise) => {
    setCurrentExercise(exercise);
    setEditingRecord(todayGymRecord || null);
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
      id: generateId(),
      name: "",
      sets: [{ reps: 10, weight: 20 }],
    });
    setShowAddExercise(true);
  };

  return (
    <div className="space-y-6 pb-24">
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
                  {allCompleted ? "+100" : "0"}
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
                onClick={() => toggleMission(mission.id)}
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

        {/* 운동 추가 버튼 */}
        {!showAddExercise && (
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
            <Input
              placeholder="직접 입력"
              className="mt-3"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value) {
                  selectMachineName(e.currentTarget.value);
                }
              }}
            />
          </DialogContent>
        </Dialog>

        {/* 운동 추가/수정 폼 */}
        {showAddExercise && currentExercise && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">운동 추가</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAddExercise(false);
                  setCurrentExercise(null);
                  setEditingRecord(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* 운동명 */}
            <div>
              <label className="text-sm font-medium mb-2 block">운동명</label>
              <Input
                value={currentExercise.name}
                onChange={(e) =>
                  setCurrentExercise({ ...currentExercise, name: e.target.value })
                }
                placeholder="예: 벤치프레스"
              />
            </div>

            {/* 세트 목록 */}
            <div className="space-y-3">
              <label className="text-sm font-medium">세트</label>
              {currentExercise.sets.map((set, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-muted rounded-xl p-3"
                >
                  <span className="text-sm font-medium w-12">#{index + 1}</span>

                  {/* 횟수 (버튼으로만) */}
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">횟수</p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => updateSet(index, "reps", -1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center text-lg font-bold">
                        {set.reps}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => updateSet(index, "reps", 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* 중량 (버튼으로만) */}
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">중량(kg)</p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => updateSet(index, "weight", -2.5)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-14 text-center text-lg font-bold">
                        {set.weight}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => updateSet(index, "weight", 2.5)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {currentExercise.sets.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive"
                      onClick={() => removeSet(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button variant="outline" className="w-full" onClick={addSet}>
                + 세트 추가
              </Button>
            </div>

            <Button size="lg" className="w-full h-14" onClick={saveExercise}>
              저장하기
            </Button>
          </div>
        )}

        {/* 오늘 기록된 운동 */}
        {todayGymRecord && todayGymRecord.exercises.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">기록된 운동</h3>
            {todayGymRecord.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="bg-card rounded-2xl border border-border p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {exercise.imageUrl ? (
                      <img
                        src={exercise.imageUrl}
                        alt={exercise.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Dumbbell className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-lg">{exercise.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {exercise.sets.length}세트
                      </p>
                    </div>
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
                      {set.weight}kg × {set.reps}회
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {(!todayGymRecord || todayGymRecord.exercises.length === 0) && !showAddExercise && (
          <div className="bg-muted rounded-2xl p-8 text-center">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              이 날의 운동 기록이 없어요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
