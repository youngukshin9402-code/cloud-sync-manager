import { useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Image as ImageIcon,
  Utensils,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Info,
  Flame,
  Heart,
} from "lucide-react";
import { useFoodLogs } from "@/hooks/useFoodLogs";

export default function Nutrition() {
  const { profile } = useAuth();
  const {
    foodLogs,
    isLoading,
    isAnalyzing,
    healthTags,
    todayPoints,
    uploadAndAnalyzeFood,
    quickLog,
  } = useFoodLogs();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAndAnalyzeFood(file);
      e.target.value = "";
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500/10";
    if (score >= 60) return "bg-amber-500/10";
    return "bg-red-500/10";
  };

  return (
    <div className="space-y-6">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />
      <input
        type="file"
        ref={cameraInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
      />

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
            : `+${todayPoints} 포인트 획득!`}
        </p>
      </div>

      {/* 건강 상태 기반 추천 */}
      {Object.keys(healthTags.recommendations).length > 0 && (
        <div className="bg-card rounded-3xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-semibold">맞춤 식단 추천</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(healthTags.recommendations).map(([tag, rec]) => (
              <div
                key={tag}
                className="flex items-start gap-2 p-3 bg-muted rounded-xl"
              >
                <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 식사 기록 버튼 */}
      <div className="bg-card rounded-3xl border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">식사 기록하기</h2>
        <p className="text-muted-foreground mb-6">
          음식 사진을 찍으면 AI가 분석해서
          <br />
          건강한 피드백을 드려요.
        </p>
        <div className="flex gap-4">
          <Button
            size="lg"
            variant="default"
            className="flex-1 h-14 text-lg bg-primary hover:bg-primary/90"
            onClick={handleCameraClick}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
            카메라
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-14 text-lg"
            onClick={handleGalleryClick}
            disabled={isAnalyzing}
          >
            <ImageIcon className="w-5 h-5" />
            갤러리
          </Button>
        </div>
      </div>

      {/* 오늘의 기록 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">오늘 먹은 것</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : foodLogs.length === 0 ? (
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
                  {log.imageUrl ? (
                    <img
                      src={log.imageUrl}
                      alt={log.name}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                      <Utensils className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{log.name}</span>
                      {log.type === "good" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {log.time}
                    </p>

                    {/* 칼로리 & 영양점수 */}
                    <div className="flex items-center gap-3 mb-2">
                      {log.calories > 0 && (
                        <div className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-medium">
                            {log.calories}kcal
                          </span>
                        </div>
                      )}
                      {log.nutrition_score > 0 && (
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${getScoreBg(log.nutrition_score)}`}
                        >
                          <span
                            className={`text-sm font-bold ${getScoreColor(log.nutrition_score)}`}
                          >
                            {log.nutrition_score}점
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-foreground">{log.feedback}</p>

                    {/* 영양소 정보 */}
                    {log.nutrients && log.nutrients.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {log.nutrients.slice(0, 3).map((nutrient, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground"
                          >
                            {nutrient.name} {nutrient.amount}
                            {nutrient.unit}
                          </span>
                        ))}
                      </div>
                    )}
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
              onClick={() => quickLog(item)}
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
