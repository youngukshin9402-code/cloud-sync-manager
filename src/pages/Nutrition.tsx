import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Image as ImageIcon,
  Utensils,
  Plus,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface FoodLog {
  id: string;
  time: string;
  name: string;
  feedback: string;
  type: "good" | "caution" | "warning";
}

export default function Nutrition() {
  const { profile } = useAuth();
  const [foodLogs] = useState<FoodLog[]>([]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">영양양갱</h1>
        <p className="text-lg text-muted-foreground">
          식사를 기록하고 건강한 피드백을 받으세요
        </p>
      </div>

      {/* 오늘의 기록 요약 */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            <span className="font-medium">오늘의 식사</span>
          </div>
          <span className="text-2xl font-bold">{foodLogs.length}회</span>
        </div>
        <p className="text-white/80">
          {foodLogs.length === 0
            ? "아직 기록이 없어요. 식사를 기록해보세요!"
            : `+${foodLogs.length * 50} 포인트 획득!`}
        </p>
      </div>

      {/* 식사 기록 버튼 */}
      <div className="bg-card rounded-3xl border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">식사 기록하기</h2>
        <p className="text-muted-foreground mb-6">
          음식 사진을 찍으면 AI가 분석해서
          <br />
          건강한 피드백을 드려요.
        </p>
        <div className="flex gap-4">
          <Button size="touch-lg" variant="yanggaeng" className="flex-1">
            <Camera className="w-5 h-5" />
            카메라
          </Button>
          <Button size="touch" variant="outline" className="flex-1">
            <ImageIcon className="w-5 h-5" />
            갤러리
          </Button>
        </div>
      </div>

      {/* 오늘의 기록 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">오늘 먹은 것</h2>
        {foodLogs.length === 0 ? (
          <div className="bg-muted rounded-2xl p-8 text-center">
            <Utensils className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              아직 기록이 없어요.
              <br />
              첫 번째 식사를 기록해보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {foodLogs.map((log) => (
              <div
                key={log.id}
                className="bg-card rounded-2xl border border-border p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                    <Utensils className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{log.name}</span>
                      {log.type === "good" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {log.time}
                    </p>
                    <p className="text-sm text-foreground">{log.feedback}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 빠른 기록 */}
      <div className="bg-card rounded-3xl border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">빠른 기록</h2>
        <p className="text-muted-foreground mb-4">
          자주 먹는 음식을 빠르게 기록하세요.
        </p>
        <div className="flex flex-wrap gap-2">
          {["물 한 잔", "과일", "샐러드", "밥", "국"].map((item) => (
            <button
              key={item}
              className="px-4 py-2 rounded-full bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
