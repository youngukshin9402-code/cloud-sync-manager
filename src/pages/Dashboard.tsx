import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyData } from "@/contexts/DailyDataContext";
import { useNutritionSettings } from "@/hooks/useNutritionSettings";
import { useTodayMealRecords } from "@/hooks/useMealRecordsQuery";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Flame,
  Droplets,
  Dumbbell,
  ChevronRight,
  Target,
  TrendingUp,
  CheckCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { getTodayString } from "@/lib/localStorage";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// 10가지 생활습관 Pool
const HABIT_POOL = [
  "물 6잔(1.2L) 마시기",
  "10분 이상 걷기",
  "아침 식사 기록하기",
  "계단으로 3층 이상 오르기",
  "30분 이상 걷기",
  "스트레칭 10분 하기",
  "과일/채소 2회 이상 섭취하기",
  "저녁 8시 이후 음식 안 먹기",
  "점심 식사 후 10분 산책하기",
  "잠자기 전 스마트폰 1시간 안 보기",
];

// 오늘 날짜 기반으로 3개 랜덤 선택
function selectRandomHabits(seed: string, count: number = 3): string[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const shuffled = [...HABIT_POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = Math.abs((hash * 16807) % 2147483647);
    const j = hash % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const {
    todayWater,
    waterGoal,
    todayMissions,
    toggleMission,
    reshuffleMissions,
    refreshWater,
    refreshCalories,
    refreshPoints,
  } = useDailyData();

  // 단일 소스: nutrition_settings에서 목표, meal_records에서 섭취량
  const { getGoals, hasSettings } = useNutritionSettings();
  const { totals, refetch: refetchMeals } = useTodayMealRecords();

  const goals = getGoals();
  const todayCalories = totals.totalCalories;
  const calorieGoal = goals.calorieGoal;

  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiQuestion, setAIQuestion] = useState("");

  const today = getTodayString();

  // Refresh data on mount and focus
  useEffect(() => {
    refreshWater();
    refreshCalories();
    refreshPoints();
    refetchMeals();
  }, [refreshWater, refreshCalories, refreshPoints, refetchMeals]);

  useEffect(() => {
    const handleFocus = () => {
      refreshWater();
      refreshCalories();
      refreshPoints();
      refetchMeals();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshWater, refreshCalories, refreshPoints, refetchMeals]);

  // Initialize missions if not exists
  useEffect(() => {
    if (!todayMissions) {
      const todayHabits = selectRandomHabits(today);
      reshuffleMissions(todayHabits);
    }
  }, [today, todayMissions, reshuffleMissions]);

  const handleMissionToggle = async (missionId: string) => {
    const allCompletedBefore = todayMissions?.missions.every(m => m.completed) || false;
    const willComplete = todayMissions?.missions.filter(m => m.id !== missionId).every(m => m.completed) 
      && !todayMissions?.missions.find(m => m.id === missionId)?.completed;
    
    const wasAwarded = await toggleMission(missionId);
    
    if (willComplete && wasAwarded && !allCompletedBefore) {
      toast({ title: "🎉 축하합니다!", description: "모든 할 일 완료로 100포인트 획득!" });
      refreshPoints();
    }
  };

  const handleReshuffle = () => {
    const newSeed = `${today}_${Date.now()}`;
    const newHabits = selectRandomHabits(newSeed);
    reshuffleMissions(newHabits);
    toast({ title: "새로운 할 일을 추천했어요!", description: "오늘 지킬 3가지가 변경되었습니다." });
  };

  const handleAISubmit = () => {
    if (!aiQuestion.trim()) {
      toast({ title: "질문을 입력해주세요", variant: "destructive" });
      return;
    }
    
    toast({ 
      title: "AI 응답", 
      description: "아직 AI 기능이 연동되지 않았습니다. 추후 업데이트 예정입니다!" 
    });
    setAIQuestion("");
    setShowAIDialog(false);
  };

  if (!profile) return null;

  const completedMissions = todayMissions?.missions.filter(m => m.completed).length || 0;
  const totalMissions = todayMissions?.missions.length || 3;

  const isGuardian = profile?.user_type === "guardian";

  const isGuardian = profile?.user_type === "guardian";

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            안녕하세요, {profile?.nickname || "회원"}님!
          </h1>
          <p className="text-muted-foreground">오늘도 건강한 하루 보내세요 🌟</p>
        </div>
      </div>

      {/* Today's Summary KPIs */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          오늘 요약
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Calories */}
          <Link to="/nutrition" className="block">
            <div className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-health-orange/10 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-health-orange" />
                </div>
                <span className="text-sm text-muted-foreground">섭취 칼로리</span>
              </div>
              <p className="text-xl font-bold">{todayCalories.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">목표 {calorieGoal.toLocaleString()} kcal</p>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-health-orange transition-all"
                  style={{ width: `${Math.min((todayCalories / calorieGoal) * 100, 100)}%` }}
                />
              </div>
            </div>
          </Link>

          {/* Water */}
          <Link to="/water" className="block">
            <div className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-health-blue/10 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-health-blue" />
                </div>
                <span className="text-sm text-muted-foreground">물 섭취</span>
              </div>
              <p className="text-xl font-bold">{todayWater.toLocaleString()}ml</p>
              <p className="text-xs text-muted-foreground">목표 {waterGoal.toLocaleString()}ml</p>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-health-blue transition-all"
                  style={{ width: `${Math.min((todayWater / waterGoal) * 100, 100)}%` }}
                />
              </div>
            </div>
          </Link>

          {/* 오늘 할 일 카드 - 클릭해도 이동 안함, 홈 체크리스트만 반영 */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-health-green/10 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-health-green" />
              </div>
              <span className="text-sm text-muted-foreground">오늘 할 일</span>
            </div>
            <p className="text-xl font-bold">{completedMissions}/{totalMissions}</p>
            <p className="text-xs text-muted-foreground">완료</p>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-health-green transition-all"
                style={{ width: `${(completedMissions / totalMissions) * 100}%` }}
              />
            </div>
          </div>

          {/* 걸음수 카드 - 클릭 시 운동화면 이동 */}
          <Link to="/exercise" className="block">
            <div className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-health-green/10 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-health-green" />
                </div>
                <span className="text-sm text-muted-foreground">걸음수</span>
              </div>
              <p className="text-xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">연동 준비중</p>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-health-green transition-all" style={{ width: '0%' }} />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Today's Missions Checklist */}
      <div className="bg-card rounded-3xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            오늘 할 일
          </h2>
          {/* 포인트 적립 완료 배지는 숨김 - 이미 받은 경우 혼란 방지 */}
        </div>

        <div className="space-y-3">
          {todayMissions?.missions.map(mission => (
            <div
              key={mission.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-colors",
                mission.completed ? 'bg-health-green/5' : 'bg-muted/50'
              )}
            >
              <Checkbox
                checked={mission.completed}
                onCheckedChange={() => handleMissionToggle(mission.id)}
                className="w-6 h-6"
              />
              <span className={cn("flex-1", mission.completed && 'line-through text-muted-foreground')}>
                {mission.content}
              </span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 min-h-[40px] whitespace-normal text-sm"
            onClick={handleReshuffle}
          >
            <RefreshCw className="w-4 h-4 mr-2 shrink-0" />
            <span>다른 제안 받기</span>
          </Button>
        </div>

        {completedMissions === totalMissions && !todayMissions?.pointsAwarded && (
          <p className="text-center text-sm text-muted-foreground">
            모든 할 일을 완료하면 100포인트가 적립됩니다!
          </p>
        )}
      </div>

      {/* AI Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI에게 물어보기
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              오늘의 할 일에 대해 궁금한 점이나 대안을 요청해보세요.
            </p>
            <Textarea
              placeholder="예: 걷기 대신 실내에서 할 수 있는 운동을 추천해줘"
              value={aiQuestion}
              onChange={(e) => setAIQuestion(e.target.value)}
              rows={3}
            />
            <Button className="w-full" onClick={handleAISubmit}>
              질문하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guardian Family Section */}
      {isGuardian && (
        <Link to="/mypage/guardian" className="block">
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">연결된 가족 현황</p>
                <p className="text-sm text-muted-foreground">건강 요약 보기</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Link>
      )}
    </div>
  );
}
