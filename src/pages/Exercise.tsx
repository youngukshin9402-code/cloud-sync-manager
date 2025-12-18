import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Circle,
  Flame,
  Trophy,
  Calendar,
  Loader2,
  Plus,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useExercise } from "@/hooks/useExercise";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Exercise() {
  const { profile } = useAuth();
  const {
    missions,
    isLoading,
    isGenerating,
    weeklyStats,
    streakDays,
    todayPoints,
    toggleMission,
    logExercise,
  } = useExercise();

  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [exerciseInput, setExerciseInput] = useState("");
  const [showExerciseInput, setShowExerciseInput] = useState(false);

  const completedCount = missions.filter((m) => m.isCompleted).length;
  const totalPossiblePoints = missions.reduce((sum, m) => sum + m.points, 0);

  const handleLogExercise = async () => {
    if (exerciseInput.trim()) {
      await logExercise(exerciseInput);
      setExerciseInput("");
      setShowExerciseInput(false);
    }
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return days[date.getDay()];
  };

  if (isLoading || isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {isGenerating ? "AI가 맞춤 미션을 만들고 있어요..." : "미션을 불러오는 중..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">운동양갱</h1>
        <p className="text-lg text-muted-foreground">
          오늘의 미션을 완료하고 포인트를 받으세요
        </p>
      </div>

      {/* 오늘의 요약 */}
      <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">오늘의 미션</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-300" />
            <span className="font-semibold">{streakDays}일 연속</span>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-5xl font-bold">
              {completedCount}/{missions.length}
            </p>
            <p className="text-white/80">완료</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">+{todayPoints}</p>
            <p className="text-white/80">포인트</p>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="mt-4 h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{
              width: `${missions.length > 0 ? (completedCount / missions.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* AI 추천 배지 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>AI가 건강 상태에 맞춰 추천한 미션이에요</span>
      </div>

      {/* 미션 리스트 */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">미션 체크리스트</h2>
        {missions.map((mission) => (
          <button
            key={mission.id}
            onClick={() => toggleMission(mission.id)}
            className={cn(
              "w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all",
              mission.isCompleted
                ? "bg-sky-50 border-sky-300 dark:bg-sky-950 dark:border-sky-700"
                : "bg-card border-border hover:border-sky-300"
            )}
          >
            {mission.isCompleted ? (
              <CheckCircle2 className="w-8 h-8 text-sky-600 flex-shrink-0" />
            ) : (
              <Circle className="w-8 h-8 text-muted-foreground flex-shrink-0" />
            )}
            <span
              className={cn(
                "flex-1 text-left text-lg",
                mission.isCompleted
                  ? "text-sky-700 line-through dark:text-sky-400"
                  : "text-foreground"
              )}
            >
              {mission.content}
            </span>
            <span
              className={cn(
                "text-lg font-semibold",
                mission.isCompleted ? "text-sky-600" : "text-muted-foreground"
              )}
            >
              +{mission.points}점
            </span>
          </button>
        ))}
      </div>

      {/* 완료 축하 */}
      {completedCount === missions.length && missions.length > 0 && (
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3" />
          <h3 className="text-2xl font-bold mb-2">오늘 미션 완료!</h3>
          <p className="text-white/90">
            대단해요! {todayPoints} 포인트를 획득했어요.
          </p>
        </div>
      )}

      {/* 헬스 기록 */}
      <div className="bg-card rounded-3xl border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">운동 기록하기</h2>
        <p className="text-muted-foreground mb-4">
          오늘 한 운동을 자유롭게 기록하세요. (+20점)
        </p>

        {showExerciseInput ? (
          <div className="flex gap-2">
            <Input
              placeholder="예: 공원에서 30분 산책했어요"
              value={exerciseInput}
              onChange={(e) => setExerciseInput(e.target.value)}
              className="flex-1 h-12 text-base"
              onKeyDown={(e) => e.key === "Enter" && handleLogExercise()}
            />
            <Button
              size="lg"
              onClick={handleLogExercise}
              disabled={!exerciseInput.trim()}
              className="h-12"
            >
              기록
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => {
                setShowExerciseInput(false);
                setExerciseInput("");
              }}
              className="h-12 px-3"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14"
            onClick={() => setShowExerciseInput(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            운동 기록 추가
          </Button>
        )}
      </div>

      {/* 주간 요약 버튼 */}
      <Dialog open={showWeeklyReport} onOpenChange={setShowWeeklyReport}>
        <DialogTrigger asChild>
          <Button variant="outline" size="lg" className="w-full h-14">
            <TrendingUp className="w-5 h-5 mr-2" />
            이번 주 활동 보기
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">주간 운동 리포트</DialogTitle>
          </DialogHeader>

          {weeklyStats && (
            <div className="space-y-6 mt-4">
              {/* 주간 요약 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-sky-50 dark:bg-sky-950 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-bold text-sky-600">
                    {weeklyStats.completedMissions}
                  </p>
                  <p className="text-sm text-muted-foreground">완료 미션</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-bold text-amber-600">
                    {weeklyStats.totalPoints}
                  </p>
                  <p className="text-sm text-muted-foreground">획득 포인트</p>
                </div>
              </div>

              {/* 연속 일수 */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Flame className="w-6 h-6" />
                  <span className="text-3xl font-bold">{weeklyStats.streakDays}일</span>
                </div>
                <p className="text-white/80">연속 운동 중!</p>
              </div>

              {/* 일별 차트 */}
              <div>
                <h3 className="font-semibold mb-3">일별 현황</h3>
                <div className="flex justify-between gap-1">
                  {weeklyStats.dailyBreakdown.map((day) => (
                    <div key={day.date} className="flex-1 text-center">
                      <div className="h-20 bg-muted rounded-lg flex flex-col justify-end overflow-hidden">
                        <div
                          className="bg-sky-500 rounded-t-lg transition-all"
                          style={{
                            height: `${day.total > 0 ? (day.completed / day.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs mt-1 text-muted-foreground">
                        {getDayName(day.date)}
                      </p>
                      <p className="text-xs font-medium">{day.completed}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 응원 메시지 */}
              <div className="text-center p-4 bg-muted rounded-2xl">
                <p className="text-lg">
                  {weeklyStats.completedMissions >= 15
                    ? "🏆 이번 주도 완벽해요!"
                    : weeklyStats.completedMissions >= 10
                      ? "💪 잘하고 있어요! 조금만 더 힘내요!"
                      : "🌱 시작이 반이에요! 화이팅!"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
