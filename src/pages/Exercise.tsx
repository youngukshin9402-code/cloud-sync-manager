import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Flame,
  Trophy,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Mission {
  id: string;
  content: string;
  points: number;
  isCompleted: boolean;
}

const defaultMissions: Mission[] = [
  { id: "1", content: "아침 스트레칭 10분", points: 10, isCompleted: false },
  { id: "2", content: "물 8잔 마시기", points: 10, isCompleted: false },
  { id: "3", content: "저녁 산책 30분", points: 10, isCompleted: false },
];

export default function Exercise() {
  const { profile } = useAuth();
  const [missions, setMissions] = useState<Mission[]>(defaultMissions);

  const completedCount = missions.filter((m) => m.isCompleted).length;
  const totalPoints = missions.reduce(
    (sum, m) => sum + (m.isCompleted ? m.points : 0),
    0
  );

  const toggleMission = (id: string) => {
    setMissions((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, isCompleted: !m.isCompleted } : m
      )
    );
  };

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
            <span className="font-semibold">0일 연속</span>
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
            <p className="text-2xl font-bold">+{totalPoints}</p>
            <p className="text-white/80">포인트</p>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="mt-4 h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{
              width: `${(completedCount / missions.length) * 100}%`,
            }}
          />
        </div>
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
                ? "bg-sky-50 border-sky-300"
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
                  ? "text-sky-700 line-through"
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
      {completedCount === missions.length && (
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3" />
          <h3 className="text-2xl font-bold mb-2">오늘 미션 완료!</h3>
          <p className="text-white/90">
            대단해요! {totalPoints} 포인트를 획득했어요.
          </p>
        </div>
      )}

      {/* 주간 요약 버튼 */}
      <Button variant="outline" size="touch" className="w-full">
        이번 주 활동 보기
      </Button>
    </div>
  );
}
